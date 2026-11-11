from datetime import UTC, datetime
from pathlib import Path
import logging

import pytest

from newsid.config import SourceDefinition
from newsid.fetcher import FetchedSource
from newsid.parser import FeedParseError, parse_feed


FIXTURES = Path(__file__).parent / "fixtures"


def parsed_fixture(filename: str):
    fetched = FetchedSource(
        source=SourceDefinition("https://feeds.example/rss"),
        feed_url="https://feeds.example/rss",
        body=(FIXTURES / filename).read_bytes(),
        fetched_at=datetime(2026, 10, 19, tzinfo=UTC),
        content_type="application/rss+xml",
    )
    return parse_feed(
        fetched,
        max_items=200,
        detect_language=False,
        logger=logging.getLogger("test"),
    )[0]


def test_parses_rss_and_cleans_content():
    item = parsed_fixture("rss.xml")[0]
    assert item.title == "Example headline"
    assert item.summary == "First summary."
    assert item.content == "A longer article body from the feed."
    assert item.categories == ["economy"]
    assert item.author == "Reporter"
    assert item.date_confidence == "exact"
    assert "utm_source" in item.url


def test_parses_atom_updated_timestamp_and_tags():
    item = parsed_fixture("atom.xml")[0]
    assert item.title == "Atom headline"
    assert item.published_at == "2026-10-19T00:00:00+00:00"
    assert item.categories == ["technology"]
    assert item.date_confidence == "approx"


def test_missing_publication_date_is_unknown():
    item = parsed_fixture("missing_date.xml")[0]
    assert item.published_at is None
    assert item.date_confidence == "unknown"


def test_rejects_malformed_feed():
    fetched = FetchedSource(
        source=SourceDefinition("https://feeds.example/bad"),
        feed_url="https://feeds.example/bad",
        body=b"<rss><channel><item>",
        fetched_at=datetime.now(UTC),
        content_type="application/rss+xml",
    )
    with pytest.raises(FeedParseError):
        parse_feed(fetched, max_items=0, detect_language=False, logger=logging.getLogger("test"))
