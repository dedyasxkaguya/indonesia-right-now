from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FetchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str | None = None
    mode: Literal["text", "markdown", "html", "reader"] = "markdown"
    engine: Literal["playwright", "static"] = "playwright"
    static: bool = False
    scroll: int = Field(default=30, ge=0)
    scroll_mode: Literal["steps", "until-height-stable"] = "until-height-stable"
    max_chars: int | None = Field(default=None, ge=0)
    timeout: int | None = Field(default=None, gt=0)
    wait_until: Literal["load", "domcontentloaded", "networkidle"] = "networkidle"
    headless: bool = True
    check_robots: bool = False
    screenshot: bool = False
    include_raw: bool = False
    save: bool = True
