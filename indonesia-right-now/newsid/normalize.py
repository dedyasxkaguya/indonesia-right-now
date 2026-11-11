from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from time import struct_time
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from bs4 import BeautifulSoup


TRACKING_KEYS = {"fbclid", "gclid", "ref", "igshid"}
WHITESPACE = re.compile(r"\s+")
SPACE_BEFORE_PUNCTUATION = re.compile(r"\s+([,.;:!?])")


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    soup = BeautifulSoup(str(value), "html.parser")
    text = WHITESPACE.sub(" ", soup.get_text(" ", strip=True)).strip()
    return SPACE_BEFORE_PUNCTUATION.sub(r"\1", text)


def canonicalize_url(value: str) -> str:
    parts = urlsplit(value.strip())
    query = [
        (key, val)
        for key, val in parse_qsl(parts.query, keep_blank_values=True)
        if not key.lower().startswith("utm_") and key.lower() not in TRACKING_KEYS
    ]
    query.sort()
    host = (parts.hostname or "").lower()
    port = parts.port
    netloc = host
    if port and not ((parts.scheme.lower() == "http" and port == 80) or
                     (parts.scheme.lower() == "https" and port == 443)):
        netloc = f"{host}:{port}"
    return urlunsplit((parts.scheme.lower(), netloc, parts.path or "/", urlencode(query), ""))


def publisher_domain(value: str) -> str:
    host = (urlsplit(value).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def normalized_title(value: str) -> str:
    return WHITESPACE.sub(" ", value).strip().casefold()


def parse_date_value(value: Any) -> tuple[str | None, str]:
    if isinstance(value, struct_time):
        try:
            parsed = datetime(*value[:6], tzinfo=UTC)
        except ValueError:
            return None, "unknown"
        return parsed.isoformat(), "exact"
    if isinstance(value, datetime):
        parsed = value if value.tzinfo else value.replace(tzinfo=UTC)
        return parsed.astimezone(UTC).isoformat(), "approx"
    if isinstance(value, str) and value.strip():
        try:
            parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        except ValueError:
            try:
                parsed = parsedate_to_datetime(value)
            except (TypeError, ValueError, OverflowError):
                return None, "unknown"
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC).isoformat(), "approx"
    return None, "unknown"


def item_id(url: str) -> str:
    return hashlib.sha256(canonicalize_url(url).encode("utf-8")).hexdigest()[:16]
