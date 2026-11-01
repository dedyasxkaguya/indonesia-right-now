from __future__ import annotations

import ssl
from collections.abc import AsyncIterator, Iterable

import httpcore
import httpx

_CORE_HTTP_ERRORS = (
    httpcore.TimeoutException,
    httpcore.NetworkError,
    httpcore.ProtocolError,
    httpcore.UnsupportedProtocol,
)


class _PinnedNetworkBackend(httpcore.AsyncNetworkBackend):
    def __init__(self, address: str) -> None:
        self.address = address
        self.backend = httpcore.AnyIOBackend()

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options: Iterable[httpcore.SOCKET_OPTION] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        del host
        return await self.backend.connect_tcp(
            self.address,
            port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options,
        )

    async def connect_unix_socket(
        self,
        path: str,
        timeout: float | None = None,
        socket_options: Iterable[httpcore.SOCKET_OPTION] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        del path, timeout, socket_options
        raise OSError("Unix-domain sockets are not supported for article fetching.")

    async def sleep(self, seconds: float) -> None:
        await self.backend.sleep(seconds)


def _raise_httpx_error(exc: Exception, request: httpx.Request) -> None:
    if isinstance(exc, httpcore.TimeoutException):
        raise httpx.TimeoutException(str(exc), request=request) from exc
    raise httpx.TransportError(str(exc), request=request) from exc


class _CoreResponseStream(httpx.AsyncByteStream):
    def __init__(self, response: httpcore.Response, request: httpx.Request) -> None:
        self.response = response
        self.request = request

    async def __aiter__(self) -> AsyncIterator[bytes]:
        try:
            async for chunk in self.response.stream:
                yield chunk
        except _CORE_HTTP_ERRORS as exc:
            _raise_httpx_error(exc, self.request)

    async def aclose(self) -> None:
        try:
            await self.response.aclose()
        except _CORE_HTTP_ERRORS as exc:
            _raise_httpx_error(exc, self.request)


class PinnedHTTPTransport(httpx.AsyncBaseTransport):
    """HTTPX-compatible transport pinned to an already validated IP address."""

    def __init__(self, address: str) -> None:
        self.pool = httpcore.AsyncConnectionPool(
            ssl_context=ssl.create_default_context(),
            network_backend=_PinnedNetworkBackend(address),
            max_connections=1,
            max_keepalive_connections=0,
            retries=0,
        )

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        url = httpcore.URL(
            scheme=request.url.raw_scheme,
            host=request.url.raw_host,
            port=request.url.port,
            target=request.url.raw_path,
        )
        core_request = httpcore.Request(
            method=request.method,
            url=url,
            headers=request.headers.raw,
            content=request.stream,
            extensions=request.extensions,
        )
        try:
            response = await self.pool.handle_async_request(core_request)
        except _CORE_HTTP_ERRORS as exc:
            _raise_httpx_error(exc, request)
        return httpx.Response(
            status_code=response.status,
            headers=response.headers,
            stream=_CoreResponseStream(response, request),
            extensions=response.extensions,
            request=request,
        )

    async def aclose(self) -> None:
        await self.pool.aclose()
