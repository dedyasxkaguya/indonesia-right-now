from time import perf_counter
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

from app import __version__
from app.config import Settings


def _meta(request: Request, settings: Settings) -> dict[str, Any]:
    started = getattr(request.state, "started_at", None)
    duration_ms = round((perf_counter() - started) * 1000, 2) if started else 0
    meta = {
        "request_id": getattr(request.state, "request_id", "unknown"),
        "duration_ms": duration_ms,
        "service": settings.app_name,
        "version": __version__,
    }
    ai_meta = getattr(request.state, "ai", None)
    if ai_meta is not None:
        meta["ai"] = ai_meta
    return meta


def ok(request: Request, settings: Settings, data: Any) -> JSONResponse:
    return JSONResponse(
        {"ok": True, "data": data, "error": None, "meta": _meta(request, settings)}
    )


def err(
    request: Request,
    settings: Settings,
    code: str,
    message: str,
    *,
    status_code: int,
    details: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        {
            "ok": False,
            "data": None,
            "error": {"code": code, "message": message, "details": details or {}},
            "meta": _meta(request, settings),
        },
        status_code=status_code,
        headers=headers,
    )
