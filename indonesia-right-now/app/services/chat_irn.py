"""Presenter IRN: the news-aware chatbot service.

Kept fully separate from ``app.services.chat`` (the IGS dataset assistant) so the
two personalities, tools, and schemas never share state.
"""

from __future__ import annotations

import json
import re
import time
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import structlog
from fastapi import Request

from app.config import Settings
from app.errors import AppError
from app.schemas.chat_irn import ChatIRNRequest, ChatIRNResponse
from app.services.ai import AIConfigurationError, _call_agent_model, _call_model
from app.services.irn_tools import (
    DIVERSITY_TOOL_NAME,
    IRN_TOOLS,
    MAX_TOOL_CALLS_PER_MESSAGE,
    SEARCH_TOOL_NAME,
    execute_tool_call,
    tool_message_content,
)

logger = structlog.get_logger("app.services.chat_irn")

MAX_QUESTION_LENGTH = 2000
MAX_TOOL_ROUNDS = 2
MAX_ANSWER_TOKENS = 400
MAX_VISIBLE_ARTICLES = 5

OUT_OF_SCOPE_MESSAGE = (
    "Maaf, saya hanya dapat membantu Anda memahami berita yang sedang tampil "
    "di halaman ini."
)
SYSTEM_ERROR_MESSAGE = "Terjadi kesalahan sistem, silakan hubungi admin."

# Words that ask for a truth verdict. These never reach the model: the answer is
# built deterministically from coverage data so no verdict can be invented.
_TRUTH_INTENT_RE = re.compile(
    r"\b(benar|bener|kebenaran|hoax|hoaks|palsu|bohong|akurat|kredibel|terpercaya)\b",
    re.IGNORECASE,
)

IRN_SYSTEM_PROMPT = """Anda Presenter IRN. Bantu memahami berita yang tampil dengan nada
hangat, profesional, jurnalistik; gunakan "Anda", Bahasa Indonesia, tanpa emoji.

Jawab hanya berdasarkan artikel atau hasil tool. Di luar topik, jawab tepat:
"Maaf, saya hanya dapat membantu Anda memahami berita yang sedang tampil di halaman ini."
Jangan menyatakan berita benar/hoaks/akurat, menilai kredibilitas, mengubah atribusi
menjadi fakta, atau menambahkan hal yang tidak didukung. Anda boleh menyebut liputan
dan jumlah sumber. Gunakan tool hanya untuk data lain yang diperlukan, maksimal
2 panggilan per pesan. Jawab maksimal 3-4 kalimat.

<halaman>{page_context}</halaman>

<visible_articles>
{visible_articles}
</visible_articles>
Jangan mengarang judul, penerbit, angka, atau tautan."""

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
    if not sanitized.strip():
        raise AppError(
            "VALIDATION_ERROR",
            f"{field_name} tidak boleh kosong atau hanya berisi karakter kontrol.",
            status_code=422,
            details={"field": field_name},
            exit_code=1,
        )
    return sanitized.strip()


def _article_block(articles: list[Any]) -> str:
    if not articles:
        return "(tidak ada artikel yang tampil di halaman ini)"
    lines: list[str] = []
    for index, article in enumerate(articles[:MAX_VISIBLE_ARTICLES], start=1):
        lines.append(
            json.dumps(
                {
                    "index": index,
                    "title": article.title,
                    "publisher": article.publisher,
                    "category": article.category,
                    "summary": article.summary,
                    "published_at": article.published_at,
                    "url": article.url,
                },
                ensure_ascii=False,
            )
        )
    return "\n".join(lines)


def _build_messages(chat_request: ChatIRNRequest, question: str) -> list[dict[str, Any]]:
    system_content = IRN_SYSTEM_PROMPT.format(
        page_context=chat_request.page_context,
        visible_articles=_article_block(chat_request.visible_articles),
    )
    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": question},
    ]


def _clean_answer(raw: str) -> str:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:id|indonesian|json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _is_truth_question(question: str) -> bool:
    return bool(_TRUTH_INTENT_RE.search(question))


