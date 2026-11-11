import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.routers import news


def _article(
    article_id: str, publisher: str, domain: str, title: str
) -> dict[str, str | None]:
    return {
        "id": article_id,
        "title": title,
        "summary": f"Summary of {title}",
        "publisher": publisher,
        "publisher_domain": domain,
        "url": f"https://{domain}/story",
        "published_at": "2026-11-09T12:00:00+00:00",
    }


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        ai_enabled=True,
        groq_api_key="test-key",
        ai_output_dir=tmp_path / "ai",
        newsid_output_dir=tmp_path,
    )


def test_trending_returns_canonical_sources_and_caches(
    monkeypatch, tmp_path: Path
) -> None:
    raw_items = [
        _article("one", "Publisher One", "one.example", "Ekonomi nasional"),
        _article("two", "Publisher Two", "two.example", "Proyek infrastruktur"),
    ]
    collection_calls = 0
    model_calls = 0

    async def collect(options, settings, rate_limiter):
        nonlocal collection_calls
        collection_calls += 1
        assert options.since == "7d"
        assert options.strict_dates is True
        assert options.dry_run is True
        return {"items": raw_items}

    async def model_call(**kwargs):
        nonlocal model_calls
        model_calls += 1
        assert kwargs["max_tokens"] == 1024
        return (
            json.dumps({"clusters": [["one", "two"]]}),
            12,
        )

    monkeypatch.setattr(news, "_run_news", collect, raising=False)
    monkeypatch.setattr("app.services.trending._call_model", model_call)
    with TestClient(create_app(_settings(tmp_path))) as client:
        first = client.get("/news/trending")
        second = client.get("/news/trending")

    assert first.status_code == second.status_code == 200
    data = first.json()["data"]
    assert first.json()["ok"] is True
    assert data["window"] == "7d"
    assert data["super_articles"][0]["article_count"] == 2
    assert data["super_articles"][0]["categories"] == ["ekonomi", "infrastruktur"]
    assert data["super_articles"][0]["igs_context"] == [
        {"label": "Data Ekonomi IGS", "url": "/gov/ekonomi"},
        {"label": "Data Infrastruktur IGS", "url": "/gov/infrastruktur"},
    ]
    assert data["super_articles"][0]["sources"] == [
        {
            "publisher": "Publisher One",
            "title": "Ekonomi nasional",
            "url": "https://one.example/story",
            "published_at": "2026-11-09T12:00:00+00:00",
            "categories": ["ekonomi", "umum"],
            "igs_context": [{"label": "Data Ekonomi IGS", "url": "/gov/ekonomi"}],
        },
        {
            "publisher": "Publisher Two",
            "title": "Proyek infrastruktur",
            "url": "https://two.example/story",
            "published_at": "2026-11-09T12:00:00+00:00",
            "categories": ["infrastruktur", "umum"],
            "igs_context": [
                {
                    "label": "Data Infrastruktur IGS",
                    "url": "/gov/infrastruktur",
                }
            ],
        },
    ]
    assert second.json()["data"] == data
    assert collection_calls == model_calls == 1


def test_trending_accepts_grouped_articles_from_one_publisher(
    monkeypatch, tmp_path: Path
) -> None:
    raw_items = [
        _article("one", "Publisher One", "one.example", "Story one"),
        _article("two", "Publisher One", "one.example", "Story two"),
    ]

    async def collect(options, settings, rate_limiter):
        return {"items": raw_items}

    async def model_call(**kwargs):
        return (
            json.dumps({"clusters": [["one", "two"]]}),
            12,
        )

    monkeypatch.setattr(news, "_run_news", collect, raising=False)
    monkeypatch.setattr("app.services.trending._call_model", model_call)
    with TestClient(create_app(_settings(tmp_path))) as client:
        response = client.get("/news/trending")

    assert response.status_code == 200
    cluster = response.json()["data"]["super_articles"][0]
    assert cluster["article_count"] == 2
    assert len(cluster["sources"]) == 2


