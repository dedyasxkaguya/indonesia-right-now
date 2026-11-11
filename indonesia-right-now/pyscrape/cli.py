import json
import logging
from pathlib import Path

import click
import requests

from pyscrape.browser import BrowserError, fetch_browser
from pyscrape.clipboard import copy_text
from pyscrape.config import ScrapeConfig
from pyscrape.extract import extract_content, limit_content
from pyscrape.fetcher import BotCheckError, FetchError, fetch_static
from pyscrape.logging_setup import configure_logging
from pyscrape.rate_limit import warn_if_rate_limited
from pyscrape.robots import RobotsDisallowed, RobotsFetchError, check_robots
from pyscrape.safety import UnsafeURLError, validate_public_url

logger = logging.getLogger(__name__)

EXIT_NETWORK = 1
EXIT_BOT_CHECK = 2
EXIT_ROBOTS = 3
EXIT_TIMEOUT = 4
EXIT_EMPTY = 5


class ScrapeFailure(Exception):
    def __init__(self, message: str, exit_code: int):
        super().__init__(message)
        self.exit_code = exit_code


def _run(
    config: ScrapeConfig,
    *,
    output: Path | None,
    clipboard: bool,
    screenshot: str | None,
    check_robots_enabled: bool,
) -> None:
    warn_if_rate_limited()
    if output is None and not clipboard:
        raise ScrapeFailure(
            "--no-clipboard requires --output FILE so the extracted content is preserved.",
            EXIT_NETWORK,
        )
    if config.engine == "static" and screenshot is not None:
        raise ScrapeFailure("--screenshot requires the Playwright engine.", EXIT_NETWORK)
    try:
        validate_public_url(config.url)
        if check_robots_enabled:
            check_robots(config.url, timeout=min(config.timeout, 10))
    except RobotsDisallowed as exc:
        raise ScrapeFailure(str(exc), EXIT_ROBOTS) from exc
    except RobotsFetchError as exc:
        raise ScrapeFailure(str(exc), EXIT_NETWORK) from exc
    except UnsafeURLError as exc:
        raise ScrapeFailure(str(exc), EXIT_NETWORK) from exc
    except requests.RequestException as exc:
        raise ScrapeFailure(f"Could not check robots.txt: {exc}", EXIT_NETWORK) from exc

    try:
        if config.engine == "static":
            redirect_policy = None
            if check_robots_enabled:
                redirect_policy = lambda target: check_robots(
                    target, timeout=min(config.timeout, 10)
                )
            fetched = fetch_static(
                config.url,
                timeout=config.timeout,
                on_redirect=redirect_policy,
            )
        else:
            fetched = fetch_browser(
                config.url,
                max_steps=config.scroll,
                scroll_mode=config.scroll_mode,
                wait_until=config.wait_until,
                timeout=config.timeout,
                headless=config.headless,
                screenshot=screenshot,
                check_robots_enabled=check_robots_enabled,
            )
    except BotCheckError as exc:
        raise ScrapeFailure(str(exc), EXIT_BOT_CHECK) from exc
    except RobotsDisallowed as exc:
        raise ScrapeFailure(str(exc), EXIT_ROBOTS) from exc
    except RobotsFetchError as exc:
        raise ScrapeFailure(str(exc), EXIT_NETWORK) from exc
    except TimeoutError as exc:
        raise ScrapeFailure(str(exc), EXIT_TIMEOUT) from exc
    except (FetchError, BrowserError, requests.RequestException, UnsafeURLError) as exc:
        raise ScrapeFailure(str(exc), EXIT_NETWORK) from exc
    except OSError as exc:
        raise ScrapeFailure(f"Could not save the screenshot: {exc}", EXIT_NETWORK) from exc

    try:
        content = extract_content(fetched.html, config.mode, url=fetched.final_url)
    except Exception as exc:
        raise ScrapeFailure(f"Content extraction failed: {exc}", EXIT_NETWORK) from exc
    content, truncated = limit_content(content, config.max_chars)
    if not content.strip():
        raise ScrapeFailure("Extraction produced no content.", EXIT_EMPTY)
    if truncated:
        logger.warning(
            "Output was truncated to the configured maximum of %d characters.",
            config.max_chars,
        )

    if output is not None:
        try:
            output.write_text(content, encoding="utf-8")
        except OSError as exc:
            raise ScrapeFailure(f"Could not write {output}: {exc}", EXIT_NETWORK) from exc
    fallback_output: Path | None = None
    if clipboard:
        try:
            copy_text(content)
        except RuntimeError as exc:
            fallback = Path.cwd() / "pyscrape-output.txt"
            try:
                fallback.write_text(content, encoding="utf-8")
            except OSError as write_exc:
                raise ScrapeFailure(
                    f"{exc} Fallback write to {fallback} also failed: {write_exc}",
                    EXIT_NETWORK,
                ) from write_exc
            logger.warning("%s Content saved to %s instead.", exc, fallback)
            fallback_output = fallback

    destination = str(output) if output is not None else (
        str(fallback_output) if fallback_output is not None else "clipboard"
    )
    if output is not None and clipboard:
        destination += " and clipboard"
    elif output is not None and fallback_output is not None:
        destination += f" and {fallback_output}"
    logger.info(
        "URL: %s | final scroll height: %d px | scrolls: %d | content: %d characters | truncated: %s | destination: %s",
        fetched.final_url,
        fetched.scroll_height,
        fetched.scroll_count,
        len(content),
        "yes" if truncated else "no",
        destination,
    )


