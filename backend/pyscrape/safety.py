import ipaddress
import socket
from urllib.parse import urlsplit


class UnsafeURLError(ValueError):
    """Raised when a URL is not a public HTTP(S) destination."""


def _lookup_addresses(hostname: str, port: int) -> tuple[str, ...]:
    try:
        results = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise UnsafeURLError(f"Could not resolve host {hostname!r}.") from exc
    addresses = tuple(dict.fromkeys(result[4][0] for result in results))
    if not addresses:
        raise UnsafeURLError(f"Host {hostname!r} did not resolve to an address.")
    return addresses


def _is_public_address(value: str) -> bool:
    try:
        address = ipaddress.ip_address(value)
    except ValueError as exc:
        raise UnsafeURLError("DNS returned an invalid IP address.") from exc

    if isinstance(address, ipaddress.IPv6Address):
        if address.ipv4_mapped is not None:
            address = address.ipv4_mapped
        elif (
            address.sixtofour is not None
            or address.teredo is not None
            or address in ipaddress.ip_network("64:ff9b::/96")
        ):
            return False
    return address.is_global and not (
        address.is_multicast
        or address.is_reserved
        or address.is_unspecified
        or address.is_loopback
        or address.is_link_local
    )


def resolve_public_addresses(
    url: str, *, cache_dns: bool | None = None
) -> tuple[str, ...]:
    """Return freshly resolved public addresses after validating every answer.

    ``cache_dns`` remains accepted for compatibility; DNS results are never
    cached because stale answers weaken the destination check.
    """
    del cache_dns
    if not isinstance(url, str) or any(
        ord(char) < 32 or ord(char) == 127 for char in url
    ):
        raise UnsafeURLError("URL contains invalid control characters.")
    try:
        parts = urlsplit(url)
    except ValueError as exc:
        raise UnsafeURLError("URL is malformed.") from exc
    if parts.scheme.casefold() not in {"http", "https"} or not parts.hostname:
        raise UnsafeURLError("Only public http:// and https:// URLs are supported.")
    if parts.username is not None or parts.password is not None:
        raise UnsafeURLError("URLs containing embedded credentials are not supported.")

    try:
        port = (
            parts.port
            if parts.port is not None
            else (443 if parts.scheme.casefold() == "https" else 80)
        )
    except ValueError as exc:
        raise UnsafeURLError("The URL contains an invalid port.") from exc

    hostname = parts.hostname.rstrip(".")
    if not hostname or "%" in hostname:
        raise UnsafeURLError("URL has an invalid hostname.")
    try:
        ascii_hostname = hostname.encode("idna").decode("ascii").lower()
    except UnicodeError as exc:
        raise UnsafeURLError(
            "URL hostname is not a valid internationalized domain."
        ) from exc
    if len(ascii_hostname) > 253 or any(
        not label or len(label) > 63 for label in ascii_hostname.split(".")
    ):
        raise UnsafeURLError("URL has an invalid hostname.")
    if ascii_hostname == "localhost" or ascii_hostname.endswith(
        (".localhost", ".local", ".internal")
    ):
        raise UnsafeURLError("Local and internal hostnames are not allowed.")

    try:
        literal_address = ipaddress.ip_address(ascii_hostname)
    except ValueError:
        labels = ascii_hostname.split(".")
        numeric_address_form = all(
            label.isdecimal()
            or (
                label.startswith("0x")
                and len(label) > 2
                and all(char in "0123456789abcdef" for char in label[2:])
            )
            for label in labels
        )
        if not numeric_address_form and (
            len(labels) < 2
            or any(
                not label
                or len(label) > 63
                or label.startswith("-")
                or label.endswith("-")
                or any(
                    not (char.isascii() and (char.isalnum() or char == "-"))
                    for char in label
                )
                for label in labels
            )
        ):
            raise UnsafeURLError("URL has an invalid DNS hostname.")
        addresses = _lookup_addresses(ascii_hostname, port)
    else:
        addresses = (str(literal_address),)

    for address in addresses:
        if not _is_public_address(address):
            raise UnsafeURLError(
                f"Refusing non-public destination {ascii_hostname!r} ({address})."
            )
    return addresses


def validate_public_url(url: str, *, cache_dns: bool | None = None) -> None:
    resolve_public_addresses(url, cache_dns=cache_dns)


def public_http_url(url: str, *, cache_dns: bool | None = None) -> bool:
    try:
        validate_public_url(url, cache_dns=cache_dns)
    except (UnsafeURLError, ValueError):
        return False
    return True
