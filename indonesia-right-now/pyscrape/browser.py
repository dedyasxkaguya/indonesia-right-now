import asyncio
import logging
import time
from dataclasses import dataclass
from urllib.parse import urlsplit

from playwright.async_api import (
    Error as PlaywrightError,
)
from playwright.async_api import (
    TimeoutError as PlaywrightTimeoutError,
)
from playwright.async_api import (
    async_playwright,
)

from pyscrape.fetcher import BotCheckError, FetchError, FetchResult, detect_bot_check
from pyscrape.robots import USER_AGENT, RobotsError, check_robots
from pyscrape.safety import UnsafeURLError, validate_public_url
from pyscrape.scroll import scroll_page

logger = logging.getLogger(__name__)


class BrowserError(Exception):
    """A browser launch or navigation failed."""


@dataclass
class BrowserResult(FetchResult):
    screenshot_png: bytes | None = None


async def _scrape(
    url: str,
    *,
    max_steps: int,
    scroll_mode: str,
    wait_until: str,
    timeout: int,
    headless: bool,
    screenshot: str | None,
    check_robots_enabled: bool,
    screenshot_inline: bool = False,
    user_agent: str = USER_AGENT,
    cache_dns: bool = True,
) -> BrowserResult:
    deadline = time.monotonic() + timeout
    blocked_navigation_hosts: list[str] = []
    policy_errors: list[RobotsError] = []

    async def guard_request(route):
        browser_request = route.request
        request_url = browser_request.url
        try:
            is_main_navigation = (
                browser_request.is_navigation_request
                and browser_request.frame == page.main_frame
            )
        except PlaywrightError:
            is_main_navigation = False

        try:
            scheme = urlsplit(request_url).scheme.casefold()
        except ValueError:
            scheme = ""
        if scheme not in {"http", "https"}:
            if is_main_navigation:
                blocked_navigation_hosts.append(f"<{scheme or 'invalid'} scheme>")
                logger.warning(
                    "Blocked unsupported top-level browser navigation scheme %s",
                    scheme or "<invalid>",
                    extra={"event": "fetch_url_blocked"},
                )
            await route.abort()
            return

        try:
            await asyncio.to_thread(
                validate_public_url, request_url, cache_dns=cache_dns
            )
        except (UnsafeURLError, ValueError) as exc:
            try:
                hostname = urlsplit(request_url).hostname or "<invalid>"
            except ValueError:
                hostname = "<invalid>"
            logger.warning(
                "Blocked unsafe browser request to %s (top_level=%s): %s",
                hostname,
                is_main_navigation,
                exc,
                extra={"event": "fetch_url_blocked"},
            )
            if is_main_navigation:
                blocked_navigation_hosts.append(hostname)
            await route.abort()
            return

        if browser_request.is_navigation_request and check_robots_enabled:
            try:
                await asyncio.to_thread(
                    check_robots,
                    request_url,
                    timeout=min(timeout, 10),
                    user_agent=user_agent,
                    cache_dns=cache_dns,
                )
            except RobotsError as exc:
                if is_main_navigation:
                    policy_errors.append(exc)
                else:
                    logger.info(
                        "Blocked browser subframe by robots.txt",
                        extra={"event": "robots_disallowed"},
                    )
                await route.abort()
                return
        await route.continue_()

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                headless=headless,
                args=["--no-proxy-server"],
            )
            try:
                context = await browser.new_context(user_agent=user_agent)
                page = await context.new_page()
                await context.route("**/*", guard_request)
                try:
                    response = await page.goto(
                        url,
                        wait_until=wait_until,
                        timeout=timeout * 1000,
                    )
                except PlaywrightError:
                    if policy_errors:
                        raise policy_errors[0]
                    if blocked_navigation_hosts:
                        raise UnsafeURLError(
                            "Blocked navigation to a non-public URL: "
                            f"{blocked_navigation_hosts[0]}"
                        )
                    raise
                if policy_errors:
                    raise policy_errors[0]
                if blocked_navigation_hosts:
                    raise UnsafeURLError(
                        "Blocked navigation to a non-public URL: "
                        f"{blocked_navigation_hosts[0]}"
                    )
                status_code = response.status if response else 200
                if status_code == 403:
                    raise BotCheckError(
                        "The site returned HTTP 403; no access-check bypass was attempted."
                    )
                if status_code >= 400:
                    raise FetchError(f"The server returned HTTP {status_code}.")

                await page.wait_for_timeout(100)
                screenshot_png = None
                if screenshot:
                    await page.screenshot(path=screenshot, full_page=True)
                if screenshot_inline:
                    screenshot_png = await page.screenshot(full_page=True)
                final_height, scroll_count = await scroll_page(
                    page,
                    max_steps=max_steps,
                    mode=scroll_mode,
                    wait_until=wait_until,
                    deadline=deadline,
                )
                html = await page.evaluate("document.documentElement.outerHTML")
                if detect_bot_check(html, status_code):
                    raise BotCheckError(
                        "A bot-check or CAPTCHA page was detected; no bypass was attempted."
                    )
                return BrowserResult(
                    html=html,
                    status_code=status_code,
                    final_url=page.url,
                    scroll_height=final_height,
                    scroll_count=scroll_count,
                    screenshot_png=screenshot_png,
                    content_type=(
                        response.headers.get("content-type", "")
                        .split(";", 1)[0]
                        .strip()
                        .lower()
                        if response
                        else "text/html"
                    ),
                )
            finally:
                await browser.close()
    except BotCheckError:
        raise
    except RobotsError:
        raise
    except PlaywrightTimeoutError as exc:
        raise TimeoutError(
            f"The page did not finish loading within {timeout} seconds."
        ) from exc
    except PlaywrightError as exc:
        raise BrowserError(f"Browser error: {exc}") from exc


def fetch_browser(
    url: str,
    *,
    max_steps: int,
    scroll_mode: str,
    wait_until: str,
    timeout: int,
    headless: bool,
    screenshot: str | None,
    check_robots_enabled: bool = False,
    screenshot_inline: bool = False,
    user_agent: str = USER_AGENT,
    cache_dns: bool = True,
) -> BrowserResult:
    return asyncio.run(
        _scrape(
            url,
            max_steps=max_steps,
            scroll_mode=scroll_mode,
            wait_until=wait_until,
            timeout=timeout,
            headless=headless,
            screenshot=screenshot,
            check_robots_enabled=check_robots_enabled,
            screenshot_inline=screenshot_inline,
            user_agent=user_agent,
            cache_dns=cache_dns,
        )
    )
