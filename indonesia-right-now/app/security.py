import hmac
import logging
from urllib.parse import urlsplit

from app.errors import AppError
from pyscrape.safety import UnsafeURLError, resolve_public_addresses

logger = logging.getLogger(__name__)


def resolve_fetch_url(url: str, max_length: int) -> tuple[str, ...]:
    if len(url) > max_length:
        raise AppError(
            "FETCH_INVALID_URL",
            f"URL exceeds the {max_length}-character limit.",
            status_code=400,
            details={"url": url[:256]},
            exit_code=1,
        )
    try:
        parts = urlsplit(url)
    except ValueError as exc:
        raise AppError(
            "FETCH_INVALID_URL",
            "The URL is malformed.",
            status_code=400,
            details={"url": url[:256]},
            exit_code=1,
        ) from exc
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise AppError(
            "FETCH_INVALID_URL",
            "Only absolute HTTP(S) URLs are supported.",
            status_code=400,
            details={"url": url[:256]},
            exit_code=1,
        )
    if parts.username is not None or parts.password is not None:
        raise AppError(
            "FETCH_SSRF_BLOCKED",
            "URLs containing credentials are not allowed.",
            status_code=400,
            details={"url": url[:256]},
            exit_code=1,
        )

    host = parts.hostname.casefold().rstrip(".")
    try:
        return resolve_public_addresses(url, cache_dns=False)
    except (UnsafeURLError, ValueError) as exc:
        logger.warning(
            "Fetch destination rejected by URL safety policy for host %s: %s",
            host,
            exc,
            extra={"event": "fetch_url_blocked"},
        )
        raise AppError(
            "FETCH_SSRF_BLOCKED",
            "Target does not resolve exclusively to public addresses.",
            status_code=400,
            details={"url": url[:256]},
            exit_code=1,
        ) from exc


def validate_fetch_url(url: str, max_length: int) -> None:
    resolve_fetch_url(url, max_length)


def api_key_matches(expected: str, supplied: str | None) -> bool:
    if not expected:
        return True
    return supplied is not None and hmac.compare_digest(
        expected.encode("utf-8"), supplied.encode("utf-8")
    )
