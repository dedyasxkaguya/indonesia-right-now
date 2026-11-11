from datetime import UTC, datetime, timedelta

from newsid.filters import matches_filters, parse_duration
from newsid.normalize import canonicalize_url
from newsid.schema import NewsItem


def make_item(**changes):
    values = {
        "id": "0123456789abcdef",
        "title": "Economy grows",
        "url": "https://www.example.test/story?utm_campaign=x",
        "publisher": "Example News",
        "publisher_domain": "example.test",
        "date_confidence": "exact",
        "published_at": "2026-10-19T00:00:00+00:00",
        "summary": "Growth and technology",
        "categories": ["economy"],
        "source_url": "https://feeds.example/rss",
        "fetched_at": "2026-10-19T01:00:00+00:00",
    }
    values.update(changes)
    return NewsItem(**values)


def test_canonical_url_removes_tracking_and_sorts_query():
    assert canonicalize_url(
        "HTTPS://Example.test/path?z=2&utm_source=x&a=1#part"
    ) == "https://example.test/path?a=1&z=2"


def test_duration_and_filters():
    now = datetime(2026, 10, 19, 1, tzinfo=UTC)
    item = make_item()
    assert parse_duration("6h") == timedelta(hours=6)
    assert matches_filters(
        item,
        since=timedelta(hours=24),
        until=None,
        categories=["economy"],
        publishers=["example"],
        keywords=["grows"],
        excludes=["election"],
        now=now,
    )
    assert not matches_filters(
        item,
        since=timedelta(hours=24),
        until=None,
        categories=["sports"],
        publishers=[],
        keywords=[],
        excludes=[],
        now=now,
    )
    assert not matches_filters(
        item.model_copy(update={"title": "Election result"}),
        since=timedelta(hours=24),
        until=None,
        categories=[],
        publishers=[],
        keywords=[],
        excludes=["election"],
        now=now,
    )


def test_unknown_dates_are_kept_unless_strict():
    item = make_item(published_at=None, date_confidence="unknown")
    options = dict(
        since=timedelta(days=1),
        until=None,
        categories=[],
        publishers=[],
        keywords=[],
        excludes=[],
        now=datetime(2026, 10, 19, tzinfo=UTC),
    )
    assert matches_filters(item, **options)
    assert not matches_filters(item, **options, strict_dates=True)
