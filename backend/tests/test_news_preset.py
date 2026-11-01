"""Tests for the default source preset and the disabled-feed warning."""

from __future__ import annotations

import logging
from pathlib import Path

import yaml

from newsid.config import load_yaml_sources

PRESET = Path(__file__).resolve().parents[1] / "presets" / "indonesia_default.yaml"


def _entries() -> list[dict]:
    return yaml.safe_load(PRESET.read_text(encoding="utf-8"))["sources"]


def test_default_preset_is_community_first() -> None:
    sources = load_yaml_sources(PRESET)
    urls = [source.url for source in sources]
    assert "https://www.reddit.com/r/indonesia/new/.rss" in urls
    assert "https://en.antaranews.com/rss/explore-indonesia.xml" in urls
    assert "https://github.com/trending.atom" in urls
    # local_organization feeds stay enabled
    assert "https://malang.moi.or.id/rss/category-id/3" in urls


def test_default_preset_has_no_enabled_government_feeds() -> None:
    sources = load_yaml_sources(PRESET)
    assert not any(".go.id" in source.url for source in sources)


def test_default_preset_keeps_government_feeds_disabled() -> None:
    disabled = {entry["url"] for entry in _entries() if entry.get("enabled") is False}
    expected_gov = {
        "https://kemkes.go.id/id/rss/article/rilis-berita",
        "https://kemkes.go.id/id/rss/media/warta-yankes",
        "https://kemenimipas.go.id/rss?view=feeds",
        "https://yogyakartakota.kemenag.go.id/category/berita/feed/",
        "https://yogyakartakota.kemenag.go.id/ppid/rss/posts",
        "https://upk.kemkes.go.id/new/feed/rss.php?cat=l",
    }
    assert expected_gov <= disabled


def test_default_preset_does_not_delete_legacy_sources() -> None:
    urls = {entry["url"] for entry in _entries()}
    legacy = {
        "https://www.antaranews.com/rss/terkini",
        "https://www.cnnindonesia.com/nasional/rss",
        "https://rss.kompas.com/",
        "https://kumparan.com/rss",
    }
    assert legacy <= urls


def test_loader_lists_disabled_feeds_in_warning(tmp_path, caplog) -> None:
    path = tmp_path / "sources.yaml"
    path.write_text(
        "sources:\n"
        "  - url: https://example.org/feed.xml\n"
        "    enabled: true\n"
        "  - url: https://kemkes.go.id/id/rss/article/rilis-berita\n"
        "    enabled: false\n"
        "  - url: https://example.org/disabled.xml\n"
        "    enabled: false\n",
        encoding="utf-8",
    )
    with caplog.at_level(logging.WARNING, logger="newsid.config"):
        sources = load_yaml_sources(path)
    assert [source.url for source in sources] == ["https://example.org/feed.xml"]
    warnings = [
        record.getMessage()
        for record in caplog.records
        if record.levelno == logging.WARNING
    ]
    assert warnings
    assert "kemkes.go.id" in warnings[-1]
    assert "example.org/disabled.xml" in warnings[-1]


def test_loader_all_preset_warning_lists_disabled_gov_feeds(caplog) -> None:
    with caplog.at_level(logging.WARNING, logger="newsid.config"):
        load_yaml_sources(PRESET)
    disabled_message = next(
        record.getMessage()
        for record in caplog.records
        if "disabled feed sources" in record.getMessage()
    )
    assert "kemkes.go.id/id/rss/article/rilis-berita" in disabled_message
