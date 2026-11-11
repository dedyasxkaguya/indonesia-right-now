from __future__ import annotations

from datetime import UTC
import logging
from typing import Any
from urllib.parse import urljoin, urlsplit

import feedparser

from newsid.config import SourceDefinition
from newsid.fetcher import FetchedSource
from newsid.normalize import clean_text, item_id, parse_date_value, publisher_domain
from newsid.schema import NewsItem


class FeedParseError(ValueError):
    """Raised when a response cannot be interpreted as an RSS/Atom feed."""


def _rate_hint(feed: Any) -> float | None:
    ttl = feed.get("ttl")
    try:
        if ttl is not None and float(ttl) > 0:
            return float(ttl) * 60
    except (TypeError, ValueError):
        pass
    period = str(feed.get("sy_updateperiod", "")).casefold()
    frequency = feed.get("sy_updatefrequency", 1)
    try:
        count = max(1, int(frequency))
    except (TypeError, ValueError):
        count = 1
    units = {"hourly": 3600, "daily": 86400, "weekly": 604800, "monthly": 2592000}
    return units[period] / count if period in units else None


def parse_feed(
    fetched: FetchedSource,
    *,
    max_items: int,
    detect_language: bool,
    logger: logging.Logger,
) -> tuple[list[NewsItem], str | None, float | None]:
    parsed = feedparser.parse(fetched.body)
    entries = parsed.get("entries", [])
    if not entries:
        detail = "feed contains no entries"
        if parsed.get("bozo"):
            detail = f"malformed or unsupported feed: {parsed.get('bozo_exception')}"
        raise FeedParseError(detail)

    feed_title = clean_text(parsed.get("feed", {}).get("title"))
    publisher = feed_title or fetched.source.name or publisher_domain(fetched.feed_url)
    result: list[NewsItem] = []
    langdetect = None
    langdetect_error = None
    if detect_language:
        try:
            from langdetect import LangDetectException, detect
        except ImportError as exc:
            raise FeedParseError(
                "language detection requested; install the 'language' extra"
            ) from exc
        langdetect = detect
        langdetect_error = LangDetectException

    for entry in entries:
        title = clean_text(entry.get("title"))
        link = urljoin(fetched.feed_url, str(entry.get("link", "")).strip())
        if not title or not link:
            continue
        try:
            link_parts = urlsplit(link)
            if link_parts.scheme not in {"http", "https"} or not link_parts.hostname:
                continue
            link_parts.port
        except ValueError:
            continue
        summary = clean_text(entry.get("summary") or entry.get("description"))
        content_candidates = [
            clean_text(content.get("value"))
            for content in entry.get("content", [])
            if isinstance(content, dict)
        ]
        content = max(content_candidates, key=len, default=None)
        if not content or len(content) <= len(summary):
            content = None

        published, confidence = parse_date_value(
            entry.get("published_parsed")
            or entry.get("updated_parsed")
            or entry.get("dc_date")
            or entry.get("published")
            or entry.get("updated")
        )
        if entry.get("published_parsed") is None and published and confidence == "exact":
            confidence = "approx"

        tag_entries = entry.get("tags", [])
        categories = [
            clean_text(tag.get("term"))
            for tag in tag_entries
            if isinstance(tag, dict) and clean_text(tag.get("term"))
        ]
        if not categories and fetched.source.category:
            categories = [fetched.source.category]

        language = None
        if langdetect:
            try:
                detected = langdetect(f"{title} {summary}")
                language = detected if detected in {"id", "en"} else None
            except langdetect_error as exc:
                logger.debug("language detection skipped: %s", exc, extra={"event": "language_detection"})
        item_publisher = (
            clean_text(entry.get("source", {}).get("title"))
            or publisher
        )
        result.append(
            NewsItem(
                id=item_id(link),
                title=title,
                url=link,
                publisher=item_publisher,
                publisher_domain=publisher_domain(link),
                author=clean_text(entry.get("author")) or None,
                published_at=published,
                date_confidence=confidence,
                summary=summary,
                content=content,
                categories=categories,
                language=language,
                source_url=fetched.feed_url,
                fetched_at=fetched.fetched_at.astimezone(UTC).isoformat(),
            )
        )
        if max_items and len(result) >= max_items:
            break

    if not result:
        raise FeedParseError("feed has no entries with both a title and link")
    return result, publisher, _rate_hint(parsed.get("feed", {}))
