import html2text
import trafilatura
from bs4 import BeautifulSoup

from pyscrape.config import OutputMode


def limit_content(content: str, max_chars: int) -> tuple[str, bool]:
    if max_chars < 0:
        raise ValueError("max_chars must be zero or greater")
    if max_chars == 0 or len(content) <= max_chars:
        return content, False
    return content[:max_chars], True


def extract_content(html: str, mode: OutputMode, *, url: str) -> str:
    if mode == "html":
        soup = BeautifulSoup(html, "html.parser")
        return str(soup)
    if mode == "text":
        soup = BeautifulSoup(html, "html.parser")
        return soup.get_text("\n", strip=True)
    if mode == "markdown":
        converter = html2text.HTML2Text()
        converter.body_width = 0
        converter.ignore_links = False
        return converter.handle(html).strip()
    if mode == "reader":
        result = trafilatura.extract(
            html,
            url=url,
            output_format="markdown",
            include_comments=False,
            include_tables=True,
        )
        return result.strip() if result else ""
    raise ValueError(f"Unsupported extraction mode: {mode}")
