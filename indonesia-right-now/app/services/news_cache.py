"""Process-local pool of the most recent news articles.

``/news`` already caches assembled documents per resolved query, but that cache
lives inside the router closure and is keyed by request options, so no other
endpoint can read it. This module is the shared, option-independent pool: every
successful ``/news`` run publishes its articles here, and the IRN chatbot tools
query it.

The pool is intentionally in-memory and process-local, matching the single-worker
deployment. It never performs network access.
"""

from __future__ import annotations

import re
import threading
import time
from typing import Any

MAX_POOL_ARTICLES = 2000
POOL_TTL_SECONDS = 6 * 60 * 60

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_STOPWORDS = frozenset(
    (
        "ada", "adalah", "agar", "akan", "atau", "belum", "berita", "bisa",
        "dan", "dari", "dalam", "dengan", "di", "untuk", "ini", "itu", "juga",
        "karena", "ke", "lebih", "mereka", "nya", "oleh", "pada", "para",
        "saat", "saya", "sebagai", "serta", "setelah", "tetapi", "tidak",
        "yang", "the", "and", "for", "with", "from", "that", "this",
    )
)


def _tokens(text: str) -> set[str]:
    return {
        token
        for token in _TOKEN_RE.findall(str(text).casefold())
        if len(token) > 2 and token not in _STOPWORDS
    }


def _overlap(query_tokens: set[str], document_tokens: set[str]) -> int:
    """Count query terms present in a document.

    Indonesian is affix-heavy (``beras``/``berasnya``, ``pemerintah``/
    ``pemerintahan``), so a term also matches a shared stem of at least four
    characters. Short terms must match exactly to avoid noise.
    """
    matched = 0
    for query_token in query_tokens:
        if query_token in document_tokens:
            matched += 1
            continue
        if len(query_token) < 4:
            continue
        if any(
            len(document_token) >= 4
            and (
                document_token.startswith(query_token)
                or query_token.startswith(document_token)
            )
            for document_token in document_tokens
        ):
            matched += 1
    return matched


def _first_text(item: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def normalize_article(item: dict[str, Any]) -> dict[str, Any] | None:
    """Map a ``/news`` item onto the small shape the chatbot tools need."""
    title = _first_text(item, "title", "headline")
    if not title:
        return None
    publisher = _first_text(
        item, "publisher", "source_name", "source", "site", "publisher_name"
    )
    category = item.get("category") or item.get("categories")
    if isinstance(category, list):
        category = ", ".join(str(value) for value in category if value) or None
    elif isinstance(category, str):
        category = category.strip() or None
    else:
        category = None
    # ``/news`` items expose the canonical link as ``source_url``.
    url = _first_text(item, "source_url", "url", "link", "href")
    summary = _first_text(item, "summary", "snippet", "description", "excerpt")
    published_at = _first_text(
        item, "published_at", "published", "published_text", "date", "timestamp"
    )
    return {
        "title": title[:400],
        "publisher": publisher[:160] if publisher else None,
        "category": category[:120] if isinstance(category, str) else None,
        "summary": summary[:1000] if summary else None,
        "url": url[:2048] if url else None,
        "published_at": published_at[:64] if published_at else None,
        "stored_at": time.time(),
    }


def _dedupe_key(article: dict[str, Any]) -> str:
    """Identity is title+publisher, not URL.

    ``/news`` items carry the *feed* URL in ``source_url``, so every article from
    one RSS feed shares a URL. Keying on it would collapse an entire feed into a
    single entry.
    """
    title = (article.get("title") or "").strip().casefold()
    publisher = (article.get("publisher") or "").strip().casefold()
    if title:
        return f"title:{title}|{publisher}"
    return f"url:{(article.get('url') or '').strip().casefold()}"


class NewsPool:
    """Bounded, TTL-scoped set of recent articles."""

    def __init__(
        self,
        *,
        max_articles: int = MAX_POOL_ARTICLES,
        ttl_seconds: int = POOL_TTL_SECONDS,
    ) -> None:
        self.max_articles = max_articles
        self.ttl_seconds = ttl_seconds
        self._articles: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def clear(self) -> None:
        with self._lock:
            self._articles.clear()

    def publish(self, items: list[dict[str, Any]]) -> int:
        """Merge articles into the pool and return how many were accepted."""
        normalized = [
            article
            for article in (normalize_article(item) for item in items or [])
            if article is not None
        ]
        if not normalized:
            return 0
        now = time.time()
        with self._lock:
            for article in normalized:
                article["stored_at"] = now
                self._articles[_dedupe_key(article)] = article
            self._prune(now)
        return len(normalized)

    def _prune(self, now: float) -> None:
        expired = [
            key
            for key, article in self._articles.items()
            if now - float(article.get("stored_at", now)) > self.ttl_seconds
        ]
        for key in expired:
            self._articles.pop(key, None)
        overflow = len(self._articles) - self.max_articles
        if overflow > 0:
            oldest = sorted(
                self._articles,
                key=lambda key: float(self._articles[key].get("stored_at", 0)),
            )
            for key in oldest[:overflow]:
                self._articles.pop(key, None)

    def snapshot(self) -> list[dict[str, Any]]:
        now = time.time()
        with self._lock:
            self._prune(now)
            return [dict(article) for article in self._articles.values()]

    def search(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        """Rank articles by token overlap with ``query``; best matches first."""
        tokens = _tokens(query)
        if not tokens:
            return []
        scored: list[tuple[int, float, dict[str, Any]]] = []
        for article in self.snapshot():
            title_tokens = _tokens(article.get("title") or "")
            summary_tokens = _tokens(article.get("summary") or "")
            extra_tokens = _tokens(
                f"{article.get('category') or ''} {article.get('publisher') or ''}"
            )
            score = (
                3 * _overlap(tokens, title_tokens)
                + 2 * _overlap(tokens, summary_tokens)
                + _overlap(tokens, extra_tokens)
            )
            if score <= 0:
                continue
            scored.append((score, float(article.get("stored_at", 0)), article))
        scored.sort(key=lambda entry: (entry[0], entry[1]), reverse=True)
        return [article for _, _, article in scored[:limit]]

    def diversity(self, topic: str) -> dict[str, Any]:
        """Count distinct publishers covering ``topic`` in the current pool."""
        tokens = _tokens(topic)
        matched: list[dict[str, Any]] = []
        for article in self.snapshot():
            haystack = _tokens(
                " ".join(
                    str(article.get(key) or "")
                    for key in ("title", "summary", "category")
                )
            )
            if not tokens or _overlap(tokens, haystack):
                matched.append(article)
        publishers = sorted(
            {
                str(article["publisher"]).strip()
                for article in matched
                if article.get("publisher")
            },
            key=str.casefold,
        )
        return {
            "topic": topic,
            "total_articles": len(matched),
            "unique_publishers": publishers,
            "publisher_count": len(publishers),
        }


POOL = NewsPool()


def get_pool() -> NewsPool:
    return POOL


def publish_articles(items: list[dict[str, Any]]) -> int:
    """Best-effort publish; a pool problem must never break ``/news``."""
    try:
        return POOL.publish(items)
    except Exception:  # noqa: BLE001 - the news endpoint must stay unaffected.
        return 0
