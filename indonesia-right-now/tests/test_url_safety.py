from __future__ import annotations

import asyncio
import logging
import socket
from urllib.parse import urlsplit

import httpx
import pytest
import respx
from playwright.async_api import Error as PlaywrightError

from newsid.config import SourceDefinition
from newsid.fetcher import FeedFetcher, _PoliteLimiter
from newsid.fetcher import FetchError as NewsFetchError
from pyscrape import browser
from pyscrape.fetcher import FetchError as StaticFetchError
from pyscrape.fetcher import fetch_static
from pyscrape.safety import UnsafeURLError, validate_public_url

DETIK_URL = (
    "https://news.detik.com/berita/d-8729834/"
    "ada-aksi-sekitar-monas-9-rute-transjakarta-terdampak-pengalihan-arus"
)


def _dns_answers(*addresses: str):
    return [
        (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", (address, 443))
        for address in addresses
    ]


def test_supplied_detik_url_passes_public_destination_check(monkeypatch) -> None:
    seen: list[tuple[str, int]] = []

    def resolve(host: str, port: int, **kwargs):
        seen.append((host, port))
        return _dns_answers("93.184.216.34")

    monkeypatch.setattr(socket, "getaddrinfo", resolve)
    validate_public_url(DETIK_URL)
    assert seen == [("news.detik.com", 443)]


def test_normal_public_https_host_is_allowed(monkeypatch) -> None:
    monkeypatch.setattr(
        socket, "getaddrinfo", lambda *_args, **_kwargs: _dns_answers("1.1.1.1")
    )
    validate_public_url("https://example.org/article")


def test_internationalized_hostname_is_resolved_as_idna(monkeypatch) -> None:
    seen: list[str] = []

    def resolve(host: str, *_args, **_kwargs):
        seen.append(host)
        return _dns_answers("1.1.1.1")

    monkeypatch.setattr(socket, "getaddrinfo", resolve)
    validate_public_url("https://bücher.example/article")
    assert seen == ["xn--bcher-kva.example"]


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/",
        "http://LOCALHOST./",
        "http://sub.localhost/",
        "http://printer.local/",
        "http://service.internal/",
        "http://127.0.0.1/",
        "http://10.2.3.4/",
        "http://172.16.0.1/",
        "http://192.168.1.1/",
        "http://169.254.169.254/latest/meta-data/",
        "http://100.64.0.1/",
        "http://224.0.0.1/",
        "http://0.0.0.0/",
        "http://192.0.2.1/",
        "http://[::1]/",
        "http://[fc00::1]/",
        "http://[fe80::1]/",
        "http://[::ffff:127.0.0.1]/",
        "http://[2002:7f00:1::]/",
        "http://[2001:0000::1]/",
        "http://[64:ff9b::a9fe:a9fe]/",
    ],
)
def test_rejects_non_public_address_ranges(url: str) -> None:
    with pytest.raises(UnsafeURLError):
        validate_public_url(url)


def test_mixed_public_and_private_dns_answers_are_rejected(monkeypatch) -> None:
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *_args, **_kwargs: _dns_answers("93.184.216.34", "10.0.0.1"),
    )
    with pytest.raises(UnsafeURLError, match="non-public"):
        validate_public_url("https://mixed.example")


def test_dns_failure_fails_closed(monkeypatch) -> None:
    def fail_resolution(*_args, **_kwargs):
        raise socket.gaierror("test resolver failure")

    monkeypatch.setattr(socket, "getaddrinfo", fail_resolution)
    with pytest.raises(UnsafeURLError, match="Could not resolve"):
        validate_public_url("https://unresolved.example")


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://example.org/",
        "https://user:pass@example.org/",
        "https://example.org:invalid/",
        "https://example.org/\nheader",
        "http://[::1",
    ],
)
def test_rejects_malformed_or_unsupported_urls(url: str) -> None:
    with pytest.raises(UnsafeURLError):
        validate_public_url(url)


def test_alternative_numeric_ipv4_host_is_checked_after_resolution(monkeypatch) -> None:
    def resolve(host: str, port: int, **_kwargs):
        assert host == "2130706433"
        return _dns_answers("127.0.0.1")

    monkeypatch.setattr(socket, "getaddrinfo", resolve)
    with pytest.raises(UnsafeURLError, match="non-public"):
        validate_public_url("http://2130706433/")


