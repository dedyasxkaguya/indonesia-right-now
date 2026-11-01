from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

import httpx
import trafilatura
from bs4 import BeautifulSoup

from app.security import resolve_fetch_url
from app.services.pinned_http import PinnedHTTPTransport

MAX_ARTICLE_RESPONSE_BYTES = 10 * 1024 * 1024
MAX_ARTICLE_REDIRECTS = 5
_REDIRECT_STATUSES = {301, 302, 303, 307, 308}
_ARTICLE_TYPES = {"article", "newsarticle", "report", "blogposting"}


class ArticleFetchError(Exception):
    pass


class ArticleContentTypeError(ArticleFetchError):
    pass


class ArticleResponseTooLarge(ArticleFetchError):
    pass


class ArticleRedirectError(ArticleFetchError):
    pass


class ArticleHTTPError(ArticleFetchError):
    pass


class ArticleNetworkError(ArticleFetchError):
    pass


@dataclass(frozen=True)
class FetchedArticle:
    requested_url: str
    final_url: str
    title: str | None
    author: str | None
    publisher: str | None
    published_at: str | None
    language: str | None
    text: str
    extraction_method: str
    http_status: int


def _article_metadata(soup: BeautifulSoup) -> dict[str, Any]:
    candidates: list[dict[str, Any]] = []
    for script in soup.select('script[type="application/ld+json"]'):
        raw = script.string or script.get_text()
        try:
            decoded = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue
        pending = decoded if isinstance(decoded, list) else [decoded]
        while pending:
            item = pending.pop()
            if not isinstance(item, dict):
                continue
            graph = item.get("@graph")
            if isinstance(graph, list):
                pending.extend(graph)
            kind = item.get("@type", [])
            kinds = [kind] if isinstance(kind, str) else kind
            if isinstance(kinds, list) and any(
                str(value).rstrip("/").rsplit("/", 1)[-1].casefold() in _ARTICLE_TYPES
                for value in kinds
            ):
                candidates.append(item)

    article = candidates[0] if candidates else {}
    author_value = article.get("author")
    if isinstance(author_value, list):
        author_value = ", ".join(
            item.get("name", "").strip()
            for item in author_value
            if isinstance(item, dict) and isinstance(item.get("name"), str)
        )
    elif isinstance(author_value, dict):
        author_value = author_value.get("name")

    publisher = article.get("publisher")
    if isinstance(publisher, dict):
        publisher = publisher.get("name")

    return {
        "title": article.get("headline") or article.get("name"),
        "author": author_value,
        "publisher": publisher,
        "published_at": article.get("datePublished") or article.get("dateCreated"),
        "text": article.get("articleBody"),
    }


def _meta_content(soup: BeautifulSoup, *selectors: str) -> str | None:
    for selector in selectors:
        element = soup.select_one(selector)
        value = element.get("content") if element else None
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _clean_extracted_text(text: str) -> str:
    paragraphs: list[str] = []
    seen: set[str] = set()
    for paragraph in re.split(r"\n\s*\n", text):
        normalized = " ".join(paragraph.split())
        key = normalized.casefold()
        if normalized and key not in seen:
            seen.add(key)
            paragraphs.append(normalized)
    return "\n\n".join(paragraphs)


def _deduplicate_html_paragraphs(soup: BeautifulSoup) -> None:
    seen: set[str] = set()
    for paragraph in soup.select("p"):
        normalized = " ".join(paragraph.get_text(" ", strip=True).split()).casefold()
        if normalized and normalized in seen:
            paragraph.decompose()
        elif normalized:
            seen.add(normalized)


def extract_article(
    html: str, final_url: str, requested_url: str, status: int
) -> FetchedArticle:
    soup = BeautifulSoup(html, "html.parser")
    _deduplicate_html_paragraphs(soup)
    metadata = _article_metadata(soup)
    extracted = trafilatura.bare_extraction(
        str(soup),
        url=final_url,
        output_format="python",
        with_metadata=True,
        deduplicate=True,
    )
    extracted_data = (
        extracted.as_dict()
        if extracted is not None and not isinstance(extracted, dict)
        else extracted or {}
    )
    raw_text = extracted_data.get("text")
    extraction_method = "trafilatura"
    if not raw_text:
        raw_text = metadata.get("text")
        extraction_method = "jsonld_article_body"
    if not isinstance(raw_text, str):
        raw_text = ""
    text = _clean_extracted_text(str(raw_text))
    if not text:
        raise ArticleFetchError("No readable article text was extracted.")

    title = (
        metadata.get("title")
        or extracted_data.get("title")
        or _meta_content(
            soup,
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
        )
        or (soup.title.get_text(" ", strip=True) if soup.title else None)
    )
    author = (
        metadata.get("author")
        or extracted_data.get("author")
        or _meta_content(soup, 'meta[name="author"]', 'meta[property="article:author"]')
    )
    publisher = (
        metadata.get("publisher")
        or extracted_data.get("sitename")
        or _meta_content(
            soup,
            'meta[property="og:site_name"]',
            'meta[name="application-name"]',
        )
    )
    published_at = (
        metadata.get("published_at")
        or extracted_data.get("date")
        or _meta_content(
            soup,
            'meta[property="article:published_time"]',
            'meta[name="date"]',
            'meta[name="pubdate"]',
        )
    )
    language = (
        extracted_data.get("language")
        or (soup.html.get("lang") if soup.html else None)
        or _meta_content(soup, 'meta[property="og:locale"]')
    )
    return FetchedArticle(
        requested_url=requested_url,
        final_url=final_url,
        title=title if isinstance(title, str) and title.strip() else None,
        author=author if isinstance(author, str) and author.strip() else None,
        publisher=publisher
        if isinstance(publisher, str) and publisher.strip()
        else None,
        published_at=(
            published_at
            if isinstance(published_at, str) and published_at.strip()
            else None
        ),
        language=language if isinstance(language, str) and language.strip() else None,
        text=text,
        extraction_method=extraction_method,
        http_status=status,
    )


