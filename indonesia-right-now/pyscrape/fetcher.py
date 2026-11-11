from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from pyscrape.robots import USER_AGENT
from pyscrape.safety import validate_public_url


class FetchError(Exception):
    """A static request failed."""


class BotCheckError(Exception):
    """The server returned an access-denial or challenge page."""


MAX_RESPONSE_BYTES = 10 * 1024 * 1024


@dataclass
class FetchResult:
    html: str
    status_code: int
    final_url: str
    scroll_height: int = 0
    scroll_count: int = 0
    content_type: str = "text/html"


def detect_bot_check(html: str, status_code: int) -> bool:
    if status_code == 403:
        return True
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True).casefold()
    markers = (
        "captcha",
        "verify you are human",
        "verify that you are human",
        "unusual traffic",
        "checking your browser",
        "security challenge",
        "access denied",
    )
    return any(marker in text for marker in markers)


def fetch_static(
    url: str,
    *,
    timeout: float,
    on_redirect: Callable[[str], None] | None = None,
    user_agent: str = USER_AGENT,
    cache_dns: bool = True,
) -> FetchResult:
    current_url = url
    headers = {"User-Agent": user_agent}
    with requests.Session() as session:
        session.trust_env = False
        for _ in range(6):
            validate_public_url(current_url, cache_dns=cache_dns)
            try:
                with session.get(
                    current_url,
                    headers=headers,
                    timeout=timeout,
                    allow_redirects=False,
                    stream=True,
                ) as response:
                    if response.status_code in {301, 302, 303, 307, 308}:
                        location = response.headers.get("Location")
                        if not location:
                            raise FetchError(
                                "The server returned a redirect without a Location."
                            )
                        current_url = urljoin(current_url, location)
                        if on_redirect is not None:
                            on_redirect(current_url)
                        continue
                    if response.status_code == 403:
                        raise BotCheckError("The site returned an HTTP 403 response.")
                    if response.status_code >= 400:
                        raise FetchError(
                            f"The server returned HTTP {response.status_code}."
                        )

                    content_length = response.headers.get("Content-Length")
                    if content_length:
                        try:
                            if int(content_length) > MAX_RESPONSE_BYTES:
                                raise FetchError(
                                    "The response exceeded the 10 MiB size limit."
                                )
                        except ValueError:
                            pass
                    body = bytearray()
                    for chunk in response.iter_content(chunk_size=64 * 1024):
                        body.extend(chunk)
                        if len(body) > MAX_RESPONSE_BYTES:
                            raise FetchError(
                                "The response exceeded the 10 MiB size limit."
                            )
                    response.encoding = response.encoding or response.apparent_encoding
                    html = bytes(body).decode(
                        response.encoding or "utf-8", errors="replace"
                    )
                    if detect_bot_check(html, response.status_code):
                        raise BotCheckError(
                            "A bot-check or CAPTCHA page was detected; "
                            "no bypass was attempted."
                        )
                    return FetchResult(
                        html=html,
                        status_code=response.status_code,
                        final_url=response.url,
                        content_type=response.headers.get("Content-Type", "")
                        .split(";", 1)[0]
                        .strip()
                        .lower(),
                    )
            except requests.Timeout as exc:
                raise TimeoutError(f"Request timed out for {current_url}") from exc
            except requests.RequestException as exc:
                raise FetchError(f"Could not fetch {current_url}: {exc}") from exc
    raise FetchError("Too many redirects while fetching the page.")
