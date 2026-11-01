import json
import logging
import time

from fastapi import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import Settings
from app.responses import err
from app.runtime import new_request_id
from app.security import api_key_matches

logger = logging.getLogger("indonesia-right-now.access")


class RequestContextMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings) -> None:
        super().__init__(app)
        self.settings = settings

    async def dispatch(self, request: Request, call_next) -> Response:
        started = time.perf_counter()
        request.state.started_at = started
        supplied_id = request.headers.get("X-Request-ID", "")
        request_id = (
            supplied_id
            if supplied_id and len(supplied_id) <= 128 and supplied_id.isprintable()
            else new_request_id()
        )
        request.state.request_id = request_id

        if request.url.path != "/health" and not api_key_matches(
            self.settings.api_key, request.headers.get("X-API-Key")
        ):
            response = err(
                request,
                self.settings,
                "UNAUTHORIZED",
                "A valid X-API-Key header is required.",
                status_code=401,
            )
        else:
            response = await call_next(request)

        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = str(duration_ms)
        try:
            client_ip = request.client.host if request.client else None
            log_record = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
                "user_agent": request.headers.get("user-agent"),
                "exit_code": getattr(request.state, "exit_code", None),
            }
            logger.info(json.dumps(log_record, ensure_ascii=True))
        except (TypeError, ValueError):
            logger.exception("Could not serialize access log record")
        return response
