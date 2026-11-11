from dataclasses import dataclass
from typing import Literal

Engine = Literal["playwright", "static"]
OutputMode = Literal["text", "markdown", "html", "reader"]
ScrollMode = Literal["steps", "until-height-stable"]
WaitUntil = Literal["load", "domcontentloaded", "networkidle"]


@dataclass(frozen=True)
class ScrapeConfig:
    url: str
    scroll: int = 10
    scroll_mode: ScrollMode = "until-height-stable"
    engine: Engine = "playwright"
    mode: OutputMode = "markdown"
    max_chars: int = 20_000
    timeout: int = 60
    wait_until: WaitUntil = "networkidle"
    headless: bool = True
