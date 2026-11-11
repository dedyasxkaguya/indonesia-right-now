"""The two IRN chatbot tools and their hard limits.

Both tools read the shared news pool only. Neither performs network access, so
there is no way for a tool call to reach an external site.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import structlog

from app.services.news_cache import get_pool

logger = structlog.get_logger("app.services.irn_tools")

SEARCH_TOOL_NAME = "search_related_news"
DIVERSITY_TOOL_NAME = "analyze_source_diversity"

MAX_SEARCH_RESULTS = 5
SEARCH_TIMEOUT_SECONDS = 3
DIVERSITY_TIMEOUT_SECONDS = 2
MAX_TOOL_CALLS_PER_MESSAGE = 2

IRN_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": SEARCH_TOOL_NAME,
            "description": (
                "Search the current Indonesian news pool for other articles "
                "about a topic. Returns at most 5 articles with title, "
                "publisher, and url. Use it when the user asks whether other "
                "outlets covered a topic."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Topic or keywords to search for.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "How many articles to return, 1 to 5.",
                    },
                },
                "required": ["query"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": DIVERSITY_TOOL_NAME,
            "description": (
                "Count how many distinct publishers cover a topic in the "
                "current news pool, and list their names. Use it for source "
                "diversity questions, never to judge accuracy."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "Topic to measure coverage for.",
                    }
                },
                "required": ["topic"],
                "additionalProperties": False,
            },
        },
    },
]


def _clamp_limit(raw: Any) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return MAX_SEARCH_RESULTS
    return max(1, min(MAX_SEARCH_RESULTS, value))


async def search_related_news(query: str, limit: int = MAX_SEARCH_RESULTS) -> dict[str, Any]:
    """Return up to five pool matches. Never raises and never fetches a URL."""
    query = str(query or "").strip()
    if not query:
        return {"query": query, "results": [], "error": "empty query"}
    effective_limit = _clamp_limit(limit)
    try:
        matches = await asyncio.wait_for(
            asyncio.to_thread(get_pool().search, query, effective_limit),
            timeout=SEARCH_TIMEOUT_SECONDS,
        )
    except TimeoutError:
        logger.warning("irn.tool_timeout", tool=SEARCH_TOOL_NAME)
        return {"query": query, "results": [], "error": "timeout"}
    except Exception as exc:  # noqa: BLE001 - tool failures must not break chat.
        logger.warning("irn.tool_failed", tool=SEARCH_TOOL_NAME, error=str(exc)[:200])
        return {"query": query, "results": [], "error": "unavailable"}
    return {
        "query": query,
        "results": [
            {
                "title": article.get("title"),
                "publisher": article.get("publisher"),
                "url": article.get("url"),
            }
            for article in matches[:MAX_SEARCH_RESULTS]
        ],
        "error": None,
    }


async def analyze_source_diversity(topic: str) -> dict[str, Any]:
    """Count distinct publishers covering ``topic`` in the pool."""
    topic = str(topic or "").strip()
    if not topic:
        return {
            "topic": topic,
            "total_articles": 0,
            "unique_publishers": [],
            "publisher_count": 0,
            "error": "empty topic",
        }
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(get_pool().diversity, topic),
            timeout=DIVERSITY_TIMEOUT_SECONDS,
        )
    except TimeoutError:
        logger.warning("irn.tool_timeout", tool=DIVERSITY_TOOL_NAME)
        return {"topic": topic, "error": "timeout"}
    except Exception as exc:  # noqa: BLE001 - tool failures must not break chat.
        logger.warning("irn.tool_failed", tool=DIVERSITY_TOOL_NAME, error=str(exc)[:200])
        return {"topic": topic, "error": "unavailable"}
    return {**result, "error": None}


def _tool_arguments(call: dict[str, Any]) -> dict[str, Any]:
    """Accept both parsed dicts and the raw JSON string Groq returns."""
    arguments = call.get("arguments")
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments or "{}")
        except json.JSONDecodeError:
            arguments = {}
    return arguments if isinstance(arguments, dict) else {}


async def execute_tool_call(call: dict[str, Any]) -> dict[str, Any] | None:
    """Run one normalized tool call, or return ``None`` for unknown tools."""
    name = call.get("name")
    arguments = _tool_arguments(call)
    if name == SEARCH_TOOL_NAME:
        return await search_related_news(
            str(arguments.get("query", "")),
            arguments.get("limit", MAX_SEARCH_RESULTS),
        )
    if name == DIVERSITY_TOOL_NAME:
        return await analyze_source_diversity(str(arguments.get("topic", "")))
    logger.warning("irn.tool_unknown", tool=name)
    return None


def tool_message_content(result: dict[str, Any] | None) -> str:
    if result is None:
        payload: dict[str, Any] = {"error": "unknown tool"}
    else:
        payload = result
    return json.dumps(payload, ensure_ascii=False)
