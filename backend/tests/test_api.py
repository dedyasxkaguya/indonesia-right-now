from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app
from newsid.schema import NewsItem, SourceRecord


def _item(
    title: str = "Prabowo announces a new program", author: str | None = None
) -> NewsItem:
    now = datetime.now(UTC).isoformat()
    return NewsItem(
        id="item-1",
        title=title,
        url="https://example.org/article",
        publisher="Example News",
        publisher_domain="example.org",
        author=author,
        published_at=now,
        date_confidence="exact",
        summary="A report from the example feed.",
        content=None,
        categories=["politics"],
        language="id",
        source_url="https://example.org/feed.xml",
        fetched_at=now,
    )


def _record(status: str = "ok") -> SourceRecord:
    now = datetime.now(UTC).isoformat()
    return SourceRecord(
        url="https://example.org/feed.xml",
        publisher="Example News",
        status=status,
        fetched_at=now,
        items=1 if status == "ok" else 0,
        error={"code": "network", "message": "offline"} if status == "error" else None,
    )


def _mock_fetch_ai(monkeypatch, client: TestClient) -> None:
    client.app.state.settings.ai_enabled = True
    client.app.state.settings.groq_api_key = "test-key"

    async def run_pipeline(*args, **kwargs):
        return SimpleNamespace(
            guard=SimpleNamespace(status="pass", confidence=0.02, reason=None),
            extraction=SimpleNamespace(
                chunks_total=1,
                chunks_ok=1,
                chunks_failed=0,
                items_raw=0,
                language="id",
                model="test-model",
            ),
            items=[],
            deduped=0,
            items_omitted=0,
            cached=False,
            saved=None,
            duration_ms=1,
        )

    monkeypatch.setattr("app.routers.fetch.run_pipeline", run_pipeline)


