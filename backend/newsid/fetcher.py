from __future__ import annotations

import asyncio
import logging
import random
import urllib.robotparser
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from urllib.parse import urljoin, urlsplit

import httpx

from newsid.config import SourceDefinition
from newsid.sources import discover_feed_link
from pyscrape.safety import UnsafeURLError, validate_public_url

USER_AGENT = "news-indonesia-collector/1.0"
MAX_FEED_RESPONSE_BYTES = 10 * 1024 * 1024
MAX_REDIRECTS = 5


class FetchError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass
class FetchedSource:
    source: SourceDefinition
    feed_url: str
    body: bytes
    fetched_at: datetime
    content_type: str


class _PoliteLimiter:
    def __init__(self, delay: float) -> None:
        self.delay = delay
        self._locks: dict[str, asyncio.Lock] = {}
        self._last_request: dict[str, float] = {}
        self._minimums: dict[str, float] = {}

    async def wait(self, url: str, *, request_delay: float | None = None) -> None:
        host = urlsplit(url).netloc.lower()
        lock = self._locks.setdefault(host, asyncio.Lock())
        async with lock:
            loop = asyncio.get_running_loop()
            interval = max(
                self.delay,
                request_delay or 0.0,
                self._minimums.get(host, 0.0),
            )
            elapsed = loop.time() - self._last_request.get(host, 0.0)
            if elapsed < interval:
                await asyncio.sleep(interval - elapsed)
            self._last_request[host] = loop.time()

    def set_hint(self, url: str, seconds: float) -> None:
        host = urlsplit(url).netloc.lower()
        self._minimums[host] = max(self._minimums.get(host, 0.0), seconds)


