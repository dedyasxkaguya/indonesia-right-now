from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class NewsItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    url: str
    publisher: str
    publisher_domain: str
    author: str | None = None
    published_at: str | None = None
    date_confidence: Literal["exact", "approx", "unknown"]
    summary: str | None = None
    content: str | None = None
    categories: list[str]
    language: str | None = None
    source_url: str
    fetched_at: str


class SourceRecord(BaseModel):
    url: str
    publisher: str | None = None
    status: Literal["ok", "error"]
    fetched_at: str
    items: int
    error: dict[str, str] | None = None
