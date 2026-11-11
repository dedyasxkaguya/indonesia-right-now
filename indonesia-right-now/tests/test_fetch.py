from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.errors import AppError
from app.routers.fetch import _run_fetch
from app.schemas.fetch import FetchRequest
from pyscrape.fetcher import FetchResult


def test_fetch_defaults_allow_more_scrolling_and_content() -> None:
    assert FetchRequest(url="https://example.org").scroll == 30
    assert Settings(_env_file=None).pyscrape_max_chars == 50000


def test_static_fetch_reports_unsupported_content_type(monkeypatch) -> None:
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    monkeypatch.setattr(
        "pyscrape.fetcher.fetch_static",
        lambda url, **_kwargs: FetchResult(
            html="not an article",
            status_code=200,
            final_url=url,
            content_type="image/png",
        ),
    )
    with pytest.raises(AppError) as error:
        _run_fetch(
            FetchRequest(url="https://example.org/image.png", engine="static"),
            Settings(_env_file=None),
        )
    assert error.value.code == "FETCH_UNSUPPORTED_CONTENT_TYPE"
    assert error.value.status_code == 415


def _fetch_result(url: str, content: str = "Sample page content") -> dict:
    return {
        "url": url,
        "final_url": url,
        "mode": "text",
        "engine": "static",
        "title": "Sample",
        "content": content,
        "truncated": False,
        "length": len(content),
        "http_status": 200,
        "screenshot_png_base64": None,
        "duration_ms": 1,
    }


def _pipeline_result(status: str = "pass") -> SimpleNamespace:
    return SimpleNamespace(
        guard=SimpleNamespace(
            status=status, confidence=0.95, reason="injection detected"
        ),
        extraction=SimpleNamespace(
            chunks_total=1,
            chunks_ok=1,
            chunks_failed=0,
            items_raw=1,
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


def _enable_ai(client: TestClient) -> None:
    client.app.state.settings.ai_enabled = True
    client.app.state.settings.groq_api_key = "test-key"


def test_ai_disabled_returns_503(monkeypatch, client: TestClient) -> None:
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    response = client.get("/fetch", params={"url": "https://example.org"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "FETCH_AI_DISABLED"


def test_groq_auth_failure_maps_to_config_error(
    monkeypatch, client: TestClient
) -> None:
    from app.services.ai import AIConfigurationError

    _enable_ai(client)
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    monkeypatch.setattr(
        "app.routers.fetch._run_fetch",
        lambda options, settings: _fetch_result(options.url),
    )

    async def pipeline(*args, **kwargs):
        raise AIConfigurationError("Groq rejected the configured API credentials.")

    monkeypatch.setattr("app.routers.fetch.run_pipeline", pipeline)
    response = client.get("/fetch", params={"url": "https://example.org"})
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "FETCH_AI_CONFIG"


def test_guard_failure_stops_fetch_pipeline(monkeypatch, client: TestClient) -> None:
    from app.services.ai import AIGuardError

    _enable_ai(client)
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    monkeypatch.setattr(
        "app.routers.fetch._run_fetch",
        lambda options, settings: _fetch_result(options.url),
    )

    async def pipeline(*_args, **_kwargs):
        raise AIGuardError("The classifier is unavailable.")

    monkeypatch.setattr("app.routers.fetch.run_pipeline", pipeline)
    response = client.get("/fetch", params={"url": "https://example.org"})
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "FETCH_AI_GUARD_FAILED"


def test_include_raw_returns_scraped_text(monkeypatch, client: TestClient) -> None:
    _enable_ai(client)
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    monkeypatch.setattr(
        "app.routers.fetch._run_fetch",
        lambda options, settings: _fetch_result(options.url),
    )

    async def pipeline(*args, **kwargs):
        assert kwargs["save"] is True
        return _pipeline_result()

    monkeypatch.setattr("app.routers.fetch.run_pipeline", pipeline)
    response = client.get(
        "/fetch",
        params={"url": "https://example.org", "include_raw": "true"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["raw"] == "Sample page content"


def test_save_false_skips_snapshot(monkeypatch, client: TestClient) -> None:
    _enable_ai(client)
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    monkeypatch.setattr(
        "app.routers.fetch._run_fetch",
        lambda options, settings: _fetch_result(options.url),
    )

    async def pipeline(*args, **kwargs):
        assert kwargs["save"] is False
        return _pipeline_result()

    monkeypatch.setattr("app.routers.fetch.run_pipeline", pipeline)
    response = client.post(
        "/fetch",
        json={"url": "https://example.org", "save": False},
    )
    assert response.status_code == 200
    assert response.json()["data"]["saved"] is None


def test_guard_block_returns_403_with_ai_meta(monkeypatch, client: TestClient) -> None:
    _enable_ai(client)
    monkeypatch.setattr("app.routers.fetch.validate_fetch_url", lambda *_: None)
    monkeypatch.setattr(
        "app.routers.fetch._run_fetch",
        lambda options, settings: _fetch_result(options.url),
    )

    async def pipeline(*args, **kwargs):
        return _pipeline_result("blocked")

    monkeypatch.setattr("app.routers.fetch.run_pipeline", pipeline)
    response = client.get("/fetch", params={"url": "https://example.org"})
    assert response.status_code == 403
    payload = response.json()
    assert payload["error"]["code"] == "FETCH_AI_GUARD_BLOCKED"
    assert payload["error"]["details"]["exit_code"] == 2
    assert payload["meta"]["ai"]["guard_status"] == "blocked"
