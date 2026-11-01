from pathlib import Path
import time

import pytest
from playwright.async_api import async_playwright

from pyscrape.scroll import scroll_page


@pytest.mark.asyncio
async def test_scrolls_local_infinite_content():
    fixture = Path(__file__).parent / "fixtures" / "infinite_scroll.html"
    async with async_playwright() as playwright:
        try:
            browser = await playwright.chromium.launch()
        except Exception as exc:
            pytest.skip(f"Install Chromium with 'playwright install chromium': {exc}")
        try:
            page = await browser.new_page(viewport={"width": 800, "height": 600})
            await page.goto(fixture.resolve().as_uri(), wait_until="load")
            _, count = await scroll_page(
                page,
                max_steps=20,
                mode="until-height-stable",
                wait_until="load",
                deadline=time.monotonic() + 20,
            )
            html = await page.content()
            assert count > 0
            assert "lazy content 5" in html
        finally:
            await browser.close()
