import json

import httpcore
import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services.article_fetch import FetchedArticle, extract_article, fetch_article
from app.services.pinned_http import _PinnedNetworkBackend

ARTICLE_TEXT = (
    "Pemerintah mengumumkan kebijakan baru pada 12 Oktober 2026. "
    "Menteri mengatakan keputusan itu akan berlaku bagi seluruh wilayah Indonesia. "
    "Dokumen resmi menjelaskan bahwa anggaran mencapai Rp 42 miliar dan mulai "
    "diterapkan pada 1 Januari 2027. Sejumlah pihak menyambut kebijakan tersebut "
    "sementara evaluasi lanjutan dijadwalkan setelah enam bulan."
)
ARTICLE_HTML = f"""<!doctype html>
<html lang="id">
<head>
  <title>Berita Kebijakan</title>
  <meta property="og:site_name" content="Contoh News">
  <script type="application/ld+json">
  {json.dumps({"@type": "NewsArticle", "headline": "Judul Resmi", "author": {"name": "Redaksi"}, "datePublished": "2026-10-12T10:00:00+07:00"})}
  </script>
</head>
<body><article><h1>Judul Resmi</h1>
<p>{ARTICLE_TEXT}</p><p>{ARTICLE_TEXT}</p>
</article></body></html>"""


def test_extract_article_reads_metadata_and_deduplicates_paragraphs() -> None:
    article = extract_article(
        ARTICLE_HTML,
        "https://example.org/article",
        "https://example.org/article",
        200,
    )

    assert article.title == "Judul Resmi"
    assert article.author == "Redaksi"
    assert article.publisher == "Contoh News"
    assert article.published_at == "2026-10-12T10:00:00+07:00"
    assert article.language == "id"
    assert article.extraction_method == "trafilatura"
    assert article.text.count("Pemerintah mengumumkan") == 1


@pytest.mark.asyncio
async def test_article_redirect_is_validated_and_pinned_per_host(monkeypatch) -> None:
    start = "https://first.example/article"
    destination = "https://second.example/story"
    validated: list[str] = []
    requests: list[tuple[str, tuple[str, ...]]] = []

    def resolve(url: str, _max_length: int) -> tuple[str, ...]:
        validated.append(url)
        return ("93.184.216.34",)

    async def fetch_one(url: str, addresses: tuple[str, ...], *_args):
        requests.append((url, addresses))
        if url == start:
            return 302, destination, "text/html", ""
        return 200, "", "text/html", ARTICLE_HTML

    monkeypatch.setattr("app.services.article_fetch.resolve_fetch_url", resolve)
    monkeypatch.setattr("app.services.article_fetch._fetch_one", fetch_one)
    article = await fetch_article(
        start,
        max_url_length=2048,
        timeout=1,
        user_agent="test-agent",
    )

    assert validated == [start, destination]
    assert requests == [(start, ("93.184.216.34",)), (destination, ("93.184.216.34",))]
    assert article.final_url == destination
    assert article.text.count("Pemerintah mengumumkan") == 1


@pytest.mark.asyncio
async def test_pinned_backend_connects_to_validated_ip() -> None:
    backend = _PinnedNetworkBackend("93.184.216.34")
    seen: list[tuple[object, ...]] = []

    class FakeBackend:
        async def connect_tcp(self, *args, **kwargs):
            seen.append(args)
            return object()

    backend.backend = FakeBackend()
    await backend.connect_tcp("original.example", 443)
    assert seen == [("93.184.216.34", 443)]


@pytest.mark.asyncio
async def test_pinned_transport_maps_httpcore_timeout() -> None:
    from app.services.pinned_http import PinnedHTTPTransport

    transport = PinnedHTTPTransport("93.184.216.34")

    async def timeout(*_args, **_kwargs):
        raise httpcore.ConnectTimeout("test timeout")

    transport.pool.handle_async_request = timeout
    with pytest.raises(httpx.TimeoutException):
        await transport.handle_async_request(
            httpx.Request("GET", "https://example.org")
        )
    await transport.aclose()


