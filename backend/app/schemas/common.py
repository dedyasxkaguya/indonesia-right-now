from typing import Any

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class Envelope(BaseModel):
    ok: bool
    data: Any | None
    error: ErrorBody | None
    meta: dict[str, Any]


class Meta(BaseModel):
    request_id: str
    duration_ms: float
    service: str
    version: str
