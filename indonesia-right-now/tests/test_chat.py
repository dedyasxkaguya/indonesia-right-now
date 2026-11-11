"""Tests for POST /chat with mocked Groq responses.

These tests focus on the endpoint contract: validation, success paths,
out-of-scope rejection, tool calling, and error paths. The Groq model calls
are mocked at the `app.services.chat` boundary.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from groq import APIStatusError

from app.config import Settings
from app.main import create_app
from app.services.ai import AIConfigurationError
from app.services.chat import _parse_number, query_dataset_aggregate

OOS_PHRASE = "Maaf, saya hanya dapat menjawab pertanyaan seputar data pada halaman ini."


@pytest.fixture
def client():
    settings = Settings(
        app_env="development",
        ai_enabled=True,
        groq_api_key="sk-test",
    )
    return TestClient(create_app(settings=settings))


@pytest.fixture
def valid_payload():
    return {
        "mode": "IGS",
        "page_context": "Ekonomi",
        "dataset_name": "PDRB per Kapita",
        "context_data": (
            "| Provinsi | Nilai |\n|---|---|\n| Jawa Barat | 3.200 |\n| Bali | 2.800 |"
        ),
        "question": "Berapa nilai Jawa Barat?",
    }


def _patch_model(content: str, *, total_tokens: int = 20):
    """Patch the tool-aware model call used by the chat service."""
    return patch(
        "app.services.chat._call_model_with_tools",
        new=AsyncMock(return_value=(content, total_tokens, None, None)),
    )


class TestChatValidationErrors:
    def test_missing_fields_return_422(self, client):
        response = client.post("/chat", json={"mode": "IGS"})
        assert response.status_code == 422
        body = response.json()
        assert body.get("ok") is False
        assert body.get("error", {}).get("code") == "VALIDATION_ERROR"
        assert body["error"].get("details", {}).get("errors", [])

    def test_extra_fields_are_rejected(self, client):
        response = client.post(
            "/chat",
            json={
                "mode": "IGS",
                "page_context": "Ekonomi",
                "dataset_name": "PDRB per Kapita",
                "context_data": "| Provinsi | Nilai |",
                "question": "Berapa?",
                "unexpected_field": "x",
            },
        )
        assert response.status_code in {400, 422}
        assert response.json().get("ok") is False

    def test_long_question_returns_422(self, client):
        response = client.post(
            "/chat",
            json={
                "mode": "IGS",
                "page_context": "Ekonomi",
                "dataset_name": "PDRB per Kapita",
                "context_data": "| Provinsi | Nilai |",
                "question": "x" * 2001,
            },
        )
        assert response.status_code == 422

    def test_whitespace_question_returns_422(self, client):
        response = client.post(
            "/chat",
            json={
                "mode": "IGS",
                "page_context": "Ekonomi",
                "dataset_name": "PDRB per Kapita",
                "context_data": "| Provinsi | Nilai |",
                "question": "   \n\t  ",
            },
        )
        assert response.status_code == 422

    def test_too_long_context_returns_422(self, client):
        response = client.post(
            "/chat",
            json={
                "mode": "IGS",
                "page_context": "Ekonomi",
                "dataset_name": "PDRB per Kapita",
                "context_data": "x" * 10001,
                "question": "Berapa?",
            },
        )
        assert response.status_code == 422


class TestChatSuccessPath:
    def test_valid_request_returns_ok_and_answer(self, client, valid_payload):
        with _patch_model("Jawa Barat nilainya 3.200.", total_tokens=20) as mock_call:
            response = client.post("/chat", json=valid_payload)

        assert response.status_code == 200
        payload = response.json()
        assert payload["ok"] is True
        data = payload["data"]
        assert data["answer"] == "Jawa Barat nilainya 3.200."
        assert data["model"] == "openai/gpt-oss-120b"
        assert data["scope_locked"] is False
        assert isinstance(data["duration_ms"], int)
        assert data["tool_execution_id"] is None
        assert mock_call.await_count == 1
        call = mock_call.await_args.kwargs
        assert call["max_tokens"] == 400
        assert call["temperature"] == 0.1

    def test_context_is_limited_to_ten_rows_and_3000_characters(self, client):
        context = "\n".join(f"{index} " + ("x" * 400) for index in range(12))
        payload = {
            "mode": "IGS",
            "page_context": "Ekonomi",
            "dataset_name": "PDRB per Kapita",
            "context_data": context,
            "question": "Apa yang ditampilkan?",
        }
        with _patch_model("Data tersedia.") as mock_call:
            response = client.post("/chat", json=payload)

        assert response.status_code == 200
        system_message = mock_call.await_args.kwargs["messages"][0]["content"]
        supplied_context = system_message.split("<context_data>\n", 1)[1].split(
            "\n</context_data>", 1
        )[0]
        assert len(supplied_context) <= 3000
        assert len(supplied_context.splitlines()) <= 10
        assert "10 " not in supplied_context

    def test_model_response_in_a_code_block_is_stripped(self, client, valid_payload):
        with _patch_model("```indonesian\nJawa Barat nilainya 3.200.\n```"):
            response = client.post("/chat", json=valid_payload)

        assert response.status_code == 200
        answer = response.json()["data"]["answer"]
        assert answer == "Jawa Barat nilainya 3.200."
        assert "```" not in answer

    def test_model_returns_full_out_of_scope_phrase(self, client, valid_payload):
        with _patch_model(OOS_PHRASE, total_tokens=18):
            response = client.post("/chat", json=valid_payload)

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["answer"] == OOS_PHRASE
        assert data["scope_locked"] is True

    def test_tool_call_is_executed_and_reported(self, client, valid_payload):
        tool_arguments = {"metric": "mean", "group_by": "provinsi"}
        with patch(
            "app.services.chat._call_model_with_tools",
            new=AsyncMock(
                return_value=("", 30, "call_abc123", tool_arguments)
            ),
        ), patch(
            "app.services.chat._call_model",
            new=AsyncMock(return_value=("Rata-ratanya 3.000,00.", 12)),
        ) as mock_final:
            response = client.post("/chat", json=valid_payload)
            sent_messages = mock_final.await_args.kwargs["messages"]

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["answer"] == "Rata-ratanya 3.000,00."
        assert data["tool_execution_id"] == "call_abc123"
        assert mock_final.await_args.kwargs["max_tokens"] == 400
        assert mock_final.await_args.kwargs["temperature"] == 0.1
        # The follow-up turn must contain the assistant tool call and the tool result.
        assert sent_messages[-2]["role"] == "assistant"
        assert sent_messages[-2]["tool_calls"][0]["id"] == "call_abc123"
        assert sent_messages[-1]["role"] == "tool"
        assert sent_messages[-1]["tool_call_id"] == "call_abc123"
        assert '"value": "3000.00"' in sent_messages[-1]["content"]

    def test_tool_failure_falls_back_to_chat_error(self, client, valid_payload):
        with patch(
            "app.services.chat._call_model_with_tools",
            new=AsyncMock(return_value=("", 30, "call_x", {"metric": "mean"})),
        ), patch(
            "app.services.chat._call_model",
            new=AsyncMock(side_effect=RuntimeError("boom")),
        ):
            response = client.post("/chat", json=valid_payload)

        assert response.status_code == 502
        assert response.json()["error"]["code"] == "CHAT_AI_FAILED"


class TestChatOutOfScopeBehavior:
    def _build_payload(self, *, question: str):
        return {
            "mode": "IGS",
            "page_context": "Ekonomi",
            "dataset_name": "PDRB per Kapita",
            "context_data": "| Provinsi | Nilai |\n|---|---|\n| Jawa Barat | 3.200 |",
            "question": question,
        }

    @pytest.mark.parametrize(
        "question",
        [
            "Siapa presiden Amerika Serikat?",
            "5+5 berapa hasilnya?",
            "Apa berita IRN hari ini?",
        ],
    )
    def test_off_topic_question_is_refused_by_model(self, client, question):
        with _patch_model(OOS_PHRASE, total_tokens=18):
            response = client.post("/chat", json=self._build_payload(question=question))

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["answer"] == OOS_PHRASE
        assert data["scope_locked"] is True


class TestChatErrorPaths:
    def test_ai_disabled_returns_503(self, valid_payload):
        disabled = TestClient(
            create_app(
                Settings(app_env="development", ai_enabled=False, groq_api_key="sk-test")
            )
        )
        response = disabled.post("/chat", json=valid_payload)
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "CHAT_AI_DISABLED"

    def test_missing_api_key_returns_500(self, valid_payload):
        without_key = TestClient(
            create_app(
                Settings(app_env="development", ai_enabled=True, groq_api_key="")
            )
        )
        response = without_key.post("/chat", json=valid_payload)
        assert response.status_code == 500
        payload = response.json()
        assert payload["error"]["code"] == "CHAT_AI_CONFIG"
        assert payload["error"]["message"] == "Terjadi kesalahan sistem, silakan hubungi admin."

    def test_groq_401_returns_500_with_generic_message(self, client, valid_payload):
        with patch(
            "app.services.chat._call_model_with_tools",
            new=AsyncMock(side_effect=AIConfigurationError("rejected")),
        ):
            response = client.post("/chat", json=valid_payload)

        assert response.status_code == 500
        payload = response.json()
        assert payload["error"]["code"] == "CHAT_AI_CONFIG"
        assert payload["error"]["message"] == "Terjadi kesalahan sistem, silakan hubungi admin."

    def test_groq_429_after_backoff_returns_502(self, client, valid_payload):
        rate_limited = APIStatusError("rate limit", response=_mock_response(429), body=None)
        with patch(
            "app.services.chat._call_model_with_tools",
            new=AsyncMock(side_effect=rate_limited),
        ):
            response = client.post("/chat", json=valid_payload)

        assert response.status_code == 502
        payload = response.json()
        assert payload["error"]["code"] == "CHAT_AI_FAILED"
        assert payload["error"]["message"] == "Terjadi kesalahan sistem, silakan hubungi admin."

    def test_groq_generic_error_returns_502(self, client, valid_payload):
        with patch(
            "app.services.chat._call_model_with_tools",
            new=AsyncMock(side_effect=RuntimeError("Groq unavailable")),
        ):
            response = client.post("/chat", json=valid_payload)

        assert response.status_code == 502
        payload = response.json()
        assert payload["error"]["code"] == "CHAT_AI_FAILED"
        assert payload["error"]["message"] == "Terjadi kesalahan sistem, silakan hubungi admin."


class TestDatasetAggregate:
    def test_parse_number_handles_indonesian_separators(self):
        assert _parse_number("3.200") == 3200
        assert _parse_number("3.200,50") == 3200.5
        assert _parse_number("3,5") == 3.5
        assert _parse_number("Rp 1.250.000") == 1250000
        assert _parse_number("-2.400") == -2400
        assert _parse_number("nilai") is None

    @pytest.mark.asyncio
    async def test_median_over_sample_rows(self):
        dataset = (
            "| Provinsi | Nilai |\n|---|---|\n"
            "| Aceh | 1.000 |\n| Bali | 3.000 |\n| Papua | 2.000 |\n| Jawa | 4.000 |"
        )
        result = await query_dataset_aggregate(
            metric="median", group_by="provinsi", filter=None, dataset=dataset
        )
        assert result["error"] is None
        assert result["result"]["value"] == "2500.00"
        assert result["result"]["total_rows"] == 4

    @pytest.mark.asyncio
    async def test_filter_restricts_rows(self):
        dataset = "| Provinsi | Tahun | Nilai |\n|---|---|---|\n| Bali | 2023 | 1.000 |\n| Bali | 2024 | 3.000 |"
        result = await query_dataset_aggregate(
            metric="sum", group_by="tahun", filter={"tahun": "2023"}, dataset=dataset
        )
        assert result["result"]["value"] == "1000.00"
        assert result["result"]["total_rows"] == 1

    @pytest.mark.asyncio
    async def test_no_numeric_data_reports_error(self):
        result = await query_dataset_aggregate(
            metric="mean", group_by="provinsi", filter=None, dataset="| A | B |\n|---|---|\n| x | y |"
        )
        assert result["error"] is not None
        assert result["result"] is None


def _mock_response(status_code: int):
    import httpx

    class _Response:
        def __init__(self) -> None:
            self.status_code = status_code
            self.request = httpx.Request("POST", "https://api.groq.com/test")
            self.headers: dict[str, str] = {}

    return _Response()
