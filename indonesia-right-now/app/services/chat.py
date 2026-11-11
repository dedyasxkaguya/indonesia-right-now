from __future__ import annotations

import json
import re
import time
from typing import Any

import structlog
from fastapi import Request

from app.config import Settings
from app.errors import AppError
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai import (
    _GROQ_TOOL_NAME,
    AIConfigurationError,
    _call_model,
    _call_model_with_tools,
)

logger = structlog.get_logger("app.services.chat")

MAX_QUESTION_LENGTH = 2000
MAX_CONTEXT_LENGTH = 10000
MAX_CONTEXT_PROMPT_LENGTH = 3000
MAX_CONTEXT_ROWS = 10
OUT_OF_SCOPE_MESSAGE = "Maaf, saya hanya dapat menjawab pertanyaan seputar data pada halaman ini."
SYSTEM_ERROR_MESSAGE = "Terjadi kesalahan sistem, silakan hubungi admin."

IGS_SYSTEM_PROMPT = """Anda adalah asisten data IGS. Jawab singkat dalam Bahasa Indonesia,
profesional, tanpa emoji, hanya berdasarkan data atau hasil tool. Jangan mengarang
angka; pertahankan format angka. Untuk statistik atau data di luar sampel, wajib
gunakan query_dataset_aggregate. Tolak pertanyaan di luar data IGS dengan tepat:
"Maaf, saya hanya dapat menjawab pertanyaan seputar data pada halaman ini."

<context_data>
{context_data}
</context_data>

<question>
{question}
</question>

Jika informasi tidak tersedia, katakan demikian."""

_SANITIZE_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _sanitize_text(value: str, field_name: str, max_length: int) -> str:
    if len(value) > max_length:
        raise AppError(
            "VALIDATION_ERROR",
            f"{field_name} melebihi batas maksimum {max_length} karakter.",
            status_code=422,
            details={"field": field_name, "max_length": max_length},
            exit_code=1,
        )
    sanitized = _SANITIZE_RE.sub("", value)
    if len(sanitized.strip()) == 0:
        raise AppError(
            "VALIDATION_ERROR",
            f"{field_name} tidak boleh kosong atau hanya berisi karakter kontrol.",
            status_code=422,
            details={"field": field_name},
            exit_code=1,
        )
    return sanitized.strip()


def _build_messages(
    context_data: str,
    question: str,
    model: str,
) -> list[dict[str, str]]:
    system_content = IGS_SYSTEM_PROMPT.format(
        context_data=context_data,
        question=question,
    )
    return [
        {"role": "system", "content": system_content},
    ]


async def chat(
    *,
    chat_request: ChatRequest,
    settings: Settings,
    request: Request,
) -> ChatResponse:
    started = time.perf_counter()
    request_id = getattr(request.state, "request_id", "unknown")

    if not settings.ai_enabled:
        raise AppError(
            "CHAT_AI_DISABLED",
            "AI chatbot sedang tidak aktif.",
            status_code=503,
            details={},
            exit_code=1,
        )

    if not settings.groq_api_key.strip():
        logger.error("chat.missing_api_key", request_id=request_id)
        raise AppError(
            "CHAT_AI_CONFIG",
            SYSTEM_ERROR_MESSAGE,
            status_code=500,
            details={},
            exit_code=1,
        )

    question = _sanitize_text(
        chat_request.question,
        "question",
        MAX_QUESTION_LENGTH,
    )
    context_data = _sanitize_text(
        chat_request.context_data,
        "context_data",
        MAX_CONTEXT_LENGTH,
    )

    model = settings.groq_model
    context_rows = context_data.splitlines()[:MAX_CONTEXT_ROWS]
    prompt_context = "\n".join(context_rows)[:MAX_CONTEXT_PROMPT_LENGTH]

    messages = _build_messages(prompt_context, question, model)

    logger.info(
        "chat.request",
        request_id=request_id,
        mode=chat_request.mode,
        page_context=chat_request.page_context,
        dataset_name=chat_request.dataset_name,
        question_length=len(question),
        context_length=len(context_data),
    )

    tool_execution_id: str | None = None

    try:
        response_text, tokens, tool_call_id, tool_arguments = (
            await _call_model_with_tools(
                settings=settings,
                model=model,
                messages=messages,
                max_tokens=400,
                temperature=0.1,
            )
        )

        if tool_call_id is not None and tool_arguments is not None:
            tool_execution_id = tool_call_id
            aggregate_result = await query_dataset_aggregate(
                metric=str(tool_arguments.get("metric", "mean")),
                group_by=str(tool_arguments.get("group_by", "provinsi")),
                filter=tool_arguments.get("filter"),
                dataset=context_data,
            )
            # Groq requires the assistant tool-call turn, then one tool
            # message per call, before the follow-up completion.
            messages.append(
                {
                    "role": "assistant",
                    "content": response_text or None,
                    "tool_calls": [
                        {
                            "id": tool_call_id,
                            "type": "function",
                            "function": {
                                "name": _GROQ_TOOL_NAME,
                                "arguments": json.dumps(
                                    tool_arguments, ensure_ascii=False
                                ),
                            },
                        }
                    ],
                }
            )
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": json.dumps(aggregate_result, ensure_ascii=False),
                }
            )
            response_text, tokens = await _call_model(
                settings=settings,
                model=model,
                messages=messages,
                max_tokens=400,
                temperature=0.1,
            )
            logger.info(
                "chat.tool_executed",
                request_id=request_id,
                tool_execution_id=tool_execution_id,
                metric=tool_arguments.get("metric"),
                tokens=tokens,
            )

        answer = _clean_answer(response_text)
        scope_locked = _detect_out_of_scope(answer)
        duration_ms = round((time.perf_counter() - started) * 1000)

        logger.info(
            "chat.success",
            request_id=request_id,
            model=model,
            tokens=tokens,
            duration_ms=duration_ms,
            scope_locked=scope_locked,
            tool_execution_id=tool_execution_id,
        )
        return ChatResponse(
            answer=answer,
            model=model,
            scope_locked=scope_locked,
            duration_ms=duration_ms,
            tool_execution_id=tool_execution_id,
        )
    except AIConfigurationError as exc:
        logger.error(
            "chat.config_error",
            request_id=request_id,
            error_type=type(exc).__name__,
            model=model,
        )
        raise AppError(
            "CHAT_AI_CONFIG",
            SYSTEM_ERROR_MESSAGE,
            status_code=500,
            details={},
            exit_code=1,
        ) from exc
    except Exception as exc:
        logger.error(
            "chat.provider_error",
            request_id=request_id,
            error_type=type(exc).__name__,
            model=model,
            error_message=str(exc)[:500],
        )
        raise AppError(
            "CHAT_AI_FAILED",
            SYSTEM_ERROR_MESSAGE,
            status_code=502,
            details={},
            exit_code=1,
        ) from exc


