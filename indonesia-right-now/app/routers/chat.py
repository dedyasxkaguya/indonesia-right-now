import logging
from typing import Any

from fastapi import APIRouter, Request
from pydantic import ValidationError
from slowapi import Limiter

from app.config import Settings
from app.errors import AppError
from app.responses import ok
from app.schemas.chat import ChatRequest
from app.services.chat import chat as chat_service

logger = logging.getLogger(__name__)

IGS_CHAT_RATE_LIMIT = "30/minute"


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


def build_router(settings: Settings, limiter: Limiter) -> APIRouter:
    router = APIRouter()

    async def post_chat(request: Request) -> Any:
        try:
            body = await request.json()
        except Exception as exc:
            raise AppError(
                "VALIDATION_ERROR",
                "The request body must contain valid JSON.",
                status_code=422,
                details={"errors": [{"loc": ["body"], "msg": "Invalid JSON"}]},
                exit_code=1,
            ) from exc
        try:
            chat_request = ChatRequest.model_validate(body)
        except ValidationError as exc:
            raise _validation_error(exc) from exc
        response = await chat_service(
            chat_request=chat_request,
            settings=settings,
            request=request,
        )
        return ok(request, settings, {
            "answer": response.answer,
            "model": response.model,
            "scope_locked": response.scope_locked,
            "duration_ms": response.duration_ms,
            "tool_execution_id": response.tool_execution_id,
        })

    if settings.app_env == "production":
        post_chat = limiter.limit(IGS_CHAT_RATE_LIMIT)(post_chat)
    router.add_api_route("/chat", post_chat, methods=["POST"])
    return router
