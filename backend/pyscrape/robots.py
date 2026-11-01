from urllib.parse import urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

import requests

from pyscrape.safety import validate_public_url

USER_AGENT = "pyscrape/0.1 (+public-page content extraction)"
MAX_ROBOTS_BYTES = 512 * 1024


class RobotsError(Exception):
    """Base class for robots policy lookup errors."""


class RobotsDisallowed(RobotsError):
    """The site's robots.txt disallows this URL."""


class RobotsFetchError(RobotsError):
    """robots.txt could not be checked safely."""


def check_robots(
    url: str,
    *,
    timeout: float = 10,
    user_agent: str = USER_AGENT,
    cache_dns: bool = True,
) -> None:
    parts = urlsplit(url)
    robots_url = urlunsplit((parts.scheme, parts.netloc, "/robots.txt", "", ""))
    try:
        validate_public_url(robots_url, cache_dns=cache_dns)
        with requests.Session() as session:
            session.trust_env = False
            with session.get(
                robots_url,
                headers={"User-Agent": user_agent},
                timeout=timeout,
                allow_redirects=False,
                stream=True,
            ) as response:
                if response.status_code in {401, 403}:
                    raise RobotsDisallowed(
                        "robots.txt does not permit access to this site."
                    )
                if 300 <= response.status_code < 400:
                    raise RobotsFetchError(
                        "robots.txt redirected; refusing an unchecked policy."
                    )
                if response.status_code >= 500:
                    raise RobotsFetchError(
                        f"robots.txt returned HTTP {response.status_code}; "
                        "refusing to proceed."
                    )
                if response.status_code == 404 or response.status_code >= 400:
                    return

                body = bytearray()
                for chunk in response.iter_content(chunk_size=16 * 1024):
                    body.extend(chunk)
                    if len(body) > MAX_ROBOTS_BYTES:
                        raise RobotsFetchError(
                            "robots.txt exceeded the 512 KiB size limit."
                        )
                response.encoding = response.encoding or response.apparent_encoding
                robots_text = bytes(body).decode(
                    response.encoding or "utf-8", errors="replace"
                )
    except (requests.RequestException, ValueError) as exc:
        raise RobotsFetchError(f"Could not check robots.txt: {exc}") from exc

    parser = RobotFileParser()
    parser.set_url(robots_url)
    parser.parse(robots_text.splitlines())
    if not parser.can_fetch(user_agent, url):
        raise RobotsDisallowed(f"robots.txt disallows scraping {url}")
