from __future__ import annotations

from datetime import UTC, datetime
import json
import os
from pathlib import Path
import re
import tempfile
from typing import Any
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from newsid.dedupe import deduplicate
from newsid.schema import NewsItem


def local_now(timezone_name: str) -> datetime:
    try:
        timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"unknown time zone: {timezone_name}") from exc
    return datetime.now(timezone)


def output_path(
    directory: Path,
    pattern: str,
    date_text: str,
    *,
    time_text: str,
    site_name: str | None = None,
) -> Path:
    if "{date}" not in pattern:
        raise ValueError("filename pattern must contain {date}")
    safe_site_name = re.sub(r"[^a-z0-9]+", "_", (site_name or "").casefold()).strip("_")
    if "{site_name}" in pattern and not safe_site_name:
        filename = pattern.replace("_{site_name}", "")
    else:
        filename = pattern.replace("{site_name}", safe_site_name)
    filename = filename.replace("{date}", date_text).replace("{time}", time_text)
    if not filename.lower().endswith(".json"):
        filename += ".json"
    if Path(filename).name != filename:
        raise ValueError("filename pattern must not contain a directory path")
    return directory / filename


def source_site_name(source_url: str, configured_name: str | None = None) -> str:
    if configured_name and configured_name.strip():
        return configured_name
    hostname = urlsplit(source_url).hostname or "unknown"
    return hostname.removeprefix("www.")


def assemble_items(
    items: list[NewsItem],
) -> tuple[list[NewsItem], int]:
    unique, removed = deduplicate(items)

    def sort_key(item: NewsItem) -> tuple[bool, float, str, str]:
        if item.published_at is None:
            timestamp = 0.0
        else:
            published = datetime.fromisoformat(item.published_at.replace("Z", "+00:00"))
            if published.tzinfo is None:
                published = published.replace(tzinfo=UTC)
            timestamp = published.astimezone(UTC).timestamp()
        return (
            item.published_at is None,
            -timestamp,
            item.title,
            item.url,
        )

    unique.sort(key=sort_key)
    return unique, removed


def atomic_write_json(path: Path, document: dict[str, Any], *, pretty: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(
        document,
        ensure_ascii=False,
        indent=2 if pretty else None,
        separators=None if pretty else (",", ":"),
    ) + "\n"
    temporary_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary_path = temporary.name
            temporary.write(payload)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_path, path)
        temporary_path = None
    finally:
        if temporary_path is not None:
            try:
                os.unlink(temporary_path)
            except FileNotFoundError:
                pass