def _handle_failure(exc: ScrapeFailure, *, verbose: bool) -> None:
    if verbose:
        click.echo(
            json.dumps(
                {"error": str(exc), "exit_code": exc.exit_code},
                ensure_ascii=False,
            ),
            err=True,
        )
    else:
        click.echo(f"Error: {exc}", err=True)


@click.command(context_settings={"help_option_names": ["-h", "--help"]})
@click.argument("url")
@click.option(
    "--scroll",
    "scroll_count",
    type=click.IntRange(min=0),
    default=10,
    show_default=True,
)
@click.option(
    "--scroll-mode",
    type=click.Choice(["steps", "until-height-stable"], case_sensitive=False),
    default="until-height-stable",
    show_default=True,
)
@click.option(
    "--engine",
    type=click.Choice(["playwright", "static"], case_sensitive=False),
    default="playwright",
    show_default=True,
)
@click.option("--static", "static_mode", is_flag=True, help="Alias for --engine static.")
@click.option(
    "--mode",
    type=click.Choice(["text", "markdown", "html", "reader"], case_sensitive=False),
    default="markdown",
    show_default=True,
)
@click.option(
    "--max-chars",
    type=click.IntRange(min=0),
    default=20_000,
    show_default=True,
    help="Maximum extracted output characters; use 0 for unlimited.",
)
@click.option("--output", type=click.Path(path_type=Path, dir_okay=False))
@click.option("--clipboard/--no-clipboard", default=None)
@click.option("--headless/--headed", default=True, show_default=True)
@click.option("--timeout", type=click.IntRange(min=1), default=60, show_default=True)
@click.option(
    "--wait-until",
    type=click.Choice(["load", "domcontentloaded", "networkidle"], case_sensitive=False),
    default="networkidle",
    show_default=True,
)
@click.option(
    "--check-robots",
    "check_robots_enabled",
    is_flag=True,
    help="Check robots.txt before accessing pages (disabled by default).",
)
@click.option("--screenshot", type=click.Path(path_type=str, dir_okay=False))
@click.option("--quiet", is_flag=True, help="Suppress the success summary.")
@click.option("--verbose", is_flag=True, help="Print structured JSON errors.")
def main(
    url: str,
    scroll_count: int,
    scroll_mode: str,
    engine: str,
    static_mode: bool,
    mode: str,
    max_chars: int,
    output: Path | None,
    clipboard: bool | None,
    headless: bool,
    timeout: int,
    wait_until: str,
    check_robots_enabled: bool,
    screenshot: str | None,
    quiet: bool,
    verbose: bool,
) -> None:
    """Load a public URL and copy its rendered content."""
    configure_logging(quiet=quiet, verbose=verbose)
    config = ScrapeConfig(
        url=url,
        scroll=scroll_count,
        scroll_mode=scroll_mode.lower(),
        engine="static" if static_mode else engine.lower(),
        mode=mode.lower(),
        max_chars=max_chars,
        timeout=timeout,
        wait_until=wait_until.lower(),
        headless=headless,
    )
    clipboard_enabled = clipboard if clipboard is not None else output is None
    try:
        _run(
            config,
            output=output,
            clipboard=clipboard_enabled,
            screenshot=screenshot,
            check_robots_enabled=check_robots_enabled,
        )
    except ScrapeFailure as exc:
        _handle_failure(exc, verbose=verbose)
        raise click.exceptions.Exit(exc.exit_code)


if __name__ == "__main__":
    main()
