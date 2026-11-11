from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MAX_QUESTION_LENGTH = 2000
MAX_PAGE_CONTEXT_LENGTH = 64
MAX_VISIBLE_ARTICLES = 10
MAX_TITLE_LENGTH = 400
MAX_PUBLISHER_LENGTH = 160
MAX_CATEGORY_LENGTH = 120
MAX_SUMMARY_LENGTH = 1000
MAX_URL_LENGTH = 2048
MAX_PUBLISHED_AT_LENGTH = 64


class VisibleArticle(BaseModel):
    """One article card currently visible on the page.

    Deliberately narrow: the frontend sends card metadata, never full article
    text. Unknown fields are rejected so a contract drift surfaces as 422.
    """

    model_config = ConfigDict(extra="forbid")

    title: str = Field(
        ...,
        min_length=1,
        max_length=MAX_TITLE_LENGTH,
        description="Article headline as shown on the page",
    )
    publisher: str | None = Field(
        default=None, max_length=MAX_PUBLISHER_LENGTH
    )
    category: str | None = Field(default=None, max_length=MAX_CATEGORY_LENGTH)
    summary: str | None = Field(default=None, max_length=MAX_SUMMARY_LENGTH)
    url: str | None = Field(default=None, max_length=MAX_URL_LENGTH)
    published_at: str | None = Field(
        default=None, max_length=MAX_PUBLISHED_AT_LENGTH
    )


class ChatIRNRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["IRN"] = Field(
        ...,
        description="Chat mode. Always 'IRN' for this endpoint.",
    )
    page_context: str = Field(
        ...,
        min_length=1,
        max_length=MAX_PAGE_CONTEXT_LENGTH,
        description="Visible page, e.g. 'Hari Ini', 'Dashboard', 'Artikel'",
    )
    visible_articles: list[VisibleArticle] = Field(
        default_factory=list,
        max_length=MAX_VISIBLE_ARTICLES,
        description="At most 10 article cards visible on the page",
    )
    question: str = Field(
        ...,
        min_length=1,
        max_length=MAX_QUESTION_LENGTH,
        description="User's question",
    )


class ChatIRNResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: str
    model: str
    scope_locked: bool
    duration_ms: int
    tool_execution_ids: list[str] = Field(
        default_factory=list,
        description="One ID per executed tool call, in execution order",
    )
