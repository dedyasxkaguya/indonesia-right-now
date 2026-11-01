"""Regression tests for feed transport compression handling."""

from __future__ import annotations

import gzip
import logging

import httpx
import pytest

from newsid.config import SourceDefinition
from newsid.fetcher import FeedFetcher

pytestmark = pytest.mark.asyncio

_BODY = (
    b"<rss><channel><item>"
    b"<title>t</title><link>https://example.org/a</link>"
    b"</item></channel></rss>"
)


def _gzip_handler(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/robots.txt":
        return httpx.Response(404)
    compressed = gzip.compress(_BODY)
    return httpx.Response(
        200,
        headers={
            "Content-Type": "application/rss+xml",
            "Content-Encoding": "gzip",
            "Content-Length": str(len(compressed)),
        },
        content=compressed,
    )


async def test_gzip_feed_is_not_double_decoded() -> None:
    """aiter_bytes() decodes Content-Encoding already; the reconstructed
    response must not trigger a second decode (smoke regression)."""
    async with httpx.AsyncClient(transport=httpx.MockTransport(_gzip_handler)) as client:
        fetcher = FeedFetcher(
            client,
            concurrency=1,
            retries=0,
            request_delay=0,
            logger=logging.getLogger("test"),
        )
        fetched = await fetcher.fetch(SourceDefinition("https://example.org/rss.xml"))
    assert fetched.body.startswith(b"<rss>")
    assert b"<title>t</title>" in fetched.body
