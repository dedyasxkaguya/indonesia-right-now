import json
import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

import structlog
import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.exceptions import HTTPException

from app import __version__
from app.config import Settings, get_settings
from app.errors import AppError
from app.middleware import RequestContextMiddleware
from app.responses import err
from app.routers.chat import build_router as build_chat_router
from app.routers.chat_irn import build_router as build_chat_irn_router
from app.routers.fetch import build_router as build_fetch_router
from app.routers.health import build_router as build_health_router
from app.routers.news import build_router as build_news_router
from app.routers.news_detail import build_router as build_news_detail_router
from app.routers.trending import build_router as build_trending_router
from app.runtime import validate_runtime


class JSONLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        message = record.getMessage()
        try:
            parsed = json.loads(message)
        except json.JSONDecodeError:
            parsed = {"event": message}
        data = parsed if isinstance(parsed, dict) else {"event": message}
        data.update(
            {
                "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
                "level": record.levelname,
                "logger": record.name,
            }
        )
        standard_fields = logging.LogRecord("", 0, "", 0, "", (), None).__dict__
        for key, value in record.__dict__.items():
            if key not in standard_fields and not key.startswith("_"):
                data[key] = value
        if record.exc_info:
            data["exception"] = self.formatException(record.exc_info)
        return json.dumps(data, ensure_ascii=True, default=str)


def _configure_logging(settings: Settings) -> None:
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    handler = logging.StreamHandler()
    if settings.log_format == "json":
        handler.setFormatter(JSONLogFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, settings.app_log_level, logging.INFO))
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            (
                structlog.processors.JSONRenderer()
                if settings.log_format == "json"
                else structlog.dev.ConsoleRenderer()
            ),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()
    validate_runtime(active_settings)
    _configure_logging(active_settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        validate_runtime(active_settings, startup=True)
        yield

    limiter = Limiter(
        key_func=get_remote_address,
        enabled=active_settings.app_env == "production",
        headers_enabled=True,
    )
    app = FastAPI(
        title=active_settings.app_name,
        version=__version__,
        docs_url=None,
        redoc_url=None,
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    app.state.settings = active_settings
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(HTTPException, _http_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(Exception, _unexpected_error_handler)
    app.add_middleware(RequestContextMiddleware, settings=active_settings)

    origins = [
        origin.strip()
        for origin in active_settings.app_cors_origins.split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if origins == ["*"] else origins,
        allow_credentials=origins != ["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(build_fetch_router(active_settings, limiter))
    app.include_router(build_news_router(active_settings, limiter))
    app.include_router(build_news_detail_router(active_settings, limiter))
    app.include_router(build_trending_router(active_settings, limiter))
    app.include_router(build_chat_router(active_settings, limiter))
    app.include_router(build_chat_irn_router(active_settings, limiter))
    app.include_router(build_health_router(active_settings, limiter))

    return app


async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request.state.exit_code = exc.details.get("exit_code")
    return err(
        request,
        request.app.state.settings,
        exc.code,
        exc.message,
        status_code=exc.status_code,
        details=exc.details,
    )


async def _http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    codes = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}
    return err(
        request,
        request.app.state.settings,
        codes.get(exc.status_code, "HTTP_ERROR"),
        str(exc.detail),
        status_code=exc.status_code,
        headers=exc.headers,
    )


async def _validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details: dict[str, Any] = {
        "errors": [
            {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
            for error in exc.errors()
        ]
    }
    return err(
        request,
        request.app.state.settings,
        "VALIDATION_ERROR",
        "The request contains invalid fields.",
        status_code=422,
        details=details,
    )


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return err(
        request,
        request.app.state.settings,
        "RATE_LIMITED",
        "Rate limit exceeded.",
        status_code=429,
        details={"limit": str(exc.limit)},
        headers={"Retry-After": "60"},
    )


async def _unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logging.getLogger(__name__).error(
        "Unhandled request error",
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return err(
        request,
        request.app.state.settings,
        "INTERNAL_ERROR",
        "An unexpected server error occurred.",
        status_code=500,
        details={},
    )


app = create_app()


def cli() -> None:
    settings = get_settings()
    validate_runtime(settings, startup=True)
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        workers=1,
        log_level=settings.app_log_level.casefold(),
    )
