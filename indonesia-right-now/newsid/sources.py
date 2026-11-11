from __future__ import annotations

import sys
from collections.abc import Collection
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup

from newsid.config import (
    ConfigError,
    SourceDefinition,
    load_yaml_sources,
    validate_url,
)

FEED_TYPES = {"application/rss+xml", "application/atom+xml"}


def _preset_path(name: str) -> Path | None:
    if name not in {"indonesia-default", "indonesia_default"}:
        return None
    candidates = [
        Path(__file__).resolve().parent.parent / "presets" / "indonesia_default.yaml",
        Path(sys.prefix) / "share" / "newsid" / "presets" / "indonesia_default.yaml",
    ]
    return next((path for path in candidates if path.is_file()), None)


def load_sources(
    source_args: tuple[str, ...],
    preset: str | None,
    *,
    active_tiers: str | Collection[str] | None = None,
) -> list[SourceDefinition]:
    if source_args:
        sources: list[SourceDefinition] = []
        for value in source_args:
            bundled = _preset_path(value)
            path = Path(value)
            if bundled is not None:
                sources.extend(load_yaml_sources(bundled, active_tiers))
            elif path.is_file():
                sources.extend(load_yaml_sources(path, active_tiers))
            elif value.lower().endswith((".yaml", ".yml")):
                raise ConfigError(f"source config does not exist: {value}")
            else:
                sources.append(SourceDefinition(validate_url(value, "source URL")))
        return sources

    if preset:
        bundled = _preset_path(preset)
        if bundled is not None:
            return load_yaml_sources(bundled, active_tiers)
        path = Path(preset)
        if path.is_file():
            return load_yaml_sources(path, active_tiers)
        raise ConfigError(f"unknown preset or config file: {preset}")

    raise ConfigError("provide one or more sources or use --preset")


def discover_feed_link(html: bytes, page_url: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    for node in soup.find_all("link"):
        rel = node.get("rel") or []
        rel_values = rel.split() if isinstance(rel, str) else rel
        media_type = (node.get("type") or "").split(";", 1)[0].strip().lower()
        href = node.get("href")
        if (
            "alternate" not in {value.lower() for value in rel_values}
            or media_type not in FEED_TYPES
            or not href
        ):
            continue
        candidate = urljoin(page_url, href)
        try:
            parts = urlsplit(candidate)
            if parts.scheme in {"http", "https"} and parts.hostname:
                _ = parts.port
                return candidate
        except ValueError:
            continue
    return None
