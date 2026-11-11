from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NewsSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    url: str
    category: str | None = None
    tier: Literal["legal", "gray", "blacklist"] = "legal"
    enabled: bool = True


class NewsRequest(BaseModel):
    """Filter and collection options for the news endpoints.

    Deprecated parameter aliases accepted for frontend compatibility
    (query and body): `categories`→`category`, `publishers`→`publisher`,
    `keywords`→`keyword`, `excludes`→`exclude`. The singular spellings are
    canonical and win when both are supplied. See note-update.md.
    """

    model_config = ConfigDict(extra="forbid")

    preset: str | None = None
    sources: list[NewsSource] | None = None
    since: str = "24h"
    until: str | None = None
    category: list[str] = Field(default_factory=list)
    publisher: list[str] = Field(default_factory=list)
    keyword: list[str] = Field(default_factory=list)
    exclude: list[str] = Field(default_factory=list)
    max_items: int = Field(default=200, ge=0)
    concurrency: int = Field(default=8, ge=1)
    timeout: int = Field(default=20, gt=0)
    retries: int = Field(default=3, ge=0)
    request_delay: float = Field(default=0.75, ge=0)
    strict_dates: bool = False
    detect_language: bool = False
    date_tz: str = "Asia/Jakarta"
    pretty: bool = False
    dry_run: bool = False

    @field_validator("since")
    @classmethod
    def validate_since(cls, value: str) -> str:
        from newsid.filters import FilterError, parse_duration

        try:
            parse_duration(value)
        except FilterError as exc:
            raise ValueError(str(exc)) from exc
        return value

    @field_validator("until")
    @classmethod
    def validate_until(cls, value: str | None) -> str | None:
        if value is not None:
            from newsid.filters import FilterError, parse_timestamp

            try:
                parse_timestamp(value)
            except FilterError as exc:
                raise ValueError(str(exc)) from exc
        return value


class Snapshot(BaseModel):
    written: bool
    filename: str
    path: Path
    dry_run: bool


class IGSContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    url: str


class NewsArticle(BaseModel):
    model_config = ConfigDict(extra="allow")

    categories: list[str] = Field(min_length=2, max_length=3)
    igs_context: list[IGSContext] = Field(default_factory=list)


class NewsData(BaseModel):
    model_config = ConfigDict(extra="allow")

    schema_version: int
    generated_at: str
    date: str
    date_tz: str
    query: dict[str, Any]
    stats: dict[str, int]
    sources: list[dict[str, Any]]
    items: list[NewsArticle]
