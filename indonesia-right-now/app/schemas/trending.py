from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.news import IGSContext


class TrendingSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    publisher: str
    title: str
    url: str
    published_at: str | None
    categories: list[str] = Field(min_length=2, max_length=3)
    igs_context: list[IGSContext] = Field(default_factory=list)


class SuperArticle(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    topic_title: str
    summary: str
    article_count: int = Field(ge=1)
    sources: list[TrendingSource] = Field(min_length=1)
    categories: list[str] = Field(min_length=2, max_length=3)
    igs_context: list[IGSContext] = Field(default_factory=list)


class TrendingResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    generated_at: str
    window: str = "7d"
    super_articles: list[SuperArticle]


class TrendingClusterEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    clusters: list[list[str]] = Field(default_factory=list)

    @field_validator("clusters")
    @classmethod
    def validate_clusters(cls, value: list[list[str]]) -> list[list[str]]:
        if any(not cluster or len(set(cluster)) != len(cluster) for cluster in value):
            raise ValueError("clusters must contain non-empty groups of unique IDs")
        return value