def test_news_detail_endpoint_uses_ai_and_reports_uncertain_completeness(
    monkeypatch, tmp_path, settings: Settings
) -> None:
    settings.ai_enabled = True
    settings.groq_api_key = "test-key"
    settings.ai_output_dir = tmp_path
    article = FetchedArticle(
        requested_url="https://example.org/article",
        final_url="https://example.org/article",
        title="Judul Resmi",
        author="Redaksi",
        publisher="Contoh News",
        published_at="2026-10-12T10:00:00+07:00",
        language="id",
        text=ARTICLE_TEXT,
        extraction_method="trafilatura",
        http_status=200,
    )

    async def fetch(*_args, **_kwargs):
        return article

    async def guard(*_args, **_kwargs):
        from app.services.ai import GuardResult

        return GuardResult("pass", 0.01, None)

    async def call_model(**_kwargs):
        return json.dumps({"text": ARTICLE_TEXT}), 0

    monkeypatch.setattr("app.routers.news_detail.fetch_article", fetch)
    monkeypatch.setattr("app.services.article_ai.run_guard", guard)
    monkeypatch.setattr("app.services.article_ai._call_model", call_model)

    with TestClient(create_app(settings)) as client:
        response = client.get(
            "/news/detail/",
            params={"url": "https://example.org/article"},
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["content"] == ARTICLE_TEXT
    assert data["title"] == "Judul Resmi"
    assert data["completeness"] == "not_verified"
    assert data["extracted_length"] == len(ARTICLE_TEXT)
    assert data["cleaned_length"] == len(ARTICLE_TEXT)
    assert data["ai_model"] == settings.ai_extractor_model


def test_openapi_documents_news_detail_endpoint(client: TestClient) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    operation = response.json()["paths"]["/news/detail/"]["get"]
    assert operation["parameters"][0]["name"] == "url"
    assert operation["parameters"][0]["required"] is True
    data_schema = response.json()["components"]["schemas"]["ArticleDetailData"]
    assert data_schema["properties"]["completeness"]["const"] == "not_verified"


@pytest.mark.asyncio
async def test_ai_cleaner_uses_configured_model_and_preserves_chunk_order(
    monkeypatch, settings: Settings
) -> None:
    from app.services import article_ai
    from app.services.ai import GuardResult

    settings.ai_enabled = True
    settings.ai_chunk_max_chars = 500
    text = " ".join([ARTICLE_TEXT] * 5)
    seen_chunks: list[str] = []

    async def guard(raw_text, *_args, **_kwargs):
        assert raw_text == text
        return GuardResult("pass", 0.01, None)

    async def call_model(**kwargs):
        assert kwargs["model"] == settings.ai_extractor_model
        content = kwargs["messages"][1]["content"]
        chunk = json.loads(content.split("\n", 1)[1])
        seen_chunks.append(chunk)
        return json.dumps({"text": chunk}), 0

    monkeypatch.setattr(article_ai, "run_guard", guard)
    monkeypatch.setattr(article_ai, "_call_model", call_model)

    cleaned, model = await article_ai.clean_article_text(text, settings)

    assert model == settings.ai_extractor_model
    assert len(seen_chunks) > 1
    assert " ".join(cleaned.split()) == " ".join(text.split())


@pytest.mark.asyncio
async def test_ai_cleaner_rejects_oversize_without_truncating(
    monkeypatch, settings: Settings
) -> None:
    from app.services import article_ai
    from app.services.ai import GuardResult
    from app.services.article_ai import ArticleTextIncomplete

    settings.ai_enabled = True
    settings.ai_chunk_max_chars = 500
    settings.ai_max_chunks = 1

    async def guard(*_args, **_kwargs):
        return GuardResult("pass", 0.01, None)

    async def unexpected_model_call(**_kwargs):
        raise AssertionError("oversized content must not be sent to the model")

    monkeypatch.setattr(article_ai, "run_guard", guard)
    monkeypatch.setattr(article_ai, "_call_model", unexpected_model_call)

    with pytest.raises(ArticleTextIncomplete, match="configured AI processing limit"):
        await article_ai.clean_article_text(ARTICLE_TEXT * 10, settings)