async def _fetch_one(
    url: str, addresses: tuple[str, ...], timeout: float, user_agent: str
) -> tuple[int, str, str, str]:
    last_error: Exception | None = None
    for address in addresses:
        try:
            async with (
                httpx.AsyncClient(
                    transport=PinnedHTTPTransport(address),
                    follow_redirects=False,
                    trust_env=False,
                    timeout=httpx.Timeout(timeout),
                    headers={
                        "User-Agent": user_agent,
                        "Accept": "text/html,application/xhtml+xml",
                    },
                ) as client,
                client.stream("GET", url) as response,
            ):
                content_type = (
                    response.headers.get("content-type", "")
                    .split(";", 1)[0]
                    .strip()
                    .casefold()
                )
                if response.status_code in _REDIRECT_STATUSES:
                    return (
                        response.status_code,
                        response.headers.get("location", ""),
                        content_type,
                        "",
                    )
                if not 200 <= response.status_code < 300:
                    raise ArticleHTTPError(
                        f"Article server returned HTTP {response.status_code}."
                    )
                if content_type not in {"text/html", "application/xhtml+xml"}:
                    raise ArticleContentTypeError(
                        f"Unsupported article content type: {content_type or 'unknown'}."
                    )
                length_header = response.headers.get("content-length")
                if length_header:
                    try:
                        content_length = int(length_header)
                    except ValueError as exc:
                        raise ArticleFetchError(
                            "Article response had an invalid content length."
                        ) from exc
                    if content_length > MAX_ARTICLE_RESPONSE_BYTES:
                        raise ArticleResponseTooLarge(
                            "Article response exceeds the 10 MiB limit."
                        )
                chunks: list[bytes] = []
                total = 0
                async for chunk in response.aiter_bytes(64 * 1024):
                    total += len(chunk)
                    if total > MAX_ARTICLE_RESPONSE_BYTES:
                        raise ArticleResponseTooLarge(
                            "Article response exceeds the 10 MiB limit."
                        )
                    chunks.append(chunk)
                encoding = response.encoding or "utf-8"
                body = b"".join(chunks)
                try:
                    decoded_body = body.decode(encoding, errors="replace")
                except LookupError:
                    decoded_body = body.decode("utf-8", errors="replace")
                return (
                    response.status_code,
                    "",
                    content_type,
                    decoded_body,
                )
        except (ArticleHTTPError, ArticleContentTypeError, ArticleResponseTooLarge):
            raise
        except httpx.TimeoutException as exc:
            raise TimeoutError("The article server timed out.") from exc
        except (httpx.HTTPError, OSError, UnicodeError) as exc:
            last_error = exc
    if last_error is not None:
        raise ArticleNetworkError(
            "The article could not be fetched from its public host."
        ) from last_error
    raise ArticleFetchError("No validated address was available for the article host.")


async def fetch_article(
    url: str,
    *,
    max_url_length: int,
    timeout: float,
    user_agent: str,
) -> FetchedArticle:
    current_url = url
    redirects = 0
    while True:
        addresses = await asyncio.to_thread(
            resolve_fetch_url, current_url, max_url_length
        )
        status, location, content_type, html = await _fetch_one(
            current_url, addresses, timeout, user_agent
        )
        if status in _REDIRECT_STATUSES:
            if redirects >= MAX_ARTICLE_REDIRECTS:
                raise ArticleRedirectError("Article redirected too many times.")
            if not location:
                raise ArticleRedirectError(
                    "Article redirect did not include a destination."
                )
            current_url = urljoin(current_url, location)
            redirects += 1
            continue
        if not content_type:
            raise ArticleContentTypeError(
                "Article response did not include a supported content type."
            )
        return await asyncio.to_thread(extract_article, html, current_url, url, status)