def _topic_from_articles(articles: list[Any]) -> str:
    for article in articles:
        title = (article.title or "").strip()
        if title:
            return title[:300]
    return ""


def _merge_publishers(articles: list[Any], diversity: dict[str, Any]) -> list[str]:
    names: dict[str, str] = {}
    for name in diversity.get("unique_publishers") or []:
        if isinstance(name, str) and name.strip():
            names.setdefault(name.strip().casefold(), name.strip())
    for article in articles:
        if article.publisher and article.publisher.strip():
            names.setdefault(article.publisher.strip().casefold(), article.publisher.strip())
    return sorted(names.values(), key=str.casefold)


async def _truth_answer(
    articles: list[Any], request_id: str
) -> tuple[str, list[str]]:
    """Build the guardrail answer from coverage data, never from the model."""
    tool_ids: list[str] = []
    diversity: dict[str, Any] = {"unique_publishers": []}
    topic = _topic_from_articles(articles)
    if topic:
        tool_id = f"irn_diversity_{uuid4().hex[:12]}"
        started = time.perf_counter()
        result = await execute_tool_call(
            {"name": DIVERSITY_TOOL_NAME, "arguments": {"topic": topic}}
        )
        tool_ids.append(tool_id)
        logger.info(
            "irn.tool_call",
            request_id=request_id,
            tool=DIVERSITY_TOOL_NAME,
            tool_execution_id=tool_id,
            timestamp=datetime.now(UTC).isoformat(),
            duration_ms=round((time.perf_counter() - started) * 1000),
            publisher_count=(result or {}).get("publisher_count"),
        )
        if isinstance(result, dict):
            diversity = result

    publishers = _merge_publishers(articles, diversity)
    closing = "Silakan cek sumber aslinya untuk informasi lebih lanjut."
    if not publishers:
        message = f"Saya tidak dapat memverifikasi kebenaran berita ini. {closing}"
        return message, tool_ids
    names = ", ".join(publishers[:8])
    message = (
        "Saya tidak dapat memverifikasi kebenaran berita, namun berita ini "
        f"diliput oleh {len(publishers)} sumber: {names}. {closing}"
    )
    return message, tool_ids


async def chat_irn(
    *,
    chat_request: ChatIRNRequest,
    settings: Settings,
    request: Request,
) -> ChatIRNResponse:
    started = time.perf_counter()
    request_id = getattr(request.state, "request_id", "unknown")

    if not settings.ai_enabled:
        raise AppError(
            "CHAT_IRN_AI_DISABLED",
            "AI chatbot IRN sedang tidak aktif.",
            status_code=503,
            details={},
            exit_code=1,
        )

    if not settings.groq_api_key.strip():
        logger.error("chat_irn.missing_api_key", request_id=request_id)
        raise AppError(
            "CHAT_IRN_AI_CONFIG",
            SYSTEM_ERROR_MESSAGE,
            status_code=500,
            details={},
            exit_code=1,
        )

    question = _sanitize_text(chat_request.question, "question", MAX_QUESTION_LENGTH)
    model = settings.groq_model
    articles = list(chat_request.visible_articles[:MAX_VISIBLE_ARTICLES])

    logger.info(
        "chat_irn.request",
        request_id=request_id,
        mode=chat_request.mode,
        page_context=chat_request.page_context,
        visible_articles=len(articles),
        question_length=len(question),
    )

    try:
        if _is_truth_question(question):
            answer, tool_ids = await _truth_answer(articles, request_id)
            scope_locked = False
            tokens = 0
            logger.info(
                "chat_irn.truth_guardrail",
                request_id=request_id,
                tool_execution_ids=tool_ids,
            )
        else:
            answer, tokens, tool_ids = await _run_agent(
                chat_request=chat_request,
                question=question,
                model=model,
                settings=settings,
                request_id=request_id,
            )
            scope_locked = OUT_OF_SCOPE_MESSAGE.casefold() in answer.casefold()

        duration_ms = round((time.perf_counter() - started) * 1000)
        logger.info(
            "chat_irn.success",
            request_id=request_id,
            model=model,
            tokens=tokens,
            duration_ms=duration_ms,
            scope_locked=scope_locked,
            tool_execution_ids=tool_ids,
        )
        return ChatIRNResponse(
            answer=answer,
            model=model,
            scope_locked=scope_locked,
            duration_ms=duration_ms,
            tool_execution_ids=tool_ids,
        )
    except AppError:
        raise
    except AIConfigurationError as exc:
        logger.error(
            "chat_irn.config_error",
            request_id=request_id,
            error_type=type(exc).__name__,
            model=model,
        )
        raise AppError(
            "CHAT_IRN_AI_CONFIG",
            SYSTEM_ERROR_MESSAGE,
            status_code=500,
            details={},
            exit_code=1,
        ) from exc
    except Exception as exc:
        logger.error(
            "chat_irn.provider_error",
            request_id=request_id,
            error_type=type(exc).__name__,
            model=model,
            error_message=str(exc)[:500],
        )
        raise AppError(
            "CHAT_IRN_AI_FAILED",
            SYSTEM_ERROR_MESSAGE,
            status_code=502,
            details={},
            exit_code=1,
        ) from exc


