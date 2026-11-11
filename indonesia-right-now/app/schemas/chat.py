
from pydantic import BaseModel, ConfigDict, Field

MAX_QUESTION_LENGTH = 2000
MAX_CONTEXT_LENGTH = 10000
MAX_MODE_LENGTH = 32
MAX_PAGE_CONTEXT_LENGTH = 64
MAX_DATASET_NAME_LENGTH = 128


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: str = Field(
        ...,
        min_length=1,
        max_length=MAX_MODE_LENGTH,
        description="Chat mode, e.g. 'IGS'",
    )
    page_context: str = Field(
        ...,
        min_length=1,
        max_length=MAX_PAGE_CONTEXT_LENGTH,
        description="Current page context, e.g. 'Ekonomi', 'Analitik'",
    )
    dataset_name: str = Field(
        ...,
        min_length=1,
        max_length=MAX_DATASET_NAME_LENGTH,
        description="Dataset being viewed, e.g. 'PDRB per Kapita'",
    )
    context_data: str = Field(
        ...,
        min_length=1,
        max_length=MAX_CONTEXT_LENGTH,
        description="Pre-summarized Markdown table or text of the visible data (max 10 rows / 3000 chars)",
    )
    question: str = Field(
        ...,
        min_length=1,
        max_length=MAX_QUESTION_LENGTH,
        description="User's question",
    )
    tool_call: str | None = Field(
        default=None,
        description="Optional tool call JSON if LLM requests aggregation",
    )


class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: str
    model: str
    scope_locked: bool
    duration_ms: int
    tool_execution_id: str | None = Field(
        default=None,
        description="ID of tool execution for tracking",
    )