def test_static_redirect_is_checked_before_contacting_private_host(monkeypatch) -> None:
    start = "https://public.example/article"
    redirect = "http://169.254.169.254/latest/meta-data/"
    checked: list[str] = []
    requests_made: list[str] = []

    def validate(url: str, **_kwargs) -> None:
        checked.append(url)
        if url == redirect:
            raise UnsafeURLError("private test address")

    class RedirectResponse:
        def __init__(self) -> None:
            self.status_code = 302
            self.headers = {"Location": redirect}

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

    class Session:
        trust_env = True

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def get(self, url: str, **_kwargs):
            assert self.trust_env is False
            requests_made.append(url)
            return RedirectResponse()

    monkeypatch.setattr("pyscrape.fetcher.validate_public_url", validate)
    monkeypatch.setattr("pyscrape.fetcher.requests.Session", Session)
    with pytest.raises(UnsafeURLError):
        fetch_static(start, timeout=1)
    assert checked == [start, redirect]
    assert requests_made == [start]


def test_static_response_size_is_bounded(monkeypatch) -> None:
    url = "https://public.example/article"

    class Response:
        def __init__(self) -> None:
            self.status_code = 200
            self.headers = {}
            self.url = url
            self.encoding = "utf-8"
            self.apparent_encoding = "utf-8"

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def iter_content(self, chunk_size: int):
            assert chunk_size == 64 * 1024
            yield b"1234"
            yield b"56"

    class Session:
        trust_env = True

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def get(self, *_args, **_kwargs):
            assert self.trust_env is False
            return Response()

    monkeypatch.setattr("pyscrape.fetcher.MAX_RESPONSE_BYTES", 5)
    monkeypatch.setattr(
        "pyscrape.fetcher.validate_public_url", lambda *_args, **_kwargs: None
    )
    monkeypatch.setattr("pyscrape.fetcher.requests.Session", Session)
    with pytest.raises(StaticFetchError, match="10 MiB size limit"):
        fetch_static(url, timeout=1)


@respx.mock
@pytest.mark.asyncio
async def test_feed_redirect_to_private_address_is_blocked(
    monkeypatch,
) -> None:
    start = "https://public.example/feed.xml"
    private = "http://169.254.169.254/latest/meta-data/"
    route = respx.get(start).mock(
        return_value=httpx.Response(302, headers={"Location": private})
    )
    checked: list[str] = []

    def validate(url: str, **_kwargs) -> None:
        checked.append(url)
        if url == private:
            raise UnsafeURLError("private test address")

    monkeypatch.setattr("newsid.fetcher.validate_public_url", validate)
    async with httpx.AsyncClient(trust_env=False) as client:
        fetcher = FeedFetcher(
            client,
            concurrency=1,
            retries=0,
            request_delay=0,
            logger=logging.getLogger(__name__),
            limiter=_PoliteLimiter(0),
        )
        with pytest.raises(NewsFetchError, match="blocked by URL safety checks"):
            await fetcher._request(start)
    assert route.called
    assert checked == [start, private]


@respx.mock
@pytest.mark.asyncio
async def test_feed_redirect_chain_revalidates_each_hostname(monkeypatch) -> None:
    start = "https://one.example/feed.xml"
    second = "https://two.example/rss.xml"
    first_route = respx.get(start).mock(
        return_value=httpx.Response(302, headers={"Location": second})
    )
    second_route = respx.get(second).mock(
        return_value=httpx.Response(200, content=b"<rss/>")
    )
    checked: list[str] = []
    monkeypatch.setattr(
        "newsid.fetcher.validate_public_url",
        lambda url, **_kwargs: checked.append(url),
    )
    async with httpx.AsyncClient(trust_env=False) as client:
        fetcher = FeedFetcher(
            client,
            concurrency=1,
            retries=0,
            request_delay=0,
            logger=logging.getLogger(__name__),
            limiter=_PoliteLimiter(0),
        )
        response = await fetcher._request(start)
    assert response.status_code == 200
    assert response.content == b"<rss/>"
    assert first_route.called and second_route.called
    assert checked == [start, second]


