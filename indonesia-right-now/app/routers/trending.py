import asyncio
import time
from typing import Any

from fastapi import APIRouter, Request
from slowapi import Limiter

from app.config import Settings
from app.errors import AppError
from app.responses import ok
from app.services.trending import generate_trending


def build_router(settings: Settings, limiter: Limiter) -> APIRouter:
    from app.routers.news import _run_news
    from app.schemas.news import NewsRequest
    from newsid.fetcher import _PoliteLimiter

    router = APIRouter()
    rate_limiter = _PoliteLimiter(0)
    cache_lock = asyncio.Lock()
    cache: dict[str, Any] = {"expires_at": 0.0, "data": None}

    async def get_trending(request: Request):
        async with cache_lock:
            cached = cache["data"]
            if cached is not None and time.monotonic() < cache["expires_at"]:
                return ok(request, settings, cached)

            if not settings.ai_enabled:
                raise AppError(
                    "AI_DISABLED",
                    "Trending news requires AI to be enabled.",
                    status_code=503,
                )

            news = await _run_news(
                NewsRequest(
                    since="7d",
                    strict_dates=True,
                    max_items=200,
                    dry_run=True,
                ),
                settings,
                rate_limiter,
            )
            response = await generate_trending(news["items"], settings)
            data = response.model_dump(mode="json")
            cache["data"] = data
            cache["expires_at"] = time.monotonic() + settings.trending_cache_ttl
            return ok(request, settings, data)

    if settings.app_env == "production":
        get_trending = limiter.limit(settings.rate_limit_news)(get_trending)
    router.add_api_route("/news/trending", get_trending, methods=["GET"])
    return router
