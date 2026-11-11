from typing import Any, Literal

from pydantic import BaseModel


class ArticleDetailData(BaseModel):
    requested_url: str
    final_url: str
    title: str | None
    author: str | None
    publisher: str | None
    published_at: str | None
    language: str | None
    content: str
    extracted_length: int
    cleaned_length: int
    completeness: Literal["not_verified"]
    extraction_method: Literal["trafilatura", "jsonld_article_body"]
    ai_model: str
    http_status: int


class ArticleDetailEnvelope(BaseModel):
    ok: Literal[True]
    data: ArticleDetailData
    error: None
    meta: dict[str, Any]
