import asyncio
import base64
import hashlib
import json
import logging
import time
from typing import Any

from bs4 import BeautifulSoup
from fastapi import APIRouter, Request
from pydantic import ValidationError
from slowapi import Limiter

from app.config import Settings
from app.errors import AppError
from app.responses import ok
from app.schemas.fetch import FetchRequest
from app.security import validate_fetch_url
from app.services.ai import (
    AIConfigurationError,
    AIExtractionError,
    AIGuardError,
    AIWriteError,
    run_pipeline,
)

logger = logging.getLogger(__name__)


def _validation_error(exc: ValidationError) -> AppError:
    return AppError(
        "VALIDATION_ERROR",
        "The request contains invalid fields.",
        status_code=422,
        details={
            "errors": [
                {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
                for error in exc.errors()
            ]
        },
        exit_code=1,
    )


def _parse_query(request: Request) -> dict[str, Any]:
    try:
        parsed = FetchRequest.model_validate(dict(request.query_params))
    except ValidationError as exc:
        raise _validation_error(exc) from exc
    return parsed.model_dump(exclude_unset=True)


async def _parse_post(request: Request) -> FetchRequest:
    query = dict(request.query_params)
    raw_body = await request.body()
    if raw_body:
        try:
            body_value = json.loads(raw_body)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise AppError(
                "VALIDATION_ERROR",
                "The request body must contain valid JSON.",
                status_code=422,
                details={"errors": [{"loc": ["body"], "msg": "Invalid JSON"}]},
                exit_code=1,
            ) from exc
        if not isinstance(body_value, dict):
            raise AppError(
                "VALIDATION_ERROR",
                "The request body must be a JSON object.",
                status_code=422,
                details={"errors": [{"loc": ["body"], "msg": "Expected an object"}]},
                exit_code=1,
            )
        body = body_value
    else:
        body = {}
    try:
        return FetchRequest.model_validate({**query, **body})
    except ValidationError as exc:
        raise _validation_error(exc) from exc


def _required_url(options: FetchRequest) -> str:
    if not options.url:
        raise AppError(
            "VALIDATION_ERROR",
            "The url field is required.",
            status_code=422,
            details={"errors": [{"loc": ["url"], "msg": "Field required"}]},
            exit_code=1,
        )
    return options.url


def _run_fetch(options: FetchRequest, settings: Settings) -> dict[str, Any]:
    url = _required_url(options)
    validate_fetch_url(url, settings.fetch_max_url_length)
    started = time.perf_counter()
    engine = "static" if options.static else options.engine
    timeout = options.timeout or settings.pyscrape_default_timeout
    requested_max_chars = 0 if options.max_chars is None else options.max_chars
    max_chars = (
        min(settings.pyscrape_max_chars, requested_max_chars)
        if settings.pyscrape_max_chars > 0 and requested_max_chars > 0
        else settings.pyscrape_max_chars
        if settings.pyscrape_max_chars > 0
        else requested_max_chars
    )
    screenshot_bytes: bytes | None = None
    browser_error: type[Exception] | None = None

    try:
        from pyscrape.extract import extract_content, limit_content
        from pyscrape.fetcher import BotCheckError, FetchError, fetch_static
        from pyscrape.robots import (
            RobotsDisallowed,
            RobotsFetchError,
            check_robots,
        )
        from pyscrape.safety import UnsafeURLError

        if options.check_robots:
            check_robots(
                url,
                timeout=min(timeout, 10),
                user_agent=settings.pyscrape_ua,
                cache_dns=False,
            )
        if engine == "static":
            if options.screenshot:
                raise AppError(
                    "VALIDATION_ERROR",
                    "Screenshots require the Playwright engine.",
                    status_code=422,
                    details={"url": url},
                    exit_code=1,
                )

            def redirect_policy(target: str) -> None:
                validate_fetch_url(target, settings.fetch_max_url_length)
                if options.check_robots:
                    check_robots(
                        target,
                        timeout=min(timeout, 10),
                        user_agent=settings.pyscrape_ua,
                        cache_dns=False,
                    )

            fetched = fetch_static(
                url,
                timeout=timeout,
                on_redirect=redirect_policy,
                user_agent=settings.pyscrape_ua,
                cache_dns=False,
            )
        else:
            from pyscrape.browser import BrowserError, fetch_browser

            browser_error = BrowserError

            fetched = fetch_browser(
                url,
                max_steps=options.scroll,
                scroll_mode=options.scroll_mode,
                wait_until=options.wait_until,
                timeout=timeout,
                headless=options.headless,
                screenshot=None,
                check_robots_enabled=options.check_robots,
                screenshot_inline=options.screenshot,
                user_agent=settings.pyscrape_ua,
                cache_dns=False,
            )
            screenshot_bytes = fetched.screenshot_png
        content_type = fetched.content_type.strip().casefold()
        if content_type and not (
            content_type.startswith("text/")
            or content_type
            in {
                "application/xhtml+xml",
                "application/xml",
                "application/rss+xml",
                "application/atom+xml",
            }
        ):
            raise AppError(
                "FETCH_UNSUPPORTED_CONTENT_TYPE",
                "The response is not a supported text or HTML content type.",
                status_code=415,
                details={"url": url, "content_type": content_type},
                exit_code=1,
            )
        content = extract_content(fetched.html, options.mode, url=fetched.final_url)
        content, truncated = limit_content(content, max_chars)
        if not content.strip():
            raise AppError(
                "FETCH_NO_CONTENT",
                "No content was extracted from the page.",
                status_code=422,
                details={"url": url},
                exit_code=5,
            )
    except AppError:
        raise
    except RobotsDisallowed as exc:
        raise AppError(
            "FETCH_ROBOTS_DISALLOWED",
            str(exc),
            status_code=403,
            details={"url": url},
            exit_code=3,
        ) from exc
    except UnsafeURLError as exc:
        raise AppError(
            "FETCH_SSRF_BLOCKED",
            "The request was blocked by URL safety checks.",
            status_code=400,
            details={"url": url},
            exit_code=1,
        ) from exc
    except BotCheckError as exc:
        raise AppError(
            "FETCH_FORBIDDEN",
            str(exc),
            status_code=403,
            details={"url": url},
            exit_code=2,
        ) from exc
    except (TimeoutError, RobotsFetchError) as exc:
        status = 504 if isinstance(exc, TimeoutError) else 502
        code = "FETCH_TIMEOUT" if status == 504 else "FETCH_NETWORK"
        exit_code = 4 if status == 504 else 1
        raise AppError(
            code,
            str(exc),
            status_code=status,
            details={"url": url},
            exit_code=exit_code,
        ) from exc
    except (FetchError, OSError) as exc:
        raise AppError(
            "FETCH_NETWORK",
            str(exc),
            status_code=502,
            details={"url": url},
            exit_code=1,
        ) from exc
    except Exception as exc:
        if browser_error is not None and isinstance(exc, browser_error):
            raise AppError(
                "FETCH_NETWORK",
                str(exc),
                status_code=502,
                details={"url": url},
                exit_code=1,
            ) from exc
        logger.exception("fetch extraction failed")
        raise AppError(
            "FETCH_INTERNAL",
            "The page could not be processed.",
            status_code=500,
            details={"url": url, "exception": type(exc).__name__},
            exit_code=1,
        ) from exc

    soup = BeautifulSoup(fetched.html, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else None
    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    return {
        "url": url,
        "final_url": fetched.final_url,
        "mode": options.mode,
        "engine": engine,
        "title": title,
        "content": content,
        "truncated": truncated,
        "length": len(content),
        "http_status": fetched.status_code,
        "screenshot_png_base64": (
            base64.b64encode(screenshot_bytes).decode("ascii")
            if screenshot_bytes is not None
            else None
        ),
        "duration_ms": duration_ms,
    }


def build_router(settings: Settings, limiter: Limiter) -> APIRouter:
    router = APIRouter()

    async def process_fetch(request: Request, options: FetchRequest) -> dict[str, Any]:
        url = _required_url(options)
        if not settings.ai_enabled:
            validate_fetch_url(url, settings.fetch_max_url_length)
            raise AppError(
                "FETCH_AI_DISABLED",
                "AI processing is disabled.",
                status_code=503,
                details={"url": url},
                exit_code=1,
            )
        try:
            data = await asyncio.wait_for(
                asyncio.to_thread(_run_fetch, options, settings),
                timeout=settings.app_request_timeout,
            )
            raw_content = data.pop("content")
            cache_descriptor = json.dumps(
                {
                    "url": options.url,
                    "final_url": data["final_url"],
                    "mode": options.mode,
                    "engine": data["engine"],
                    "scroll": options.scroll,
                    "max_chars": options.max_chars,
                    "content_length": data["length"],
                    "content_sha256": hashlib.sha256(
                        raw_content.encode("utf-8")
                    ).hexdigest(),
                },
                sort_keys=True,
                separators=(",", ":"),
            )
            result = await asyncio.wait_for(
                run_pipeline(
                    raw_content,
                    request_id=request.state.request_id,
                    source_url=data["final_url"],
                    cache_key=hashlib.sha256(
                        cache_descriptor.encode("utf-8")
                    ).hexdigest(),
                    output_dir=settings.ai_output_dir,
                    save=options.save,
                    settings=settings,
                ),
                timeout=settings.app_request_timeout,
            )
        except TimeoutError as exc:
            raise AppError(
                "REQUEST_TIMEOUT",
                "The request exceeded the configured time limit.",
                status_code=504,
                details={"url": url},
                exit_code=4,
            ) from exc
        except AIGuardError as exc:
            raise AppError(
                "FETCH_AI_GUARD_FAILED",
                "The page could not be processed because its safety check failed.",
                status_code=502,
                details={"url": url},
                exit_code=1,
            ) from exc
        except AIConfigurationError as exc:
            raise AppError(
                "FETCH_AI_CONFIG",
                str(exc),
                status_code=500,
                details={"url": url},
                exit_code=1,
            ) from exc
        except AIExtractionError as exc:
            raise AppError(
                "FETCH_AI_EXTRACTOR_FAILED",
                str(exc),
                status_code=502,
                details={"url": url},
                exit_code=1,
            ) from exc
        except AIWriteError as exc:
            raise AppError(
                "FETCH_AI_WRITE_FAILED",
                str(exc),
                status_code=500,
                details={"url": url},
                exit_code=1,
            ) from exc

        ai = {
            "guard_status": result.guard.status,
            "guard_confidence": result.guard.confidence,
            "chunks_total": result.extraction.chunks_total,
            "chunks_ok": result.extraction.chunks_ok,
            "chunks_failed": result.extraction.chunks_failed,
            "items_raw": result.extraction.items_raw,
            "items_kept": len(result.items),
            "items_omitted": result.items_omitted,
            "deduped": result.deduped,
            "language": result.extraction.language,
            "model": result.extraction.model,
            "cached": result.cached,
            "duration_ms": result.duration_ms,
        }
        request.state.ai = ai
        if result.guard.status == "blocked":
            raise AppError(
                "FETCH_AI_GUARD_BLOCKED",
                "Scraped content was blocked by the AI prompt-injection guard.",
                status_code=403,
                details={
                    "exit_code": 2,
                    "reason": (
                        result.guard.reason or "Guard confidence exceeded threshold"
                    )[:200],
                },
                exit_code=2,
            )
        data["news_items"] = [item.model_dump(mode="json") for item in result.items]
        data["raw"] = raw_content if options.include_raw else None
        data["ai"] = ai
        data["saved"] = result.saved
        data["duration_ms"] = round(
            (time.perf_counter() - request.state.started_at) * 1000, 2
        )
        return data

    async def get_fetch(request: Request):
        try:
            options = FetchRequest.model_validate(_parse_query(request))
        except ValidationError as exc:
            raise _validation_error(exc) from exc
        data = await process_fetch(request, options)
        request.state.exit_code = 0
        return ok(request, settings, data)

    async def post_fetch(request: Request):
        options = await _parse_post(request)
        data = await process_fetch(request, options)
        request.state.exit_code = 0
        return ok(request, settings, data)

    if settings.app_env == "production":
        get_fetch = limiter.limit(settings.rate_limit_fetch)(get_fetch)
        post_fetch = limiter.limit(settings.rate_limit_fetch)(post_fetch)
    router.add_api_route("/fetch", get_fetch, methods=["GET"])
    router.add_api_route("/fetch", post_fetch, methods=["POST"])
    return router
