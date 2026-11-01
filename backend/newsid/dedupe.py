from __future__ import annotations

from datetime import UTC, datetime

from newsid.normalize import canonicalize_url, normalized_title
from newsid.schema import NewsItem


def _fetched_at(item: NewsItem) -> datetime:
    parsed = datetime.fromisoformat(item.fetched_at.replace("Z", "+00:00"))
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)


def deduplicate(items: list[NewsItem]) -> tuple[list[NewsItem], int]:
    kept: list[NewsItem] = []
    primary: dict[str, int] = {}
    secondary: dict[tuple[str, str], int] = {}
    removed = 0

    for item in items:
        url_key = canonicalize_url(item.url)
        title_key = (item.publisher_domain.casefold(), normalized_title(item.title))
        existing_index = primary.get(url_key)
        if existing_index is None:
            existing_index = secondary.get(title_key)
        if existing_index is None:
            index = len(kept)
            kept.append(item)
            primary[url_key] = index
            secondary[title_key] = index
            continue

        removed += 1
        previous = kept[existing_index]
        if _fetched_at(item) > _fetched_at(previous):
            old_url_key = canonicalize_url(previous.url)
            old_title_key = (
                previous.publisher_domain.casefold(),
                normalized_title(previous.title),
            )
            kept[existing_index] = item
            primary.pop(old_url_key, None)
            secondary.pop(old_title_key, None)
            primary[url_key] = existing_index
            secondary[title_key] = existing_index
    return kept, removed
