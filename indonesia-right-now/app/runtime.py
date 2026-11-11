import importlib.util
import logging
import os
import tempfile
import threading

from app.config import Settings

logger = logging.getLogger(__name__)


def validate_runtime(settings: Settings, *, startup: bool = False) -> None:
    if settings.app_workers != 1:
        raise RuntimeError(
            "APP_WORKERS must be 1: per-host request-delay and feed TTL state "
            "is maintained in-process."
        )
    if not startup or not settings.ai_enabled:
        return
    if not settings.groq_api_key.strip():
        raise RuntimeError("GROQ_API_KEY is required when AI_ENABLED=true.")
    try:
        settings.ai_output_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=settings.ai_output_dir, delete=True):
            pass
    except OSError as exc:
        raise RuntimeError(
            "AI_OUTPUT_DIR must be writable when AI_ENABLED=true."
        ) from exc
    logger.info(
        "ai enabled model=%s guard_threshold=%s chunk=%s cache_ttl=%s output_dir=%s",
        settings.groq_model,
        settings.ai_guard_threshold,
        settings.ai_chunk_max_chars,
        settings.ai_cache_ttl,
        os.fspath(settings.ai_output_dir),
    )


async def playwright_info() -> dict[str, object]:
    if importlib.util.find_spec("playwright") is None:
        return {"installed": False, "chromium_version": None}
    try:
        from playwright.async_api import Error as PlaywrightError
        from playwright.async_api import async_playwright
    except ImportError as exc:
        logger.warning("Playwright package could not be imported: %s", exc)
        return {"installed": False, "chromium_version": None}

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            try:
                version = browser.version
            finally:
                await browser.close()
        return {"installed": True, "chromium_version": version}
    except (OSError, PlaywrightError) as exc:
        logger.warning("Could not inspect the Playwright Chromium install: %s", exc)
        return {"installed": True, "chromium_version": None}


_request_id_lock = threading.Lock()
_last_timestamp = 0
_last_random = 0


def new_request_id() -> str:
    import secrets
    import time
    import uuid

    global _last_random, _last_timestamp
    timestamp = int(time.time() * 1000)
    with _request_id_lock:
        if timestamp > _last_timestamp:
            _last_timestamp = timestamp
            _last_random = secrets.randbits(74)
        else:
            timestamp = _last_timestamp
            _last_random = (_last_random + 1) & ((1 << 74) - 1)
        rand_a = _last_random >> 62
        rand_b = _last_random & ((1 << 62) - 1)
    value = (timestamp << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << 62) | rand_b
    return str(uuid.UUID(int=value))
