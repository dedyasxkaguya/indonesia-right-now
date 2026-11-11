from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import click
import httpx
from pydantic import ValidationError

from newsid.config import ConfigError, SourceDefinition
from newsid.fetcher import USER_AGENT, FeedFetcher, FetchError, _PoliteLimiter
from newsid.filters import (
    FilterError,
    comma_values,
    matches_filters,
    parse_duration,
    parse_timestamp,
)
from newsid.logging_setup import configure_logging
from newsid.parser import FeedParseError, parse_feed
from newsid.schema import NewsItem, SourceRecord
from newsid.sources import load_sources
from newsid.writer import (
    assemble_items,
    atomic_write_json,
    local_now,
    output_path,
    source_site_name,
)


class NewsIdCommand(click.Command):
    def main(self, *args: Any, **kwargs: Any) -> Any:
        standalone = kwargs.pop("standalone_mode", True)
        try:
            result = super().main(*args, standalone_mode=False, **kwargs)
        except click.ClickException as exc:
            if standalone:
                exc.show()
                raise SystemExit(3) from exc
            raise
        except click.exceptions.Exit as exc:
            if standalone:
                raise SystemExit(exc.exit_code) from exc
            return exc.exit_code
        if standalone:
            raise SystemExit(result if isinstance(result, int) else 0)
        return result


def _source_error(
    source: SourceDefinition,
    code: str,
    message: str,
    now: datetime,
) -> SourceRecord:
    return SourceRecord(
        url=source.url,
        publisher=source.name,
        status="error",
        fetched_at=now.isoformat(),
        items=0,
        error={"code": code, "message": message},
    )


async def _collect(
    sources: list[SourceDefinition],
    *,
    concurrency: int,
    timeout: float,
    retries: int,
    request_delay: float,
    max_items: int,
    detect_language: bool,
    logger: logging.Logger,
    user_agent: str = USER_AGENT,
    rate_limiter: _PoliteLimiter | None = None,
) -> tuple[list[NewsItem], list[SourceRecord], int]:
    limits = httpx.Limits(
        max_connections=concurrency,
        max_keepalive_connections=concurrency,
    )
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=False,
        limits=limits,
        headers={"User-Agent": user_agent},
        trust_env=False,
    ) as client:
        fetcher = FeedFetcher(
            client,
            concurrency=concurrency,
            retries=retries,
            request_delay=request_delay,
            logger=logger,
            user_agent=user_agent,
            limiter=rate_limiter,
        )

        async def collect_one(
            source: SourceDefinition,
        ) -> tuple[list[NewsItem], SourceRecord]:
            try:
                fetched = await fetcher.fetch(source)
                items, publisher, rate_hint = parse_feed(
                    fetched,
                    max_items=max_items,
                    detect_language=detect_language,
                    logger=logger,
                )
                if rate_hint is not None:
                    fetcher.respect_rate_hint(fetched.feed_url, rate_hint)
                return (
                    items,
                    SourceRecord(
                        url=source.url,
                        publisher=publisher,
                        status="ok",
                        fetched_at=fetched.fetched_at.isoformat(),
                        items=len(items),
                    ),
                )
            except FetchError as exc:
                logger.warning(
                    "source failed: %s: %s",
                    source.url,
                    exc,
                    extra={"event": "source_failed"},
                )
                return [], _source_error(source, exc.code, str(exc), datetime.now(UTC))
            except httpx.InvalidURL as exc:
                logger.warning(
                    "source failed: %s: %s",
                    source.url,
                    exc,
                    extra={"event": "source_failed"},
                )
                return [], _source_error(
                    source, "invalid_url", str(exc), datetime.now(UTC)
                )
            except (FeedParseError, ValidationError) as exc:
                logger.warning(
                    "source failed: %s: %s",
                    source.url,
                    exc,
                    extra={"event": "source_failed"},
                )
                return [], _source_error(
                    source, "parse_error", str(exc), datetime.now(UTC)
                )

        results = await asyncio.gather(*(collect_one(source) for source in sources))
        items: list[NewsItem] = []
        records: list[SourceRecord] = []
        for result_items, record in results:
            items.extend(result_items)
            records.append(record)
        return items, records, len(items)


