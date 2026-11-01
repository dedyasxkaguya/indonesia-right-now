import json
import re
from datetime import UTC, datetime, timedelta, timezone
from email.utils import format_datetime
from pathlib import Path

import httpx
import pytest
import respx
from click.testing import CliRunner

import newsid.cli as cli_module
from newsid.cli import cli


@pytest.fixture(autouse=True)
def allow_mocked_test_hosts(monkeypatch):
    monkeypatch.setattr(
        "newsid.fetcher.validate_public_url", lambda *_args, **_kwargs: None
    )


def rss(title: str, slug: str) -> str:
    published = format_datetime(datetime.now(UTC))
    return f"""<?xml version="1.0"?>
    <rss version="2.0"><channel><title>Example publisher</title>
      <item><title>{title}</title><link>https://news.{slug}.test/story</link>
      <pubDate>{published}</pubDate><description>Current summary</description></item>
    </channel></rss>"""


def set_robots(mock: respx.Router, host: str) -> None:
    mock.get(f"https://{host}/robots.txt").mock(return_value=httpx.Response(404))


def install_two_feeds(mock: respx.Router) -> list[str]:
    urls = ["https://one.test/feed.xml", "https://two.test/feed.xml"]
    set_robots(mock, "one.test")
    set_robots(mock, "two.test")
    mock.get(urls[0]).mock(
        return_value=httpx.Response(200, text=rss("First story", "one"))
    )
    mock.get(urls[1]).mock(
        return_value=httpx.Response(200, text=rss("Second story", "two"))
    )
    return urls


def invoke(output: Path, urls: list[str], *extra: str):
    return CliRunner().invoke(
        cli,
        [*urls, "--output", str(output), "--request-delay", "0", "--pretty", *extra],
    )


@respx.mock
def test_multiple_sources_use_timestamped_name_and_each_run_writes_new_file(
    tmp_path, monkeypatch
):
    urls = install_two_feeds(respx)
    run_time = datetime(2026, 10, 19, 10, 0, tzinfo=timezone(timedelta(hours=7)))
    times = iter([run_time, run_time + timedelta(seconds=1)])
    monkeypatch.setattr(cli_module, "local_now", lambda _timezone: next(times))
    result = invoke(tmp_path, urls)
    assert result.exit_code == 0, result.output
    files = list(tmp_path.glob("news_indonesia_*.json"))
    assert len(files) == 1
    assert files[0].name == "news_indonesia_2026-10-19_100000.json"
    document = json.loads(files[0].read_text(encoding="utf-8"))
    assert document["stats"]["sources_ok"] == 2
    assert len(document["items"]) == 2

    again = invoke(tmp_path, urls)
    assert again.exit_code == 0, again.output
    files = list(tmp_path.glob("news_indonesia_*.json"))
    assert len(files) == 2
    assert {file.name for file in files} == {
        "news_indonesia_2026-10-19_100000.json",
        "news_indonesia_2026-10-19_100001.json",
    }
    document = json.loads(files[1].read_text(encoding="utf-8"))
    assert len(document["items"]) == 2


@respx.mock
def test_single_source_name_uses_site_segment(tmp_path, monkeypatch):
    urls = ["https://one.test/feed.xml"]
    set_robots(respx, "one.test")
    respx.get(urls[0]).mock(
        return_value=httpx.Response(200, text=rss("First story", "one"))
    )
    monkeypatch.setattr(
        cli_module,
        "local_now",
        lambda _timezone: datetime(
            2026, 10, 19, 10, 0, 1, tzinfo=timezone(timedelta(hours=7))
        ),
    )
    result = invoke(tmp_path, urls)
    assert result.exit_code == 0, result.output
    assert [file.name for file in tmp_path.glob("*.json")] == [
        "news_indonesia_one_test_2026-10-19_100001.json"
    ]


@respx.mock
def test_same_second_run_gets_subsecond_suffix_instead_of_overwriting(
    tmp_path, monkeypatch
):
    urls = ["https://one.test/feed.xml"]
    set_robots(respx, "one.test")
    respx.get(urls[0]).mock(
        return_value=httpx.Response(200, text=rss("First story", "one"))
    )
    monkeypatch.setattr(
        cli_module,
        "local_now",
        lambda _timezone: datetime(
            2026, 10, 19, 10, 0, 1, tzinfo=timezone(timedelta(hours=7))
        ),
    )
    assert invoke(tmp_path, urls).exit_code == 0
    assert invoke(tmp_path, urls).exit_code == 0
    names = {file.name for file in tmp_path.glob("*.json")}
    assert names == {
        "news_indonesia_one_test_2026-10-19_100001.json",
        "news_indonesia_one_test_2026-10-19_100001000001.json",
    }


@respx.mock
def test_timestamp_writes_separate_suffixed_file(tmp_path):
    urls = install_two_feeds(respx)
    result = invoke(tmp_path, urls, "--timestamp")
    assert result.exit_code == 0, result.output
    files = list(tmp_path.glob("news_indonesia_*.json"))
    assert len(files) == 1
    assert re.search(r"_\d{6}\.json$", files[0].name)


@respx.mock
def test_html_feed_autodiscovery(tmp_path):
    page = "https://discover.test/news"
    feed = "https://discover.test/rss.xml"
    set_robots(respx, "discover.test")
    respx.get(page).mock(
        return_value=httpx.Response(
            200,
            text='<html><head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head></html>',
            headers={"Content-Type": "text/html"},
        )
    )
    respx.get(feed).mock(
        return_value=httpx.Response(200, text=rss("Discovered story", "discover"))
    )
    result = invoke(tmp_path, [page])
    assert result.exit_code == 0, result.output
    document = json.loads(
        next(tmp_path.glob("news_indonesia_*.json")).read_text(encoding="utf-8")
    )
    assert document["sources"][0]["status"] == "ok"
    assert document["items"][0]["source_url"] == feed


@respx.mock
def test_one_broken_feed_is_recorded_without_aborting(tmp_path):
    urls = install_two_feeds(respx)
    respx.get(urls[1]).mock(return_value=httpx.Response(503))
    result = invoke(tmp_path, urls, "--retries", "0")
    assert result.exit_code == 0, result.output
    document = json.loads(
        next(tmp_path.glob("news_indonesia_*.json")).read_text(encoding="utf-8")
    )
    assert document["stats"]["sources_ok"] == 1
    assert document["stats"]["sources_failed"] == 1
    failed = next(
        source for source in document["sources"] if source["status"] == "error"
    )
    assert failed["error"]["code"] == "http_error"


@respx.mock
def test_no_items_after_filter_writes_empty_file_and_returns_four(tmp_path):
    urls = install_two_feeds(respx)
    result = invoke(tmp_path, urls, "--keyword", "not-present")
    assert result.exit_code == 4, result.output
    document = json.loads(
        next(tmp_path.glob("news_indonesia_*.json")).read_text(encoding="utf-8")
    )
    assert document["items"] == []


@respx.mock
def test_dry_run_does_not_write_file(tmp_path):
    urls = install_two_feeds(respx)
    result = invoke(tmp_path, urls, "--dry-run")
    assert result.exit_code == 0, result.output
    assert list(tmp_path.glob("*.json")) == []
