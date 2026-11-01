from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml

logger = logging.getLogger(__name__)


class ConfigError(ValueError):
    """Raised when a source list or a source URL is invalid."""


@dataclass(frozen=True)
class SourceDefinition:
    url: str
    name: str | None = None
    category: str | None = None


def validate_url(url: Any, label: str) -> str:
    if not isinstance(url, str):
        raise ConfigError(f"{label} must be a URL string")
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ConfigError(f"{label} must be an http(s) URL: {url!r}")
    try:
        parsed.port
    except ValueError as exc:
        raise ConfigError(f"{label} has an invalid port: {url!r}") from exc
    return url.strip()


def _parse_config(data: Any, origin: str) -> list[SourceDefinition]:
    entries = data.get("sources") if isinstance(data, dict) else data
    if not isinstance(entries, list):
        raise ConfigError(f"{origin} must contain a list of sources")

    result: list[SourceDefinition] = []
    disabled_urls: list[str] = []
    for index, entry in enumerate(entries, start=1):
        if not isinstance(entry, dict):
            raise ConfigError(f"{origin} source {index} must be a mapping")
        if entry.get("enabled", True) is False:
            url = entry.get("url")
            if isinstance(url, str) and url.strip():
                disabled_urls.append(url.strip())
            continue
        url = validate_url(entry.get("url"), f"{origin} source {index} URL")
        name = entry.get("name")
        category = entry.get("category")
        if name is not None and not isinstance(name, str):
            raise ConfigError(f"{origin} source {index} name must be a string")
        if category is not None and not isinstance(category, str):
            raise ConfigError(f"{origin} source {index} category must be a string")
        result.append(SourceDefinition(url, name, category))
    if not result:
        raise ConfigError(f"{origin} contains no enabled sources")
    if disabled_urls:
        logger.warning(
            "disabled feed sources in %s (%d): %s",
            origin,
            len(disabled_urls),
            ", ".join(disabled_urls),
        )
    return result


def load_yaml_sources(path: Path) -> list[SourceDefinition]:
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ConfigError(f"cannot read source config {path}: {exc}") from exc
    except yaml.YAMLError as exc:
        raise ConfigError(f"invalid YAML in {path}: {exc}") from exc
    return _parse_config(data, str(path))