class FeedFetcher:
    def __init__(
        self,
        client: httpx.AsyncClient,
        *,
        concurrency: int,
        retries: int,
        request_delay: float,
        logger: logging.Logger,
        user_agent: str = USER_AGENT,
        limiter: _PoliteLimiter | None = None,
    ) -> None:
        self.client = client
        self.semaphore = asyncio.Semaphore(concurrency)
        self.retries = retries
        self.limiter = limiter or _PoliteLimiter(request_delay)
        self.request_delay = request_delay
        self.logger = logger
        self.user_agent = user_agent

    async def _request(
        self, url: str, *, allow_not_found: bool = False
    ) -> httpx.Response:
        for attempt in range(self.retries + 1):
            current_url = url
            retry_request = False
            for redirect_count in range(MAX_REDIRECTS + 1):
                try:
                    await asyncio.to_thread(
                        validate_public_url, current_url, cache_dns=False
                    )
                except (UnsafeURLError, ValueError) as exc:
                    try:
                        host = urlsplit(current_url).hostname or "<invalid>"
                    except ValueError:
                        host = "<invalid>"
                    self.logger.warning(
                        "Blocked unsafe feed request to %s: %s",
                        host,
                        exc,
                        extra={"event": "unsafe_url"},
                    )
                    raise FetchError(
                        "unsafe_url",
                        "The feed destination was blocked by URL safety checks.",
                    ) from exc

                await self.limiter.wait(current_url, request_delay=self.request_delay)
                try:
                    async with (
                        self.semaphore,
                        self.client.stream(
                            "GET",
                            current_url,
                            headers={"User-Agent": self.user_agent},
                            follow_redirects=False,
                        ) as response,
                    ):
                        status_code = response.status_code
                        response_headers = dict(response.headers)
                        request = response.request
                        if status_code in {301, 302, 303, 307, 308}:
                            location = response.headers.get("Location")
                            if not location:
                                raise FetchError(
                                    "redirect_error",
                                    "The server returned a redirect without a Location.",
                                )
                            if redirect_count >= MAX_REDIRECTS:
                                raise FetchError(
                                    "redirect_error",
                                    "Too many redirects while fetching the feed.",
                                )
                            current_url = urljoin(str(response.url), location)
                            continue

                        if status_code == 429 or status_code >= 500:
                            if attempt < self.retries:
                                delay = self._retry_after(response)
                                retry_delay = (
                                    delay
                                    if delay is not None
                                    else min(0.5 * (2**attempt), 8.0)
                                    + random.uniform(0, 0.25)
                                )
                                retry_request = True
                            else:
                                raise FetchError(
                                    "http_error",
                                    f"HTTP {status_code} for {current_url}",
                                )
                        elif allow_not_found and status_code == 404:
                            return httpx.Response(
                                status_code,
                                headers=response_headers,
                                request=request,
                            )
                        elif status_code >= 400:
                            raise FetchError(
                                "http_error",
                                f"HTTP {status_code} for {current_url}",
                            )
                        else:
                            content_length = response.headers.get("Content-Length")
                            if content_length:
                                try:
                                    if int(content_length) > MAX_FEED_RESPONSE_BYTES:
                                        raise FetchError(
                                            "response_too_large",
                                            "The feed response exceeded the 10 MiB size limit.",
                                        )
                                except ValueError:
                                    pass
                            body = bytearray()
                            async for chunk in response.aiter_bytes():
                                body.extend(chunk)
                                if len(body) > MAX_FEED_RESPONSE_BYTES:
                                    raise FetchError(
                                        "response_too_large",
                                        "The feed response exceeded the 10 MiB size limit.",
                                    )
                            # aiter_bytes() already decodes content-encoding
                            # (e.g. gzip); drop transport-compression headers
                            # so the reconstructed response is not decoded twice.
                            stored_headers = {
                                key: value
                                for key, value in response_headers.items()
                                if key.casefold()
                                not in {"content-encoding", "content-length"}
                            }
                            return httpx.Response(
                                status_code,
                                headers=stored_headers,
                                content=bytes(body),
                                request=request,
                            )
                    if retry_request:
                        await asyncio.sleep(retry_delay)
                        break
                except FetchError:
                    raise
                except httpx.InvalidURL as exc:
                    raise FetchError(
                        "invalid_url", f"invalid request URL: {exc}"
                    ) from exc
                except httpx.RequestError as exc:
                    if attempt >= self.retries:
                        raise FetchError(
                            "network_error",
                            f"request failed for {current_url}: {exc}",
                        ) from exc
                    await asyncio.sleep(
                        min(0.5 * (2**attempt), 8.0) + random.uniform(0, 0.25)
                    )
                    retry_request = True
                    break
            else:
                raise FetchError(
                    "redirect_error", "Too many redirects while fetching the feed."
                )
            if retry_request:
                continue
        raise FetchError("network_error", f"request failed after retries: {url}")

    @staticmethod
    def _retry_after(response: httpx.Response) -> float | None:
        value = response.headers.get("Retry-After")
        if not value:
            return None
        try:
            return max(0.0, float(value))
        except ValueError:
            try:
                target = parsedate_to_datetime(value)
            except (TypeError, ValueError, OverflowError):
                return None
            if target.tzinfo is None:
                target = target.replace(tzinfo=UTC)
            return max(0.0, (target - datetime.now(UTC)).total_seconds())

    async def _robots_allows(self, url: str) -> bool | None:
        parts = urlsplit(url)
        robots_url = f"{parts.scheme}://{parts.netloc}/robots.txt"
        try:
            response = await self._request(robots_url, allow_not_found=True)
        except FetchError as exc:
            self.logger.warning(
                "robots.txt unavailable for %s; HTML feed discovery will be blocked (%s)",
                parts.netloc,
                exc,
                extra={"event": "robots_unavailable"},
            )
            return None
        if response.status_code == 404:
            self.logger.info(
                "robots.txt not found for %s; no restrictions declared",
                parts.netloc,
                extra={"event": "robots_checked"},
            )
            return True
        parser = urllib.robotparser.RobotFileParser()
        parser.set_url(robots_url)
        parser.parse(response.text.splitlines())
        allowed = parser.can_fetch(self.user_agent, url)
        self.logger.info(
            "robots.txt %s for %s",
            "allows" if allowed else "disallows",
            url,
            extra={"event": "robots_checked"},
        )
        return allowed

    async def fetch(self, source: SourceDefinition) -> FetchedSource:
        robots_allowed = await self._robots_allows(source.url)
        if robots_allowed is False:
            raise FetchError(
                "robots_disallowed",
                f"robots.txt disallows access to {source.url}",
            )
        response = await self._request(source.url)
        content_type = response.headers.get("Content-Type", "").split(";", 1)[0].lower()
        body = response.content
        looks_html = content_type in {"text/html", "application/xhtml+xml"} or (
            body.lstrip().lower().startswith((b"<!doctype html", b"<html"))
        )
        if looks_html:
            if robots_allowed is not True:
                code = (
                    "robots_disallowed"
                    if robots_allowed is False
                    else "robots_unavailable"
                )
                raise FetchError(
                    code, f"robots.txt does not permit HTML discovery at {source.url}"
                )
            if str(response.url) != source.url:
                redirected_allowed = await self._robots_allows(str(response.url))
                if redirected_allowed is not True:
                    code = (
                        "robots_disallowed"
                        if redirected_allowed is False
                        else "robots_unavailable"
                    )
                    raise FetchError(
                        code,
                        f"robots.txt does not permit HTML discovery at {response.url}",
                    )
            feed_url = discover_feed_link(body, str(response.url))
            if feed_url is None:
                raise FetchError(
                    "feed_not_found", f"no public RSS/Atom link found at {source.url}"
                )
            self.logger.info(
                "discovered feed %s from %s",
                feed_url,
                source.url,
                extra={"event": "feed_discovered"},
            )
            feed_robots_allowed = await self._robots_allows(feed_url)
            if feed_robots_allowed is not True:
                code = (
                    "robots_disallowed"
                    if feed_robots_allowed is False
                    else "robots_unavailable"
                )
                raise FetchError(
                    code,
                    f"robots.txt does not permit feed access at {feed_url}",
                )
            response = await self._request(feed_url)
            content_type = (
                response.headers.get("Content-Type", "").split(";", 1)[0].lower()
            )
            body = response.content
            source_url = str(response.url)
        else:
            source_url = str(response.url)
        fetched_at = datetime.now(UTC)
        return FetchedSource(source, source_url, body, fetched_at, content_type)

    def respect_rate_hint(self, url: str, seconds: float) -> None:
        self.limiter.set_hint(url, seconds)
