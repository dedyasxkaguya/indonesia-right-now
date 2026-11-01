from __future__ import annotations

from datetime import UTC, datetime, timedelta
import re
from typing import Iterable

from newsid.schema import NewsItem


_DURATION = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*([smhd])\s*$", re.IGNORECASE)


class FilterError(ValueError):
    """Raised when a date filter cannot be parsed."""


def parse_duration(value: str) -> timedelta:
    match = _DURATION.fullmatch(value)
    if not match:
        raise FilterError("duration must be a number followed by s, m, h, or d")
    amount = float(match.group(1))
    unit = match.group(2).lower()
    factor = {"s": 1, "m": 60, "h": 3600, "d": 86400}[unit]
    try:
        return timedelta(seconds=amount * factor)
    except OverflowError as exc:
        raise FilterError("duration is too large") from exc


def parse_timestamp(value: str | None) -> datetime | None:
    if value is None:
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError as exc:
        raise FilterError(f"invalid timestamp {value!r}; use ISO-8601") from exc
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)


def comma_values(values: str | None) -> list[str]:
    if not values:
        return []
    return [value.strip() for value in values.split(",") if value.strip()]


def matches_filters(
    item: NewsItem,
    *,
    since: timedelta,
    until: datetime | None,
    categories: Iterable[str],
    publishers: Iterable[str],
    keywords: Iterable[str],
    excludes: Iterable[str],
    now: datetime,
    strict_dates: bool = False,
) -> bool:
    published = parse_timestamp(item.published_at)
    if published is None:
        if strict_dates:
            return False
    elif published < now - since or (until is not None and published >= until):
        return False

    category_terms = {term.casefold() for term in categories}
    if category_terms and not category_terms.intersection(
        category.casefold() for category in item.categories
    ):
        return False

    publisher_terms = [term.casefold() for term in publishers]
    if publisher_terms and not any(
        term in item.publisher.casefold() or term in item.publisher_domain.casefold()
        for term in publisher_terms
    ):
        return False

    text = f"{item.title} {item.summary}".casefold()
    if keywords and not any(term.casefold() in text for term in keywords):
        return False
    if any(term.casefold() in text for term in excludes):
        return False
    return True