@respx.mock
@pytest.mark.asyncio
async def test_feed_dns_failure_prevents_http_request(monkeypatch) -> None:
    url = "https://unresolved.example/feed.xml"
    route = respx.get(url).mock(return_value=httpx.Response(200, content=b"<rss/>"))
    monkeypatch.setattr(
        "newsid.fetcher.validate_public_url",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            UnsafeURLError("test DNS failure")
        ),
    )
    async with httpx.AsyncClient(trust_env=False) as client:
        fetcher = FeedFetcher(
            client,
            concurrency=1,
            retries=0,
            request_delay=0,
            logger=logging.getLogger(__name__),
            limiter=_PoliteLimiter(0),
        )
        with pytest.raises(NewsFetchError, match="blocked by URL safety checks"):
            await fetcher._request(url)
    assert not route.called


@respx.mock
@pytest.mark.asyncio
async def test_feed_response_size_is_bounded(monkeypatch) -> None:
    url = "https://public.example/feed.xml"
    route = respx.get(url).mock(return_value=httpx.Response(200, content=b"123456"))
    monkeypatch.setattr("newsid.fetcher.MAX_FEED_RESPONSE_BYTES", 5)
    monkeypatch.setattr(
        "newsid.fetcher.validate_public_url", lambda *_args, **_kwargs: None
    )
    async with httpx.AsyncClient(trust_env=False) as client:
        fetcher = FeedFetcher(
            client,
            concurrency=1,
            retries=0,
            request_delay=0,
            logger=logging.getLogger(__name__),
            limiter=_PoliteLimiter(0),
        )
        with pytest.raises(NewsFetchError, match="10 MiB size limit"):
            await fetcher._request(url)
    assert route.called


@respx.mock
@pytest.mark.asyncio
async def test_feed_source_disallowed_by_robots_is_not_requested(monkeypatch) -> None:
    feed_url = "https://public.example/feed.xml"
    robots = respx.get("https://public.example/robots.txt").mock(
        return_value=httpx.Response(
            200,
            text="User-agent: *\nDisallow: /feed.xml\n",
        )
    )
    feed = respx.get(feed_url).mock(return_value=httpx.Response(200, content=b"<rss/>"))
    monkeypatch.setattr(
        "newsid.fetcher.validate_public_url", lambda *_args, **_kwargs: None
    )
    async with httpx.AsyncClient(trust_env=False) as client:
        fetcher = FeedFetcher(
            client,
            concurrency=1,
            retries=0,
            request_delay=0,
            logger=logging.getLogger(__name__),
            limiter=_PoliteLimiter(0),
        )
        with pytest.raises(NewsFetchError) as error:
            await fetcher.fetch(SourceDefinition(feed_url))
    assert error.value.code == "robots_disallowed"
    assert robots.called
    assert not feed.called


@respx.mock
@pytest.mark.asyncio
async def test_discovered_feed_robots_denial_is_enforced(monkeypatch) -> None:
    source_url = "https://public.example/news"
    feed_url = "https://public.example/rss.xml"
    robots = respx.get("https://public.example/robots.txt").mock(
        return_value=httpx.Response(
            200,
            text="User-agent: *\nDisallow: /rss.xml\n",
        )
    )
    respx.get(source_url).mock(
        return_value=httpx.Response(
            200,
            text=(
                '<html><head><link rel="alternate" '
                'type="application/rss+xml" href="/rss.xml"></head></html>'
            ),
            headers={"Content-Type": "text/html"},
        )
    )
    feed = respx.get(feed_url).mock(return_value=httpx.Response(200, content=b"<rss/>"))
    monkeypatch.setattr(
        "newsid.fetcher.validate_public_url", lambda *_args, **_kwargs: None
    )
    async with httpx.AsyncClient(trust_env=False) as client:
        fetcher = FeedFetcher(
            client,
            concurrency=1,
            retries=0,
            request_delay=0,
            logger=logging.getLogger(__name__),
            limiter=_PoliteLimiter(0),
        )
        with pytest.raises(NewsFetchError) as error:
            await fetcher.fetch(SourceDefinition(source_url))
    assert error.value.code == "robots_disallowed"
    assert robots.called
    assert not feed.called


