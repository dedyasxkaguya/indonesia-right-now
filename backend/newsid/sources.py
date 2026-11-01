from __future__ import annotations

from pathlib import Path
import sys
from urllib.parse import urljoin, urlsplit

from selectolax.parser import HTMLParser

from newsid.config import ConfigError, SourceDefinition, load_yaml_sources, validate_url


FEED_TYPES = {"application/rss+xml", "application/atom+xml"}


def _preset_path(name: str) -> Path | None:
    if name not in {"indonesia-default", "indonesia_default"}:
        return None
    candidates = [
        Path(__file__).resolve().parent.parent / "presets" / "indonesia_default.yaml",
        Path(sys.prefix) / "share" / "newsid" / "presets" / "indonesia_default.yaml",
    ]
    return next((path for path in candidates if path.is_file()), None)


def load_sources(source_args: tuple[str, ...], preset: str | None) -> list[SourceDefinition]:
    if source_args:
        sources: list[SourceDefinition] = []
        for value in source_args:
            bundled = _preset_path(value)
            path = Path(value)
            if bundled is not None:
                sources.extend(load_yaml_sources(bundled))
            elif path.is_file():
                sources.extend(load_yaml_sources(path))
            elif value.lower().endswith((".yaml", ".yml")):
                raise ConfigError(f"source config does not exist: {value}")
            else:
                sources.append(SourceDefinition(validate_url(value, "source URL")))
        return sources

    if preset:
        bundled = _preset_path(preset)
        if bundled is not None:
            return load_yaml_sources(bundled)
        path = Path(preset)
        if path.is_file():
            return load_yaml_sources(path)
        raise ConfigError(f"unknown preset or config file: {preset}")

    raise ConfigError("provide one or more sources or use --preset")


def discover_feed_link(html: bytes, page_url: str) -> str | None:
    tree = HTMLParser(html)
    for node in tree.css("link"):
        rel = (node.attributes.get("rel") or "").lower().split()
        media_type = (node.attributes.get("type") or "").split(";", 1)[0].strip().lower()
        href = node.attributes.get("href")
        if "alternate" not in rel or media_type not in FEED_TYPES or not href:
            continue
        candidate = urljoin(page_url, href)
        try:
            parts = urlsplit(candidate)
            if parts.scheme in {"http", "https"} and parts.hostname:
                parts.port
                return candidate
        except ValueError:
            continue
    return None