async def _run_agent(
    *,
    chat_request: ChatIRNRequest,
    question: str,
    model: str,
    settings: Settings,
    request_id: str,
) -> tuple[str, int, list[str]]:
    """Run the model with tools, enforcing a hard tool-call budget."""
    messages = _build_messages(chat_request, question)
    tool_ids: list[str] = []
    tokens = 0
    content = ""

    for round_index in range(MAX_TOOL_ROUNDS + 1):
        final_round = round_index == MAX_TOOL_ROUNDS
        if final_round:
            content, tokens = await _call_model(
                settings=settings,
                model=model,
                messages=messages,
                max_tokens=MAX_ANSWER_TOKENS,
                temperature=0.1,
            )
            break

        content, tokens, calls = await _call_agent_model(
            settings=settings,
            model=model,
            messages=messages,
            max_tokens=MAX_ANSWER_TOKENS,
            tools=IRN_TOOLS,
            temperature=0.1,
        )
        if not calls:
            break

        messages.append(
            {
                "role": "assistant",
                "content": content or None,
                "tool_calls": [
                    {
                        "id": call["id"],
                        "type": "function",
                        "function": {
                            "name": call["name"],
                            "arguments": call.get("arguments") or "{}",
                        },
                    }
                    for call in calls
                ],
            }
        )

        # Every requested call must get a tool message or Groq rejects the turn,
        # so over-budget calls receive an explicit refusal instead of a result.
        for call in calls:
            if len(tool_ids) >= MAX_TOOL_CALLS_PER_MESSAGE:
                result: dict[str, Any] | None = {
                    "error": "tool call limit reached",
                    "limit": MAX_TOOL_CALLS_PER_MESSAGE,
                }
            else:
                started = time.perf_counter()
                result = await execute_tool_call(call)
                if result is None or result.get("error") is None:
                    tool_ids.append(call["id"])
                logger.info(
                    "irn.tool_call",
                    request_id=request_id,
                    tool=call["name"],
                    tool_execution_id=call["id"],
                    timestamp=datetime.now(UTC).isoformat(),
                    duration_ms=round((time.perf_counter() - started) * 1000),
                    executed=result is not None,
                    tool_error=(result or {}).get("error"),
                )
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call["id"],
                    "content": tool_message_content(result),
                }
            )

    answer = _clean_answer(content)
    if not answer:
        answer = (
            "Maaf, saya belum dapat merangkum berita tersebut. "
            "Silakan coba pertanyaan lain tentang berita yang tampil."
        )
    return answer, tokens, tool_ids


__all__ = [
    "IRN_SYSTEM_PROMPT",
    "MAX_TOOL_CALLS_PER_MESSAGE",
    "OUT_OF_SCOPE_MESSAGE",
    "SEARCH_TOOL_NAME",
    "chat_irn",
]
