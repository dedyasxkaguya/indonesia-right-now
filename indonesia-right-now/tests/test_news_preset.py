"""Tests for the default source preset and the disabled-feed warning."""

from __future__ import annotations

import logging
from pathlib import Path

import pytest
import yaml

from app.config import Settings
from newsid.config import ConfigError, load_yaml_entries, load_yaml_sources

PRESET = Path(__file__).resolve().parents[1] / "presets" / "indonesia_default.yaml"
EXPECTED_FEEDS = [
    "https://www.antaranews.com/rss/terkini",
    "https://www.antaranews.com/rss/top-news",
    "https://www.antaranews.com/rss/ekonomi",
    "https://www.cnnindonesia.com/nasional/rss",
    "https://www.cnnindonesia.com/ekonomi/rss",
    "https://www.cnbcindonesia.com/news/rss",
    "https://rss.tempo.co/nasional",
    "https://rss.tempo.co/bisnis",
    "https://feed.liputan6.com/rss/news",
    "https://lapi.kumparan.com/v2.0/rss/",
    "https://tirto.id/sitemap/r/google-discover",
    "https://katadata.co.id/rss",
    "https://www.suara.com/rss/news",
    "https://www.republika.co.id/rss",
    "https://rss.kontan.co.id/news/nasional",
]


def _entries() -> list[dict]:
    return yaml.safe_load(PRESET.read_text(encoding="utf-8"))["sources"]


def test_default_preset_contains_only_requested_indonesian_feeds() -> None:
    sources = load_yaml_sources(PRESET)
    urls = [source.url for source in sources]
    assert urls == EXPECTED_FEEDS
    assert all(source.tier == "legal" and source.enabled for source in sources)
    assert not any("en.antaranews.com" in url or "github.com" in url for url in urls)


def test_legal_is_default_and_gray_is_opt_in() -> None:
    legal = load_yaml_sources(PRESET, active_tiers="legal")
    legal_urls = [source.url for source in legal]
    assert legal_urls == EXPECTED_FEEDS

    gray_enabled = load_yaml_sources(PRESET, active_tiers="legal,gray")
    assert [source.url for source in gray_enabled] == EXPECTED_FEEDS


def test_blacklist_never_loads_even_when_requested() -> None:
    sources = load_yaml_sources(
        PRESET,
        active_tiers="legal,gray,blacklist",
    )
    urls = {source.url for source in sources}
    assert "https://kemkes.go.id/id/rss/article/rilis-berita" not in urls


def test_active_tier_setting_normalizes_and_reaches_loader(monkeypatch) -> None:
    settings = Settings(_env_file=None, newsid_active_tiers="legal,GRAY")
    assert settings.active_newsid_tiers == frozenset({"legal", "gray"})

    monkeypatch.setenv("NEWSID_ACTIVE_TIERS", "legal,gray")
    urls = {source.url for source in load_yaml_sources(PRESET)}
    assert urls == set(EXPECTED_FEEDS)


def test_every_stored_disabled_source_has_a_reason() -> None:
    raw_entries = _entries()
    assert all("tier" in entry for entry in raw_entries)
    assert all(
        entry.get("enabled", True) or entry.get("disabled_reason")
        for entry in raw_entries
    )
    entries = load_yaml_entries(PRESET)
    assert all(
        source.tier in {"legal", "gray", "blacklist"}
        and (source.enabled or source.disabled_reason)
        for source in entries
    )


def test_active_tiers_reject_empty_or_unknown_values() -> None:
    with pytest.raises(ConfigError, match="at least one tier"):
        load_yaml_sources(PRESET, active_tiers="")
    with pytest.raises(ConfigError, match="unknown tier"):
        load_yaml_sources(PRESET, active_tiers="legal,unknown")


def test_default_preset_has_no_enabled_government_feeds() -> None:
    sources = load_yaml_sources(PRESET)
    assert not any(".go.id" in source.url for source in sources)


def test_default_preset_has_no_disabled_or_government_feeds() -> None:
    entries = _entries()
    assert all(entry["enabled"] for entry in entries)
    assert not any(".go.id" in entry["url"] for entry in entries)


def test_default_preset_excludes_old_international_and_english_sources() -> None:
    urls = {entry["url"] for entry in _entries()}
    assert not any(
        "en.antaranews.com" in url
        or "github.com/trending" in url
        or "rss.kompas.com" in url
        for url in urls
    )


def test_loader_lists_disabled_feeds_in_warning(tmp_path, caplog, monkeypatch) -> None:
    monkeypatch.setattr(logging.getLogger("newsid"), "propagate", True)
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
    assert "legal=2" in warnings[-1]
    assert "kemkes.go.id" in warnings[-1]
    assert "example.org/disabled.xml" in warnings[-1]


def test_loader_has_no_disabled_feed_warning(caplog, monkeypatch) -> None:
    monkeypatch.setattr(logging.getLogger("newsid"), "propagate", True)
    with caplog.at_level(logging.WARNING, logger="newsid.config"):
        load_yaml_sources(PRESET)
    assert not any(
        "disabled feed sources" in record.getMessage()
        for record in caplog.records
    )