def _document(
    *,
    date_text: str,
    timezone_name: str,
    generated_at: datetime,
    query: dict[str, Any],
    records: list[SourceRecord],
    items: list[NewsItem],
    items_fetched: int,
    deduped: int,
) -> dict[str, Any]:
    ok = sum(record.status == "ok" for record in records)
    return {
        "schema_version": 1,
        "generated_at": generated_at.isoformat(),
        "date": date_text,
        "date_tz": timezone_name,
        "query": query,
        "stats": {
            "sources_total": len(records),
            "sources_ok": ok,
            "sources_failed": len(records) - ok,
            "items_fetched": items_fetched,
            "items_kept": len(items),
            "items_deduped": deduped,
        },
        "sources": [record.model_dump(mode="json") for record in records],
        "items": [item.model_dump(mode="json") for item in items],
    }


@click.command(
    cls=NewsIdCommand, context_settings={"help_option_names": ["-h", "--help"]}
)
@click.argument("sources", nargs=-1)
@click.option(
    "--preset", help="Use a bundled preset (currently indonesia-default) or YAML file."
)
@click.option(
    "--since", default="24h", show_default=True, help="Keep items within this duration."
)
@click.option("--until", help="Keep items published before this ISO-8601 timestamp.")
@click.option("--category", "category_list", help="Comma-separated category tags.")
@click.option(
    "--publisher", "publisher_list", help="Comma-separated publisher names/domains."
)
@click.option(
    "--keyword", "keyword_list", help="Comma-separated terms; any match is kept."
)
@click.option("--exclude", "exclude_list", help="Comma-separated terms to drop.")
@click.option("--max-items", type=click.IntRange(min=0), default=200, show_default=True)
@click.option("--concurrency", type=click.IntRange(min=1), default=8, show_default=True)
@click.option(
    "--output", "output_dir", type=click.Path(path_type=Path), default=Path("./output")
)
@click.option(
    "--filename",
    default="news_indonesia_{site_name}_{date}_{time}",
    show_default=True,
    help="Filename template; available placeholders: {site_name}, {date}, {time}.",
)
@click.option("--date-tz", default="Asia/Jakarta", show_default=True)
@click.option(
    "--replace",
    "replace_existing",
    is_flag=True,
    help="Overwrite the output if this run's timestamped filename already exists.",
)
@click.option(
    "--timestamp",
    "add_timestamp",
    is_flag=True,
    help="Deprecated; output filenames now include a time by default.",
)
@click.option("--pretty", is_flag=True, help="Pretty-print the JSON output.")
@click.option(
    "--dry-run", is_flag=True, help="Fetch and report counts without writing a file."
)
@click.option(
    "--timeout", type=click.FloatRange(min=0.1), default=20.0, show_default=True
)
@click.option("--retries", type=click.IntRange(min=0), default=3, show_default=True)
@click.option(
    "--request-delay",
    type=click.FloatRange(min=0),
    default=0.75,
    show_default=True,
    help="Minimum seconds between requests to the same host.",
)
@click.option(
    "--strict-dates", is_flag=True, help="Drop entries without a publication date."
)
@click.option(
    "--detect-language",
    is_flag=True,
    help="Detect language (requires the language extra).",
)
@click.option("--quiet", is_flag=True)
@click.option("--verbose", is_flag=True)
def cli(
    sources: tuple[str, ...],
    preset: str | None,
    since: str,
    until: str | None,
    category_list: str | None,
    publisher_list: str | None,
    keyword_list: str | None,
    exclude_list: str | None,
    max_items: int,
    concurrency: int,
    output_dir: Path,
    filename: str,
    date_tz: str,
    replace_existing: bool,
    add_timestamp: bool,
    pretty: bool,
    dry_run: bool,
    timeout: float,
    retries: int,
    request_delay: float,
    strict_dates: bool,
    detect_language: bool,
    quiet: bool,
    verbose: bool,
) -> int:
    logger = configure_logging(verbose=verbose, quiet=quiet)
    try:
        loaded_sources = load_sources(sources, preset)
        since_delta = parse_duration(since)
        until_time = parse_timestamp(until)
        now_local = local_now(date_tz)
        site_name = (
            source_site_name(loaded_sources[0].url, loaded_sources[0].name)
            if len(loaded_sources) == 1
            else None
        )
        output_path(
            output_dir,
            filename,
            now_local.date().isoformat(),
            time_text=now_local.strftime("%H%M%S"),
            site_name=site_name,
        )
    except (ConfigError, FilterError, ValueError) as exc:
        click.echo(str(exc), err=True)
        return 3
    if verbose and quiet:
        logger.warning(
            "--quiet takes precedence over --verbose", extra={"event": "log_options"}
        )

    now_utc = datetime.now(UTC)
    try:
        fetched_items, source_records, items_fetched = asyncio.run(
            _collect(
                loaded_sources,
                concurrency=concurrency,
                timeout=timeout,
                retries=retries,
                request_delay=request_delay,
                max_items=max_items,
                detect_language=detect_language,
                logger=logger,
            )
        )
    except (httpx.InvalidURL, httpx.TimeoutException) as exc:
        click.echo(f"global network failure: {exc}", err=True)
        return 2

    if source_records and all(record.status == "error" for record in source_records):
        return 1
    if items_fetched == 0:
        return 2

    categories = comma_values(category_list)
    publishers = comma_values(publisher_list)
    keywords = comma_values(keyword_list)
    excludes = comma_values(exclude_list)
    filtered = [
        item
        for item in fetched_items
        if matches_filters(
            item,
            since=since_delta,
            until=until_time,
            categories=categories,
            publishers=publishers,
            keywords=keywords,
            excludes=excludes,
            now=now_utc,
            strict_dates=strict_dates,
        )
    ]

    date_text = now_local.date().isoformat()
    output_time = now_local
    try:
        path = output_path(
            output_dir,
            filename,
            date_text,
            time_text=output_time.strftime("%H%M%S"),
            site_name=site_name,
        )
        if not replace_existing:
            while path.exists():
                output_time += timedelta(microseconds=1)
                path = output_path(
                    output_dir,
                    filename,
                    date_text,
                    time_text=output_time.strftime("%H%M%S%f"),
                    site_name=site_name,
                )
        final_items, deduped = assemble_items(filtered)
    except (ValueError, OSError) as exc:
        click.echo(str(exc), err=True)
        return 5

    document = _document(
        date_text=date_text,
        timezone_name=date_tz,
        generated_at=now_local,
        query={
            "since": since,
            "until": until,
            "categories": categories,
            "publishers": publishers,
            "keywords": keywords,
            "excludes": excludes,
        },
        records=source_records,
        items=final_items,
        items_fetched=items_fetched,
        deduped=deduped,
    )
    if not dry_run:
        try:
            atomic_write_json(path, document, pretty=pretty)
        except OSError as exc:
            click.echo(f"cannot write output {path}: {exc}", err=True)
            return 5

    if not quiet:
        click.echo(
            f"{path.name} · {document['stats']['sources_ok']}/{len(source_records)} "
            f"sources ok · {len(final_items)} items kept ({deduped} deduped)",
            err=True,
        )
    return 4 if not final_items else 0


def main() -> None:
    try:
        result = cli.main(standalone_mode=False)
    except click.ClickException as exc:
        exc.show()
        raise SystemExit(3) from exc
    raise SystemExit(result if isinstance(result, int) else 0)
