"""Tests for POST /chat/irn (Presenter IRN).

Model calls are mocked at the ``app.services.chat_irn`` boundary; the tool
implementations run against the real in-memory news pool.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services.chat_irn import OUT_OF_SCOPE_MESSAGE
from app.services.news_cache import get_pool, publish_articles

SEEDED_ARTICLES = [
    {
        "title": "Harga beras naik di sejumlah daerah",
        "publisher": "ANTARA",
        "category": "Ekonomi",
        "url": "https://www.antaranews.com/beras-naik",
    },
    {
        "title": "Beras lokal mulai langka di pasar",
        "publisher": "Kompas",
        "category": "Ekonomi",
        "url": "https://www.kompas.com/beras-langka",
    },
    {
        "title": "Beras impor tiba di pelabuhan",
        "publisher": "Tempo",
        "category": "Ekonomi",
        "url": "https://www.tempo.co/beras-impor",
    },
]


@pytest.fixture
def client():
    settings = Settings(
        app_env="development",
        ai_enabled=True,
        groq_api_key="sk-test",
    )
    with TestClient(create_app(settings=settings)) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def clean_pool():
    get_pool().clear()
    yield
    get_pool().clear()


def _payload(**overrides):
    payload = {
        "mode": "IRN",
        "page_context": "Hari Ini",
        "visible_articles": [
            {
                "title": "Harga beras naik di sejumlah daerah",
                "publisher": "ANTARA",
                "category": "Ekonomi",
                "summary": "Harga beras naik pada pekan ini.",
                "url": "https://www.antaranews.com/beras-naik",
                "published_at": "2026-11-11T08:00:00+07:00",
            },
            {
                "title": "Beras lokal mulai langka di pasar",
                "publisher": "Kompas",
                "category": "Ekonomi",
                "summary": "Stok beras lokal menipis.",
                "url": "https://www.kompas.com/beras-langka",
                "published_at": "2026-11-11T09:30:00+07:00",
            },
        ],
        "question": "Ada berita lain tentang topik ini?",
    }
    payload.update(overrides)
    return payload


def _call(call_id: str, name: str, arguments: dict) -> dict:
    return {"id": call_id, "name": name, "arguments": json.dumps(arguments)}


def _patch_agent(*responses):
    return patch(
        "app.services.chat_irn._call_agent_model",
        new=AsyncMock(side_effect=list(responses)),
    )


def _patch_final(content: str, tokens: int = 12):
    return patch(
        "app.services.chat_irn._call_model",
        new=AsyncMock(return_value=(content, tokens)),
    )


class TestIRNValidation:
    def test_valid_request_returns_200(self, client):
        with _patch_agent(("Harga beras memang naik pekan ini.", 40, [])) as mock_agent:
            response = client.post("/chat/irn", json=_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["ok"] is True
        data = body["data"]
        assert data["answer"] == "Harga beras memang naik pekan ini."
        assert data["tool_execution_ids"] == []
        assert data["scope_locked"] is False
        assert isinstance(data["duration_ms"], int)
        call = mock_agent.await_args.kwargs
        assert call["max_tokens"] == 400
        assert call["temperature"] == 0.1

    def test_model_context_contains_at_most_five_articles(self, client):
        articles = [
            {
                "title": f"Berita {index}",
                "publisher": "ANTARA",
                "summary": "Ringkasan",
                "url": f"https://example.org/{index}",
            }
            for index in range(8)
        ]
        with _patch_agent(("Ringkasan berita.", 40, [])) as mock_agent:
            response = client.post(
                "/chat/irn",
                json=_payload(visible_articles=articles),
            )

        assert response.status_code == 200
        system_message = mock_agent.await_args.kwargs["messages"][0]["content"]
        assert system_message.count('"index":') == 5
        assert '"index": 5' in system_message
        assert '"index": 6' not in system_message

    def test_missing_question_returns_422(self, client):
        payload = _payload()
        payload.pop("question")
        assert client.post("/chat/irn", json=payload).status_code == 422

    def test_wrong_mode_returns_422(self, client):
        assert client.post("/chat/irn", json=_payload(mode="IGS")).status_code == 422

    def test_more_than_ten_articles_returns_422(self, client):
        articles = [
            {"title": f"Judul berita {index}", "publisher": "ANTARA"}
            for index in range(11)
        ]
        response = client.post("/chat/irn", json=_payload(visible_articles=articles))
        assert response.status_code == 422

    def test_unknown_article_field_returns_422(self, client):
        articles = [
            {
                "title": "Judul",
                "publisher": "ANTARA",
                "full_content": "Teks artikel lengkap yang tidak boleh dikirim.",
            }
        ]
        response = client.post("/chat/irn", json=_payload(visible_articles=articles))
        assert response.status_code == 422

    def test_question_over_2000_chars_returns_422(self, client):
        response = client.post("/chat/irn", json=_payload(question="x" * 2001))
        assert response.status_code == 422

    def test_ai_disabled_returns_503(self):
        settings = Settings(
            app_env="development", ai_enabled=False, groq_api_key="sk-test"
        )
        with TestClient(create_app(settings=settings)) as disabled:
            response = disabled.post("/chat/irn", json=_payload())
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "CHAT_IRN_AI_DISABLED"


class TestNewsPoolNormalization:
    def test_real_news_item_shape_maps_source_url_and_categories(self):
        # Shape taken from a live POST /news response.
        publish_articles(
            [
                {
                    "title": "Harga beras naik di sejumlah daerah",
                    "publisher": "ANTARA",
                    "categories": ["Ekonomi", "Nasional"],
                    "summary": "Harga beras naik.",
                    "source_url": "https://www.antaranews.com/berita/1",
                    "published_at": "2026-11-11T08:00:00+07:00",
                    "content": "Teks artikel lengkap yang tidak boleh disimpan.",
                }
            ]
        )
        stored = get_pool().snapshot()
        assert len(stored) == 1
        assert stored[0]["url"] == "https://www.antaranews.com/berita/1"
        assert stored[0]["category"] == "Ekonomi, Nasional"
        assert "content" not in stored[0]

    def test_articles_sharing_one_feed_url_are_all_kept(self):
        # Live /news items carry the feed URL in source_url, so many articles
        # share it. Dedupe must key on title+publisher instead.
        feed = "https://en.antaranews.com/rss/press-release.xml"
        items = [
            {
                "title": f"Siaran pers perusahaan {index}",
                "publisher": "ANTARA News - Press Release",
                "source_url": feed,
            }
            for index in range(5)
        ]
        publish_articles(items)
        assert len(get_pool().snapshot()) == 5

    def test_identical_title_and_publisher_is_deduplicated(self):
        item = {"title": "Judul sama", "publisher": "ANTARA", "source_url": "https://a/1"}
        publish_articles([item, {**item, "source_url": "https://a/2"}])
        assert len(get_pool().snapshot()) == 1

    def test_search_matches_indonesian_affixes(self):
        publish_articles(
            [
                {"title": "Harga beras naik", "publisher": "ANTARA"},
                {"title": "Kebijakan pemerintahan baru", "publisher": "Kompas"},
            ]
        )
        assert len(get_pool().search("berasnya", 5)) == 1
        assert len(get_pool().search("pemerintah", 5)) == 1
        assert get_pool().search("olahraga", 5) == []
        assert get_pool().diversity("pemerintah")["publisher_count"] == 1


class TestIRNTools:
    def test_search_tool_executes_and_feeds_result_back(self, client):
        publish_articles(SEEDED_ARTICLES)
        search_call = _call("call_search_1", "search_related_news", {"query": "beras"})

        with _patch_agent(
            ("", 25, [search_call]),
            ("Selain itu, Tempo melaporkan beras impor tiba.", 18, []),
        ) as mock_agent, _patch_final("tidak dipakai") as mock_final:
            response = client.post("/chat/irn", json=_payload())
            tool_turn = mock_agent.await_args_list[1].kwargs["messages"]

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["tool_execution_ids"] == ["call_search_1"]
        assert "Tempo" in data["answer"]
        assert mock_final.await_count == 0
        # The follow-up turn carries the assistant call and its tool result.
        assert tool_turn[-2]["role"] == "assistant"
        assert tool_turn[-2]["tool_calls"][0]["id"] == "call_search_1"
        assert tool_turn[-1]["role"] == "tool"
        assert tool_turn[-1]["tool_call_id"] == "call_search_1"
        assert "Beras impor tiba" in tool_turn[-1]["content"]

    def test_diversity_tool_returns_publisher_count(self, client):
        publish_articles(SEEDED_ARTICLES)
        diversity_call = _call(
            "call_div_1", "analyze_source_diversity", {"topic": "beras"}
        )
        with _patch_agent(
            ("", 20, [diversity_call]),
            ("Ada tiga penerbit yang meliput topik ini.", 14, []),
        ) as mock_agent:
            response = client.post("/chat/irn", json=_payload())
            tool_turn = mock_agent.await_args_list[1].kwargs["messages"]

        assert response.status_code == 200
        assert response.json()["data"]["tool_execution_ids"] == ["call_div_1"]
        result = json.loads(tool_turn[-1]["content"])
        assert result["publisher_count"] == 3
        assert set(result["unique_publishers"]) == {"ANTARA", "Kompas", "Tempo"}

    def test_tool_calls_are_capped_at_two_per_message(self, client):
        publish_articles(SEEDED_ARTICLES)
        first_round = [
            _call("call_a", "search_related_news", {"query": "beras"}),
            _call("call_b", "analyze_source_diversity", {"topic": "beras"}),
        ]
        second_round = [
            _call("call_c", "search_related_news", {"query": "impor"}),
            _call("call_d", "analyze_source_diversity", {"topic": "impor"}),
        ]
        with _patch_agent(
            ("", 30, first_round),
            ("", 30, second_round),
        ) as mock_agent, _patch_final("Dua penerbit meliput topik ini.") as mock_final:
            response = client.post("/chat/irn", json=_payload())
            final_messages = mock_final.await_args.kwargs["messages"]

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["tool_execution_ids"] == ["call_a", "call_b"]
        over_budget = [
            json.loads(message["content"])
            for message in final_messages
            if message["role"] == "tool"
        ][2:]
        assert len(over_budget) == 2
        assert all(item["error"] == "tool call limit reached" for item in over_budget)
        assert mock_agent.await_count == 2

    def test_tool_failure_still_returns_answer(self, client):
        # Empty pool: the search tool returns no results but must not fail chat.
        with _patch_agent(
            ("", 10, [_call("call_empty", "search_related_news", {"query": "beras"})]),
            ("Belum ada berita lain di halaman ini.", 9, []),
        ):
            response = client.post("/chat/irn", json=_payload())

        assert response.status_code == 200
        assert response.json()["data"]["tool_execution_ids"] == ["call_empty"]


class TestIRNGuardrails:
    def test_out_of_scope_question_is_flagged(self, client):
        with _patch_agent((OUT_OF_SCOPE_MESSAGE, 11, [])):
            response = client.post(
                "/chat/irn", json=_payload(question="Siapa presiden Indonesia?")
            )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["answer"] == OUT_OF_SCOPE_MESSAGE
        assert data["scope_locked"] is True

    @pytest.mark.parametrize(
        "question",
        [
            "Apakah berita ini benar?",
            "Ini hoax atau bukan?",
            "Beritanya akurat tidak?",
        ],
    )
    def test_truth_question_never_reaches_the_model(self, client, question):
        publish_articles(SEEDED_ARTICLES)
        with _patch_agent(("Ya, berita ini benar.", 5, [])) as mock_agent:
            response = client.post("/chat/irn", json=_payload(question=question))

        assert response.status_code == 200
        answer = response.json()["data"]["answer"]
        assert answer.startswith("Saya tidak dapat memverifikasi kebenaran berita")
        assert "diliput oleh 3 sumber" in answer
        assert "sumber aslinya" in answer
        assert "Ya, berita ini benar" not in answer
        assert mock_agent.await_count == 0

    def test_truth_question_reports_visible_publishers_without_pool(self, client):
        with _patch_agent(("Ya.", 1, [])) as mock_agent:
            response = client.post(
                "/chat/irn", json=_payload(question="Apakah berita ini benar?")
            )

        assert response.status_code == 200
        answer = response.json()["data"]["answer"]
        assert answer.startswith("Saya tidak dapat memverifikasi kebenaran berita")
        assert "ANTARA" in answer and "Kompas" in answer
        assert mock_agent.await_count == 0

    def test_truth_question_without_articles_avoids_source_claims(self, client):
        with _patch_agent(("Ya.", 1, [])):
            response = client.post(
                "/chat/irn",
                json=_payload(visible_articles=[], question="Apakah berita ini benar?"),
            )

        answer = response.json()["data"]["answer"]
        assert answer == (
            "Saya tidak dapat memverifikasi kebenaran berita ini. "
            "Silakan cek sumber aslinya untuk informasi lebih lanjut."
        )


class TestIRNIsolationFromIGS:
    def test_igs_chat_endpoint_still_registered(self, client):
        # Missing fields must produce the IGS validation envelope, not IRN's.
        response = client.post("/chat", json={"mode": "IGS"})
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"