def _clean_answer(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:id|indonesian|json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _detect_out_of_scope(answer: str) -> bool:
    lowered = answer.casefold()
    return OUT_OF_SCOPE_MESSAGE.casefold() in lowered


def _parse_number(raw: str) -> float | None:
    """Parse a numeric cell that may use Indonesian separators.

    ``3.200`` means three thousand two hundred, while ``3,5`` means 3.5.
    """
    text = raw.strip().replace(" ", " ").replace(" ", "")
    text = re.sub(r"^(rp|idr)", "", text, flags=re.IGNORECASE)
    text = text.rstrip("%")
    if not text:
        return None
    negative = text.startswith("-")
    if text[0] in "+-":
        text = text[1:]
    if "." in text and "," in text:
        # Whichever separator comes last is the decimal separator.
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "." in text:
        if re.fullmatch(r"\d{1,3}(\.\d{3})+", text):
            text = text.replace(".", "")
    elif "," in text:
        if re.fullmatch(r"\d{1,3}(,\d{3})+", text):
            text = text.replace(",", "")
        else:
            text = text.replace(",", ".")
    try:
        value = float(text)
    except ValueError:
        return None
    return -value if negative else value


def _parse_dataset_rows(dataset: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in dataset.splitlines():
        if "|" not in line:
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        cells = [cell for cell in cells if cell]
        if len(cells) < 2:
            continue
        if all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            continue
        rows.append(cells)
    return rows


async def query_dataset_aggregate(
    *,
    metric: str,
    group_by: str,
    filter: dict | None,
    dataset: str,
) -> dict[str, Any]:
    """Compute mean, median, or sum over the dataset shown to the user.

    The dataset is the Markdown table the frontend sampled from the current
    page. The value column is detected per row as the last parsable number,
    and an optional ``filter`` matches cells case-insensitively.
    """
    rows = _parse_dataset_rows(dataset)
    if not rows:
        return {"error": "No data found in dataset", "result": None}

    active_filter = {
        str(column).casefold(): str(value).casefold()
        for column, value in (filter or {}).items()
    }

    numeric_rows: list[tuple[str, float]] = []
    for cells in rows:
        if active_filter and not any(
            wanted in (cell.casefold() for cell in cells)
            for wanted in active_filter.values()
        ):
            continue
        value = None
        for cell in reversed(cells[1:]):
            value = _parse_number(cell)
            if value is not None:
                break
        if value is None:
            continue
        numeric_rows.append((cells[0], value))

    if not numeric_rows:
        return {"error": "No valid numeric data found", "result": None}

    values = [value for _, value in numeric_rows]
    normalized_metric = metric.strip().casefold()
    if normalized_metric == "mean":
        result = sum(values) / len(values)
    elif normalized_metric == "sum":
        result = sum(values)
    elif normalized_metric == "median":
        ordered = sorted(values)
        middle = len(ordered) // 2
        if len(ordered) % 2:
            result = ordered[middle]
        else:
            result = (ordered[middle - 1] + ordered[middle]) / 2
    else:
        return {"error": f"Unsupported metric: {metric}", "result": None}

    return {
        "error": None,
        "result": {
            "metric": normalized_metric,
            "group_by": group_by,
            "value": f"{result:.2f}",
            "total_rows": len(numeric_rows),
        },
    }