class _FakeRoute:
    def __init__(self, request) -> None:
        self.request = request
        self.aborted = False
        self.continued = False

    async def abort(self) -> None:
        self.aborted = True

    async def continue_(self) -> None:
        self.continued = True


class _FakePage:
    def __init__(
        self, context, url: str, requests: list[tuple[str, bool, bool]]
    ) -> None:
        self.context = context
        self.url = url
        self.requests = requests
        self.main_frame = object()
        self.routes: list[_FakeRoute] = []

    async def goto(self, *_args, **_kwargs):
        for request_url, is_navigation, is_main in self.requests:
            request = type(
                "Request",
                (),
                {
                    "url": request_url,
                    "is_navigation_request": is_navigation,
                    "frame": self.main_frame if is_main else object(),
                },
            )()
            route = _FakeRoute(request)
            self.routes.append(route)
            await self.context.handler(route)
            if is_main and route.aborted:
                raise PlaywrightError("top-level navigation aborted")
        return type(
            "Response",
            (),
            {"status": 200, "headers": {"content-type": "text/html"}},
        )()

    async def wait_for_timeout(self, _milliseconds: int) -> None:
        return None

    async def evaluate(self, _script: str) -> str:
        return "<html><title>article</title><body>Article text</body></html>"


class _FakeContext:
    def __init__(self, url: str, requests: list[tuple[str, bool, bool]]) -> None:
        self.page = _FakePage(self, url, requests)

    async def new_page(self):
        return self.page

    async def route(self, _pattern: str, handler) -> None:
        self.handler = handler


class _FakeBrowser:
    def __init__(self, context) -> None:
        self.context = context

    async def new_context(self, **_kwargs):
        return self.context

    async def close(self) -> None:
        return None


def _install_fake_browser(
    monkeypatch, url: str, requests: list[tuple[str, bool, bool]]
):
    context = _FakeContext(url, requests)
    fake_browser = _FakeBrowser(context)
    chromium = type(
        "Chromium",
        (),
        {"launch": lambda _self, **_kwargs: asyncio.sleep(0, result=fake_browser)},
    )()
    playwright = type("Playwright", (), {"chromium": chromium})()

    class Manager:
        async def __aenter__(self):
            return playwright

        async def __aexit__(self, *_args):
            return None

    monkeypatch.setattr(browser, "async_playwright", Manager)
    monkeypatch.setattr(
        browser,
        "scroll_page",
        lambda *_args, **_kwargs: asyncio.sleep(0, result=(100, 0)),
    )
    return context


def test_browser_private_child_resources_do_not_fail_safe_page(monkeypatch) -> None:
    url = "https://news.detik.com/article"
    private_resource = "http://127.0.0.1/pixel"
    requests = [
        (url, True, True),
        ("data:image/png;base64,AAAA", False, False),
        (private_resource, False, False),
    ]
    context = _install_fake_browser(monkeypatch, url, requests)

    def validate(target: str, **_kwargs) -> None:
        if urlsplit(target).hostname == "127.0.0.1":
            raise UnsafeURLError("private test address")

    monkeypatch.setattr(browser, "validate_public_url", validate)
    result = browser.fetch_browser(
        url,
        max_steps=0,
        scroll_mode="steps",
        wait_until="load",
        timeout=1,
        headless=True,
        screenshot=None,
    )
    assert result.status_code == 200
    assert context.page.routes[0].continued
    assert context.page.routes[1].aborted
    assert context.page.routes[2].aborted


def test_browser_private_top_level_redirect_fails_closed(monkeypatch) -> None:
    url = "https://news.detik.com/article"
    private_target = "http://127.0.0.1/admin"
    _install_fake_browser(
        monkeypatch,
        url,
        [(url, True, True), (private_target, True, True)],
    )
    monkeypatch.setattr(
        browser,
        "validate_public_url",
        lambda target, **_kwargs: (
            (_ for _ in ()).throw(UnsafeURLError("private test address"))
            if urlsplit(target).hostname == "127.0.0.1"
            else None
        ),
    )
    with pytest.raises(UnsafeURLError, match="Blocked navigation"):
        browser.fetch_browser(
            url,
            max_steps=0,
            scroll_mode="steps",
            wait_until="load",
            timeout=1,
            headless=True,
            screenshot=None,
        )
