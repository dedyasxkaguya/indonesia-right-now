from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services.news_tagging import (
    categories_for_article,
    enrich_article,
    igs_context_for_categories,
)
from newsid.schema import NewsItem, SourceRecord


def test_categories_include_two_or_three_distinct_tags() -> None:
    assert categories_for_article(
        "Pemerintah umumkan kenaikan pajak", "", ["public_announcements"]
    ) == ["pemerintahan", "ekonomi"]
    assert categories_for_article("Judul umum", None, []) == ["umum", "berita"]
    assert categories_for_article(
        "Pemerintah, ekonomi, pendidikan, dan olahraga",
        "",
        [],
    ) == ["ekonomi", "pemerintahan", "pendidikan"]


def test_igs_context_maps_supported_categories_only() -> None:
    contexts = igs_context_for_categories(
        ["ekonomi", "kesehatan", "sosial", "infrastruktur", "politik"]
    )
    assert [context.model_dump() for context in contexts] == [
        {"label": "Data Ekonomi IGS", "url": "/gov/ekonomi"},
        {"label": "Data Sosial IGS", "url": "/gov/sosial-publik"},
        {"label": "Data Infrastruktur IGS", "url": "/gov/infrastruktur"},
    ]


def test_news_endpoint_enriches_article_tags(monkeypatch, tmp_path: Path) -> None:
    now = datetime.now(UTC).isoformat()
    item = NewsItem(
        id="article-1",
        title="Inflasi ekonomi dan layanan kesehatan",
        summary="Pemerintah menyampaikan data terbaru.",
        publisher="Example",
        publisher_domain="example.org",
        url="https://example.org/article",
        published_at=now,
        date_confidence="exact",
        categories=[],
        source_url="https://example.org/feed",
        fetched_at=now,
    )
    record = SourceRecord(
        url="https://example.org/feed",
        publisher="Example",
        status="ok",
        fetched_at=now,
        items=1,
    )

    async def collect(*args, **kwargs):
        return [item], [record], 1

    monkeypatch.setattr("newsid.cli._collect", collect)
    settings = Settings(
        _env_file=None,
        ai_enabled=False,
        newsid_output_dir=tmp_path,
        ai_output_dir=tmp_path / "ai",
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/news")

    assert response.status_code == 200
    article = response.json()["data"]["items"][0]
    assert article["categories"] == ["ekonomi", "pemerintahan", "kesehatan"]
    assert article["igs_context"] == [
        {"label": "Data Ekonomi IGS", "url": "/gov/ekonomi"},
        {"label": "Data Sosial IGS", "url": "/gov/sosial-publik"},
    ]


def test_enrichment_replaces_untrusted_existing_context() -> None:
    article = enrich_article(
        {
            "title": "Banjir melanda wilayah",
            "summary": "Pemerintah menyalurkan bantuan sosial.",
            "categories": ["unexpected"],
            "igs_context": [{"label": "Spoofed", "url": "javascript:alert(1)"}],
        }
    )

    assert 2 <= len(article["categories"]) <= 3
    assert article["igs_context"] == [
        {"label": "Data Sosial IGS", "url": "/gov/sosial-publik"}
    ]
