import asyncio
import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Request
from pydantic import ValidationError
from slowapi import Limiter

from app.config import Settings
from app.errors import AppError
from app.responses import ok
from app.schemas.news import NewsRequest

logger = logging.getLogger("newsid.api")

# Plural query/body parameter spellings sent by the frontend proxy
# (irn-fe/app/api/news/route.ts) mapped to the canonical singular fields.
# These are accepted as deprecated aliases; see note-update.md.
_PLURAL_ALIASES = {
    "categories": "category",
    "publishers": "publisher",
    "keywords": "keyword",
    "excludes": "exclude",
}
_LIST_KEYS = ("category", "publisher", "keyword", "exclude") + tuple(_PLURAL_ALIASES)


def _validation_error(exc: ValidationError) -> AppError:
    return AppError(
        "VALIDATION_ERROR",
        "The request contains invalid fields.",
        status_code=422,
        details={
            "errors": [
                {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
                for error in exc.errors()
            ]
        },
        exit_code=3,
    )


def _query_data(request: Request) -> dict[str, Any]:
    data: dict[str, Any] = dict(request.query_params)
    for key in _LIST_KEYS:
        if key in data:
            data[key] = [
                value.strip() for value in data[key].split(",") if value.strip()
            ]
    if data.get("sources"):
        data["sources"] = [
            {"url": url.strip()} for url in data["sources"].split(",") if url.strip()
        ]
    return data


def _apply_aliases(data: dict[str, Any]) -> dict[str, Any]:
    """Map deprecated plural parameter spellings onto the singular fields.

    The singular names win when both spellings are supplied at once.
    """
    merged = dict(data)
    for plural, singular in _PLURAL_ALIASES.items():
        if plural not in merged:
            continue
        if singular not in merged:
            merged[singular] = merged[plural]
        del merged[plural]
    return merged


def _make_request(data: dict[str, Any]) -> NewsRequest:
    try:
        return NewsRequest.model_validate(_apply_aliases(data))
    except ValidationError as exc:
        raise _validation_error(exc) from exc


async def _request_options(request: Request, *, post: bool) -> NewsRequest:
    query = _query_data(request)
    if not post:
        return _make_request(query)
    raw_body = await request.body()
    if raw_body:
        try:
            body_data = json.loads(raw_body)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise AppError(
                "VALIDATION_ERROR",
                "The request body must contain valid JSON.",
                status_code=422,
                details={"errors": [{"loc": ["body"], "msg": "Invalid JSON"}]},
                exit_code=3,
            ) from exc
        if not isinstance(body_data, dict):
            raise AppError(
                "VALIDATION_ERROR",
                "The request body must be a JSON object.",
                status_code=422,
                details={"errors": [{"loc": ["body"], "msg": "Expected an object"}]},
                exit_code=3,
            )
        body = body_data
    else:
        body = {}
    return _make_request({**query, **body})


async def _run_news(
    options: NewsRequest, settings: Settings, rate_limiter
) -> dict[str, Any]:
    from newsid.cli import _collect, _document
    from newsid.config import ConfigError, SourceDefinition, validate_url
    from newsid.filters import (
        FilterError,
        matches_filters,
        parse_duration,
        parse_timestamp,
    )
    from newsid.sources import load_sources
    from newsid.writer import (
        assemble_items,
        atomic_write_json,
        local_now,
        output_path,
    )

    try:
        if options.sources is not None:
            sources = [
                SourceDefinition(
                    validate_url(source.url, "source URL"),
                    source.name,
                    source.category,
                )
                for source in options.sources
                if source.enabled
            ]
            if not sources:
                raise ConfigError("inline sources contain no enabled entries")
            source_selection = "inline"
        else:
            preset = options.preset or str(settings.newsid_preset_path)
            sources = load_sources((), preset)
            source_selection = "preset"
        since_delta = parse_duration(options.since)
        until_time = parse_timestamp(options.until)
        now_local = local_now(options.date_tz)
    except (ConfigError, FilterError, ValueError) as exc:
        raise AppError(
            "NEWS_INVALID_CONFIG",
            str(exc),
            status_code=400,
            details={"exit_code": 3},
            exit_code=3,
        ) from exc

    try:
        fetched_items, source_records, items_fetched = await asyncio.wait_for(
            _collect(
                sources,
                concurrency=options.concurrency,
                timeout=float(options.timeout),
                retries=options.retries,
                request_delay=options.request_delay,
                max_items=options.max_items,
                detect_language=options.detect_language,
                logger=logger,
                user_agent=settings.newsid_ua,
                rate_limiter=rate_limiter,
            ),
            timeout=settings.app_request_timeout,
        )
    except TimeoutError as exc:
        raise AppError(
            "REQUEST_TIMEOUT",
            "News collection exceeded the configured request time limit.",
            status_code=504,
            details={"exit_code": 4},
            exit_code=4,
        ) from exc
    except (httpx.InvalidURL, httpx.TimeoutException) as exc:
        raise AppError(
            "NEWS_ALL_SOURCES_FAILED",
            str(exc),
            status_code=502,
            details={"exit_code": 1},
            exit_code=1,
        ) from exc

    if source_records and all(record.status == "error" for record in source_records):
        raise AppError(
            "NEWS_ALL_SOURCES_FAILED",
            "All configured news sources failed.",
            status_code=502,
            details={
                "exit_code": 1,
                "sources": [
                    record.model_dump(mode="json") for record in source_records
                ],
            },
            exit_code=1,
        )
    if items_fetched == 0:
        raise AppError(
            "NEWS_NO_ITEMS_FETCHED",
            "No normalized items were fetched.",
            status_code=422,
            details={"exit_code": 2},
            exit_code=2,
        )

    now_utc = datetime.now(UTC)
    filtered = [
        item
        for item in fetched_items
        if matches_filters(
            item,
            since=since_delta,
            until=until_time,
            categories=options.category,
            publishers=options.publisher,
            keywords=options.keyword,
            excludes=options.exclude,
            now=now_utc,
            strict_dates=options.strict_dates,
        )
    ]
    final_items, deduped = assemble_items(filtered)

    date_text = now_local.date().isoformat()
    output_time = now_local
    try:
        snapshot_path = output_path(
            settings.newsid_output_dir,
            "news_indonesia_{date}_{time}",
            date_text,
            time_text=output_time.strftime("%H%M%S"),
        )
        while not options.dry_run and snapshot_path.exists():
            output_time += timedelta(microseconds=1)
            snapshot_path = output_path(
                settings.newsid_output_dir,
                "news_indonesia_{date}_{time}",
                date_text,
                time_text=output_time.strftime("%H%M%S%f"),
            )
    except (ValueError, OSError) as exc:
        raise AppError(
            "NEWS_WRITE_FAILED",
            str(exc),
            status_code=500,
            details={"exit_code": 5},
            exit_code=5,
        ) from exc

    document = _document(
        date_text=date_text,
        timezone_name=options.date_tz,
        generated_at=now_local,
        query={
            "since": options.since,
            "until": options.until,
            "categories": options.category,
            "publishers": options.publisher,
            "keywords": options.keyword,
            "excludes": options.exclude,
            "source_selection": source_selection,
            "preset": options.preset if source_selection == "preset" else None,
        },
        records=source_records,
        items=final_items,
        items_fetched=items_fetched,
        deduped=deduped,
    )
    try:
        if not options.dry_run:
            atomic_write_json(snapshot_path, document, pretty=options.pretty)
    except OSError as exc:
        raise AppError(
            "NEWS_WRITE_FAILED",
            f"Could not write snapshot: {exc}",
            status_code=500,
            details={"path": str(snapshot_path), "exit_code": 5},
            exit_code=5,
        ) from exc

    document["snapshot"] = {
        "written": not options.dry_run,
        "filename": snapshot_path.name,
        "path": str(snapshot_path.resolve()),
        "dry_run": options.dry_run,
    }
    if not final_items:
        logger.info(
            "news collection completed with empty filtered result",
            extra={"exit_code": 4},
        )
    return document


def build_router(settings: Settings, limiter: Limiter) -> APIRouter:
    from newsid.fetcher import _PoliteLimiter

    router = APIRouter()
    rate_limiter = _PoliteLimiter(0)

    async def get_news(request: Request):
        options = await _request_options(request, post=False)
        data = await _run_news(options, settings, rate_limiter)
        request.state.exit_code = 4 if not data["items"] else 0
        return ok(request, settings, data)

    async def post_news(request: Request):
        options = await _request_options(request, post=True)
        data = await _run_news(options, settings, rate_limiter)
        request.state.exit_code = 4 if not data["items"] else 0
        return ok(request, settings, data)

    if settings.app_env == "production":
        get_news = limiter.limit(settings.rate_limit_news)(get_news)
        post_news = limiter.limit(settings.rate_limit_news)(post_news)
    router.add_api_route("/news", get_news, methods=["GET"])
    router.add_api_route("/news", post_news, methods=["POST"])
    return router
