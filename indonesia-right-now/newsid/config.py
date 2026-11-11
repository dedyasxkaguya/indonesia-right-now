from __future__ import annotations

import logging
import os
from collections.abc import Collection
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml

logger = logging.getLogger(__name__)
SOURCE_TIERS = frozenset({"legal", "gray", "blacklist"})


class ConfigError(ValueError):
    """Raised when a source list or a source URL is invalid."""


@dataclass(frozen=True)
class SourceDefinition:
    url: str
    name: str | None = None
    category: str | None = None
    tier: str = "legal"
    enabled: bool = True
    disabled_reason: str | None = None
    notes: str | None = None


def parse_active_tiers(
    value: str | Collection[str] | None = None,
) -> frozenset[str]:
    if value is None:
        value = os.environ.get("NEWSID_ACTIVE_TIERS", "legal")
    values = value.split(",") if isinstance(value, str) else value
    tiers = frozenset(tier.strip().casefold() for tier in values if tier.strip())
    if not tiers:
        raise ConfigError("NEWSID_ACTIVE_TIERS must include at least one tier")
    unknown = tiers - SOURCE_TIERS
    if unknown:
        raise ConfigError(
            "NEWSID_ACTIVE_TIERS contains unknown tier(s): "
            + ", ".join(sorted(unknown))
        )
    return tiers


def validate_url(url: Any, label: str) -> str:
    if not isinstance(url, str):
        raise ConfigError(f"{label} must be a URL string")
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ConfigError(f"{label} must be an http(s) URL: {url!r}")
    try:
        _ = parsed.port
    except ValueError as exc:
        raise ConfigError(f"{label} has an invalid port: {url!r}") from exc
    return url.strip()


def _parse_config(data: Any, origin: str) -> list[SourceDefinition]:
    entries = data.get("sources") if isinstance(data, dict) else data
    if not isinstance(entries, list):
        raise ConfigError(f"{origin} must contain a list of sources")

    result: list[SourceDefinition] = []
    for index, entry in enumerate(entries, start=1):
        if not isinstance(entry, dict):
            raise ConfigError(f"{origin} source {index} must be a mapping")
        url = validate_url(entry.get("url"), f"{origin} source {index} URL")
        name = entry.get("name")
        category = entry.get("category")
        tier = entry.get("tier", "legal")
        enabled = entry.get("enabled", True)
        disabled_reason = entry.get("disabled_reason")
        notes = entry.get("notes")
        if name is not None and not isinstance(name, str):
            raise ConfigError(f"{origin} source {index} name must be a string")
        if category is not None and not isinstance(category, str):
            raise ConfigError(f"{origin} source {index} category must be a string")
        if not isinstance(tier, str) or tier.casefold() not in SOURCE_TIERS:
            raise ConfigError(
                f"{origin} source {index} tier must be one of "
                f"{', '.join(sorted(SOURCE_TIERS))}"
            )
        if not isinstance(enabled, bool):
            raise ConfigError(f"{origin} source {index} enabled must be a boolean")
        if disabled_reason is not None and not isinstance(disabled_reason, str):
            raise ConfigError(
                f"{origin} source {index} disabled_reason must be a string"
            )
        if notes is not None and not isinstance(notes, str):
            raise ConfigError(f"{origin} source {index} notes must be a string")
        result.append(
            SourceDefinition(
                url=url,
                name=name,
                category=category,
                tier=tier.casefold(),
                enabled=enabled,
                disabled_reason=disabled_reason,
                notes=notes,
            )
        )
    return result


def select_sources(
    entries: list[SourceDefinition],
    origin: str = "sources",
    active_tiers: str | Collection[str] | None = None,
) -> list[SourceDefinition]:
    selected_tiers = parse_active_tiers(active_tiers)
    result: list[SourceDefinition] = []
    disabled: list[SourceDefinition] = []
    for source in entries:
        selected = source.tier in selected_tiers and source.tier != "blacklist"
        # Gray-tier sources are opt-in through NEWSID_ACTIVE_TIERS; their
        # stored enabled=false flag keeps them out of the default legal tier.
        if selected and (source.enabled or source.tier == "gray"):
            result.append(source)
        else:
            disabled.append(source)

    active_counts = {
        tier: sum(source.tier == tier for source in result)
        for tier in sorted(SOURCE_TIERS)
    }
    logger.info(
        "source tiers loaded from %s (active_tiers=%s; legal=%d gray=%d blacklist=%d)",
        origin,
        ",".join(sorted(selected_tiers)),
        active_counts["legal"],
        active_counts["gray"],
        active_counts["blacklist"],
    )
    if disabled:
        grouped_counts = {
            tier: sum(source.tier == tier for source in disabled)
            for tier in sorted(SOURCE_TIERS)
        }
        logger.warning(
            "disabled feed sources in %s (%d; legal=%d gray=%d blacklist=%d): %s",
            origin,
            len(disabled),
            grouped_counts["legal"],
            grouped_counts["gray"],
            grouped_counts["blacklist"],
            ", ".join(source.url for source in disabled),
        )
    if not result:
        raise ConfigError(f"{origin} contains no sources in active tiers")
    return result


def _read_yaml(path: Path) -> Any:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ConfigError(f"cannot read source config {path}: {exc}") from exc
    except yaml.YAMLError as exc:
        raise ConfigError(f"invalid YAML in {path}: {exc}") from exc


def load_yaml_entries(path: Path) -> list[SourceDefinition]:
    return _parse_config(_read_yaml(path), str(path))


def load_yaml_sources(
    path: Path,
    active_tiers: str | Collection[str] | None = None,
) -> list[SourceDefinition]:
    entries = load_yaml_entries(path)
    return select_sources(entries, str(path), active_tiers)