def test_trending_accepts_single_article_cluster() -> None:
    from app.schemas.trending import TrendingClusterEnvelope
    from app.services.trending import _to_response

    item = {
        **_article("single", "Publisher One", "one.example", "Story one"),
        "categories": ["economy"],
    }
    clusters = TrendingClusterEnvelope.model_validate({"clusters": [["single"]]})

    response = _to_response(clusters, {"single": item})

    assert len(response.super_articles) == 1
    assert response.super_articles[0].article_count == 1
    assert response.super_articles[0].sources[0].publisher == "Publisher One"
    assert response.super_articles[0].sources[0].title == "Story one"
    assert response.super_articles[0].sources[0].url == "https://one.example/story"


def test_trending_prompt_requests_singletons_and_article_coverage() -> None:
    from app.services.trending import SYSTEM_PROMPT

    assert "standalone SuperArticle" in SYSTEM_PROMPT
    assert "Return only groups containing at least two" in SYSTEM_PROMPT


def test_unassigned_articles_are_added_as_singletons() -> None:
    from app.schemas.trending import TrendingClusterEnvelope
    from app.services.trending import _to_response

    items = {
        "grouped": _article("grouped", "Publisher One", "one.example", "Group story"),
        "unassigned": _article(
            "unassigned", "Publisher Two", "two.example", "Standalone story"
        ),
    }
    clusters = TrendingClusterEnvelope.model_validate(
        {"clusters": [["grouped"], ["unknown"]]}
    )

    result = _to_response(clusters, items)

    assert [cluster.sources[0].title for cluster in result.super_articles] == [
        "Group story",
        "Standalone story",
    ]


def test_empty_model_groups_produce_singleton_super_articles() -> None:
    from app.schemas.trending import TrendingClusterEnvelope
    from app.services.trending import _to_response

    items = {
        "first": _article("first", "Publisher One", "one.example", "First"),
        "second": _article("second", "Publisher Two", "two.example", "Second"),
    }

    result = _to_response(TrendingClusterEnvelope(clusters=[]), items)

    assert len(result.super_articles) == 2
    assert [cluster.article_count for cluster in result.super_articles] == [1, 1]


def test_trending_model_input_is_bounded(monkeypatch, tmp_path: Path) -> None:
    from app.services.trending import _article_inputs

    articles, _ = _article_inputs(
        [
            {
                **_article("one", "Publisher One", "one.example", "Story one"),
                "summary": "x" * 1000,
            }
        ]
    )

    assert len(articles[0]["title"]) <= 140
    assert len(articles[0]["summary"]) <= 80
    assert "publisher_domain" not in articles[0]


def test_trending_batches_articles_and_includes_every_source(
    monkeypatch, tmp_path: Path
) -> None:
    from app.services import trending

    items = [
        _article(
            str(index),
            f"Publisher {index}",
            f"publisher-{index}.example",
            f"Story {index}",
        )
        for index in range(23)
    ]
    batch_sizes: list[int] = []

    async def model_call(*, messages, **kwargs):
        batch = json.loads(messages[-1]["content"].split(":\n", 1)[1])
        batch_sizes.append(len(batch))
        return json.dumps({"clusters": []}), 10

    monkeypatch.setattr(trending, "_call_model", model_call)
    import asyncio

    result = asyncio.run(trending.generate_trending(items, _settings(tmp_path)))

    assert batch_sizes == [10, 10, 3]
    assert len(result.super_articles) == len(items)
    assert sum(cluster.article_count for cluster in result.super_articles) == len(items)
    assert [cluster.sources[0].publisher for cluster in result.super_articles] == [
        f"Publisher {index}" for index in range(len(items))
    ]


def test_trending_requires_ai_to_be_enabled(tmp_path: Path) -> None:
    settings = Settings(
        _env_file=None,
        ai_enabled=False,
        newsid_output_dir=tmp_path,
        ai_output_dir=tmp_path / "ai",
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/news/trending")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AI_DISABLED"
