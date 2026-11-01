import logging

from fastapi import APIRouter, Request
from slowapi import Limiter

from app.config import Settings
from app.responses import ok
from app.runtime import playwright_info

logger = logging.getLogger(__name__)


def build_router(settings: Settings, limiter: Limiter) -> APIRouter:
    router = APIRouter()

    async def health(request: Request):
        return ok(request, settings, {"status": "up", "env": settings.app_env})

    async def meta(request: Request):
        data = {
            "name": settings.app_name,
            "version": "0.1.0",
            "env": settings.app_env,
            "workers": 1,
            "playwright": await playwright_info(),
        }
        return ok(request, settings, data)

    if settings.app_env == "production":
        meta = limiter.limit(settings.rate_limit_health)(meta)
    router.add_api_route("/health", health, methods=["GET"])
    router.add_api_route("/meta", meta, methods=["GET"])
    return router
