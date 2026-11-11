from newsid.normalize import clean_text
from newsid.sources import discover_feed_link


def test_discover_feed_link_resolves_relative_rss_url() -> None:
    html = (
        b'<html><head><link rel="stylesheet alternate" '
        b'type="application/rss+xml; charset=utf-8" href="/feeds/news.xml">'
        b"</head></html>"
    )

    assert (
        discover_feed_link(html, "https://example.org/news")
        == "https://example.org/feeds/news.xml"
    )


def test_discover_feed_link_skips_invalid_candidate() -> None:
    html = (
        b'<link rel="alternate" type="application/rss+xml" '
        b'href="https://example.org:invalid/feed.xml">'
        b'<link rel="alternate" type="application/atom+xml" href="/atom.xml">'
    )

    assert discover_feed_link(html, "https://example.org/news") == (
        "https://example.org/atom.xml"
    )


def test_clean_text_strips_markup_and_normalizes_punctuation() -> None:
    assert clean_text(
        "<p>  Hello <strong>world</strong> ! &amp; welcome. </p>"
    ) == "Hello world! & welcome."


def test_clean_text_handles_none_and_plain_text() -> None:
    assert clean_text(None) == ""
    assert clean_text("plain   text") == "plain text"