def test_health_returns_envelope_and_is_public(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["data"]["status"] == "up"
    assert response.headers["x-request-id"]


def test_cors_allows_any_origin_and_preflight_methods(client: TestClient) -> None:
    response = client.options(
        "/fetch",
        headers={
            "Origin": "https://any-site.example",
            "Access-Control-Request-Method": "DELETE",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    allowed_methods = response.headers["access-control-allow-methods"]
    assert {"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"} <= set(
        allowed_methods.split(", ")
    )
    allowed_headers = response.headers["access-control-allow-headers"].casefold()
    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers
    assert "access-control-allow-credentials" not in response.headers


def test_cors_wildcard_cannot_be_mixed_with_explicit_origins() -> None:
    with pytest.raises(ValidationError, match="cannot combine"):
        Settings(_env_file=None, app_cors_origins="*,https://trusted.example")


def test_meta_reports_single_worker(monkeypatch, client: TestClient) -> None:
    async def info():
        return {"installed": True, "chromium_version": "Chromium test"}

    monkeypatch.setattr("app.routers.health.playwright_info", info)
    response = client.get("/meta")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["workers"] == 1
    assert data["playwright"]["installed"] is True
    assert "preset" not in data
    assert "output_dir" not in data


def test_fetch_get_returns_envelope(monkeypatch, client: TestClient) -> None:
    _mock_fetch_ai(monkeypatch, client)
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    monkeypatch.setattr(
        "app.routers.fetch._run_fetch",
        lambda options, settings: {
            "url": options.url,
            "content": "A mocked article",
            "mode": options.mode,
            "final_url": options.url,
            "engine": options.engine,
            "length": 16,
        },
    )
    response = client.get(
        "/fetch", params={"url": "https://example.org", "mode": "text"}
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["data"]["news_items"] == []
    assert response.json()["data"]["raw"] is None


def test_fetch_static_adapter_extracts_and_truncates(
    monkeypatch, client: TestClient
) -> None:
    _mock_fetch_ai(monkeypatch, client)
    from pyscrape.fetcher import FetchResult

    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    monkeypatch.setattr(
        "pyscrape.fetcher.fetch_static",
        lambda url, **kwargs: FetchResult(
            html="<html><head><title>Example title</title></head><body>abcdefgh</body></html>",
            status_code=200,
            final_url=url,
        ),
    )
    response = client.get(
        "/fetch",
        params={
            "url": "https://example.org/article",
            "engine": "static",
            "mode": "text",
            "max_chars": 5,
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["title"] == "Example title"
    assert data["raw"] is None
    assert data["news_items"] == []
    assert data["truncated"] is True
    assert data["length"] == 5
    assert data["http_status"] == 200


def test_fetch_post_body_overrides_query(monkeypatch, client: TestClient) -> None:
    _mock_fetch_ai(monkeypatch, client)
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    monkeypatch.setattr(
        "app.routers.fetch._run_fetch",
        lambda options, settings: {
            "url": options.url,
            "mode": options.mode,
            "content": "A mocked article",
            "final_url": options.url,
            "engine": options.engine,
            "length": 16,
        },
    )
    response = client.post(
        "/fetch?url=https://query.example&mode=unsupported",
        json={"url": "https://body.example", "mode": "text"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["url"] == "https://body.example"
    assert response.json()["data"]["mode"] == "text"
    assert response.json()["data"]["news_items"] == []


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "http://[::1]/",
        "http://169.254.169.254/",
        "file:///etc/passwd",
    ],
)
def test_fetch_rejects_ssrf_targets(client: TestClient, url: str) -> None:
    response = client.get("/fetch", params={"url": url})
    assert response.status_code == 400
    assert response.json()["error"]["code"] in {
        "FETCH_SSRF_BLOCKED",
        "FETCH_INVALID_URL",
    }


def test_fetch_maps_forbidden_response(monkeypatch, client: TestClient) -> None:
    from pyscrape.fetcher import BotCheckError

    _mock_fetch_ai(monkeypatch, client)
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)

    def forbidden(*args, **kwargs):
        raise BotCheckError("HTTP 403 bot check")

    monkeypatch.setattr("pyscrape.fetcher.fetch_static", forbidden)
    response = client.post(
        "/fetch",
        json={"url": "https://example.org", "engine": "static"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FETCH_FORBIDDEN"


def test_news_get_returns_native_document(monkeypatch, client: TestClient) -> None:
    async def collect(*args, **kwargs):
        return [_item()], [_record()], 1

    monkeypatch.setattr("newsid.cli._collect", collect)
    response = client.get(
        "/news",
        params={"sources": "https://example.org/feed.xml", "dry_run": "true"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["schema_version"] == 1
    assert data["items"][0]["title"].startswith("Prabowo")
    assert data["snapshot"]["written"] is False


def test_news_post_uses_body_and_writes_snapshot(
    monkeypatch, client: TestClient
) -> None:
    async def collect(*args, **kwargs):
        return [_item()], [_record()], 1

    monkeypatch.setattr("newsid.cli._collect", collect)
    response = client.post(
        "/news?since=invalid&keyword=not-the-body",
        json={
            "sources": [{"url": "https://example.org/feed.xml", "name": "Example"}],
            "since": "24h",
            "keyword": ["Prabowo"],
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["query"]["since"] == "24h"
    assert data["query"]["source_selection"] == "inline"
    assert data["snapshot"]["written"] is True
    assert Path(data["snapshot"]["path"]).is_file()


def test_news_filter_empty_is_success(monkeypatch, client: TestClient) -> None:
    async def collect(*args, **kwargs):
        return [_item()], [_record()], 1

    monkeypatch.setattr("newsid.cli._collect", collect)
    response = client.get(
        "/news",
        params={
            "sources": "https://example.org/feed.xml",
            "keyword": "does-not-match",
            "dry_run": "true",
        },
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["data"]["items"] == []


def test_news_retains_failed_source_when_another_succeeds(
    monkeypatch, client: TestClient
) -> None:
    async def collect(*args, **kwargs):
        return [_item()], [_record("error"), _record()], 1

    monkeypatch.setattr("newsid.cli._collect", collect)
    response = client.get(
        "/news",
        params={
            "sources": "https://example.org/a,https://example.org/b",
            "dry_run": "true",
        },
    )
    assert response.status_code == 200
    assert any(
        source["status"] == "error" for source in response.json()["data"]["sources"]
    )


def test_news_all_sources_failed_maps_to_502(monkeypatch, client: TestClient) -> None:
    async def collect(*args, **kwargs):
        return [], [_record("error")], 0

    monkeypatch.setattr("newsid.cli._collect", collect)
    response = client.get(
        "/news",
        params={"sources": "https://example.org/feed.xml"},
    )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "NEWS_ALL_SOURCES_FAILED"


def test_invalid_since_is_validation_error(client: TestClient) -> None:
    response = client.get(
        "/news",
        params={"sources": "https://example.org/feed.xml", "since": "yesterday"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_unknown_route_uses_envelope(client: TestClient) -> None:
    response = client.get("/not-a-route")
    assert response.status_code == 404
    assert response.json()["ok"] is False
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_news_ai_routes_are_removed_and_remaining_routes_are_registered(
    client: TestClient,
) -> None:
    for path in (
        "/news/ai",
        "/news/ai/jobs",
        "/news/ai/jobs/removed-job",
        "/news/ai/detail",
    ):
        response = client.get(path)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"

    response = client.post("/news/ai", json={})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"

    paths = client.get("/openapi.json").json()["paths"]
    assert {"/news", "/news/detail/", "/fetch"} <= paths.keys()
    assert not any(path.startswith("/news/ai") for path in paths)


def test_rate_limit_only_applies_in_production() -> None:
    settings = Settings(
        _env_file=None,
        app_env="production",
        rate_limit_fetch="1/minute",
        ai_enabled=False,
    )
    with TestClient(create_app(settings)) as client:
        first = client.get("/fetch")
        second = client.get("/fetch")
        health = client.get("/health")
    assert first.status_code == 422
    assert second.status_code == 429
    assert second.json()["error"]["code"] == "RATE_LIMITED"
    assert second.headers["retry-after"]
    assert health.status_code == 200


def test_rate_limit_is_disabled_in_development(client: TestClient) -> None:
    first = client.get("/fetch")
    second = client.get("/fetch")
    assert first.status_code == 422
    assert second.status_code == 422


def test_api_key_is_required_when_configured(tmp_path) -> None:
    settings = Settings(
        _env_file=None,
        api_key="secret",
        newsid_output_dir=tmp_path,
        ai_enabled=False,
    )
    with TestClient(create_app(settings)) as client:
        denied = client.get("/meta")
        accepted = client.get("/meta", headers={"X-API-Key": "secret"})
        health = client.get("/health")
    assert denied.status_code == 401
    assert denied.json()["error"]["code"] == "UNAUTHORIZED"
    assert accepted.status_code == 200
    assert health.status_code == 200


def test_create_app_rejects_multiple_workers() -> None:
    settings = Settings(_env_file=None, app_workers=2)
    with pytest.raises(RuntimeError, match="APP_WORKERS must be 1"):
        create_app(settings)


_CANONICAL_ITEM_KEYS = {
    "id",
    "title",
    "url",
    "publisher",
    "publisher_domain",
    "author",
    "published_at",
    "date_confidence",
    "summary",
    "content",
    "categories",
    "language",
    "source_url",
    "fetched_at",
}


def test_news_items_match_canonical_shape(monkeypatch, client: TestClient) -> None:
    async def collect(*args, **kwargs):
        return [_item(author="/u/example-user")], [_record()], 1

    monkeypatch.setattr("newsid.cli._collect", collect)
    response = client.get(
        "/news",
        params={"sources": "https://example.org/feed.xml", "dry_run": "true"},
    )
    assert response.status_code == 200
    item = response.json()["data"]["items"][0]
    assert set(item) == _CANONICAL_ITEM_KEYS
    assert item["author"] == "/u/example-user"


def test_news_accepts_plural_query_param_aliases(
    monkeypatch, client: TestClient
) -> None:
    async def collect(*args, **kwargs):
        return [_item()], [_record()], 1

    monkeypatch.setattr("newsid.cli._collect", collect)
    response = client.get(
        "/news",
        params={
            "sources": "https://example.org/feed.xml",
            "dry_run": "true",
            "categories": "politics",
            "publisher": "Example News",
            "keywords": "Prabowo,another",
            "excludes": "unrelated",
        },
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True
    query = response.json()["data"]["query"]
    assert query["categories"] == ["politics"]
    assert query["publishers"] == ["Example News"]
    assert query["keywords"] == ["Prabowo", "another"]
    assert query["excludes"] == ["unrelated"]


def test_news_post_accepts_plural_body_aliases(monkeypatch, client: TestClient) -> None:
    async def collect(*args, **kwargs):
        return [_item()], [_record()], 1

    monkeypatch.setattr("newsid.cli._collect", collect)
    response = client.post(
        "/news",
        params={"dry_run": "true"},
        json={
            "sources": [{"url": "https://example.org/feed.xml"}],
            "since": "24h",
            "keywords": ["Prabowo"],
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["items"][0]["title"].startswith("Prabowo")
