import asyncio
import time
from typing import Any

from playwright.async_api import TimeoutError as PlaywrightTimeoutError


async def _wait_after_scroll(page: Any, wait_until: str, deadline: float) -> None:
    remaining_ms = max(1, int((deadline - time.monotonic()) * 1000))
    try:
        await page.wait_for_load_state(
            wait_until, timeout=min(2000, remaining_ms)
        )
    except PlaywrightTimeoutError:
        pass
    if time.monotonic() >= deadline:
        raise TimeoutError("The page timed out while scrolling.")

    settle_deadline = min(deadline, time.monotonic() + 1.2)
    while time.monotonic() < settle_deadline:
        settled = await page.evaluate(
            "performance.now() - (window.__pyscrapeLastMutation || 0) > 350"
        )
        if settled:
            break
        await page.wait_for_timeout(100)
    if time.monotonic() >= deadline:
        raise TimeoutError("The page timed out while waiting for content to settle.")


async def scroll_page(
    page: Any,
    *,
    max_steps: int,
    mode: str,
    wait_until: str,
    deadline: float,
) -> tuple[int, int]:
    await page.evaluate(
        """() => {
          window.__pyscrapeLastMutation = performance.now();
          new MutationObserver(() => {
            window.__pyscrapeLastMutation = performance.now();
          }).observe(document.documentElement, {
            childList: true, subtree: true, attributes: true, characterData: true
          });
        }"""
    )
    previous_height = await page.evaluate("document.body.scrollHeight")
    stable_count = 0
    scroll_count = 0

    for _ in range(max_steps):
        if time.monotonic() >= deadline:
            raise TimeoutError("The page timed out while scrolling.")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        scroll_count += 1
        await _wait_after_scroll(page, wait_until, deadline)
        current_height = await page.evaluate("document.body.scrollHeight")
        stable_count = stable_count + 1 if current_height <= previous_height else 0
        previous_height = current_height
        if mode == "until-height-stable" and stable_count >= 2:
            break

    image_deadline = min(deadline, time.monotonic() + 3)
    while time.monotonic() < image_deadline:
        pending = await page.locator('img[loading="lazy"]').evaluate_all(
            "(images) => images.some((image) => !image.complete)"
        )
        if not pending:
            break
        await asyncio.sleep(0.1)
    final_height = await page.evaluate("document.body.scrollHeight")
    return final_height, scroll_count
