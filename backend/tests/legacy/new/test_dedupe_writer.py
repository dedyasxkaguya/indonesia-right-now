from newsid.dedupe import deduplicate
from newsid.schema import NewsItem
from newsid.writer import assemble_items, output_path
from pathlib import Path


def item(
    *,
    url: str,
    title: str,
    published_at: str | None,
    fetched_at: str,
) -> NewsItem:
    return NewsItem(
        id=url[-16:].ljust(16, "0"),
        title=title,
        url=url,
        publisher="Example",
        publisher_domain="example.test",
        published_at=published_at,
        date_confidence="unknown" if published_at is None else "exact",
        summary="",
        categories=[],
        source_url="https://feeds.example/rss",
        fetched_at=fetched_at,
    )


def test_secondary_dedupe_keeps_newer_fetch():
    earlier = item(
        url="https://example.test/short/1",
        title="Same   headline",
        published_at="2026-10-19T00:00:00+00:00",
        fetched_at="2026-10-19T01:00:00+00:00",
    )
    later = item(
        url="https://example.test/story/1",
        title="Same headline",
        published_at="2026-10-19T00:00:00+00:00",
        fetched_at="2026-10-19T02:00:00+00:00",
    )
    kept, removed = deduplicate([earlier, later])
    assert removed == 1
    assert kept == [later]


def test_writer_sort_is_stable_for_dates_and_undated_items():
    older = item(
        url="https://example.test/older",
        title="Older",
        published_at="2026-10-18T00:00:00+00:00",
        fetched_at="2026-10-19T02:00:00+00:00",
    )
    newer = item(
        url="https://example.test/newer",
        title="Newer",
        published_at="2026-10-19T00:00:00+00:00",
        fetched_at="2026-10-19T02:00:00+00:00",
    )
    undated = item(
        url="https://example.test/undated",
        title="Undated",
        published_at=None,
        fetched_at="2026-10-19T02:00:00+00:00",
    )
    sorted_items, _ = assemble_items([older, undated, newer])
    assert sorted_items == [newer, older, undated]


def test_filename_extension_and_timestamp():
    path = output_path(
        Path("output"),
        "news_indonesia_{site_name}_{date}_{time}",
        "2026-10-19",
        time_text="123456",
        site_name="CNN Indonesia",
    )
    assert path.name == "news_indonesia_cnn_indonesia_2026-10-19_123456.json"


def test_filename_omits_site_for_multiple_sources():
    path = output_path(
        Path("output"),
        "news_indonesia_{site_name}_{date}_{time}",
        "2026-10-19",
        time_text="123456",
    )
    assert path.name == "news_indonesia_2026-10-19_123456.json"


def test_filename_uses_host_when_source_name_is_missing():
    from newsid.writer import source_site_name

    site_name = source_site_name("https://www.cnnindonesia.com/news")
    path = output_path(
        Path("output"),
        "news_indonesia_{site_name}_{date}_{time}",
        "2026-10-19",
        time_text="123456",
        site_name=site_name,
    )
    assert path.name == "news_indonesia_cnnindonesia_com_2026-10-19_123456.json"
