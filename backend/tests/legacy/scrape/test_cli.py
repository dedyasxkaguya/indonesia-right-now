from click.testing import CliRunner

from pyscrape import cli
from pyscrape.fetcher import BotCheckError, FetchResult
from pyscrape.robots import RobotsDisallowed


def test_captcha_exits_with_code_two(monkeypatch):
    monkeypatch.setattr(cli, "warn_if_rate_limited", lambda: None)
    monkeypatch.setattr(cli, "validate_public_url", lambda url: None)
    def blocked_page(*args, **kwargs):
        raise BotCheckError("CAPTCHA detected.")

    monkeypatch.setattr(cli, "fetch_browser", blocked_page)
    result = CliRunner().invoke(
        cli.main, ["https://example.com", "--verbose", "--scroll", "0"]
    )

    assert result.exit_code == 2
    assert '"exit_code": 2' in result.output
    assert "CAPTCHA detected." in result.output


def test_robots_disallowed_exits_with_code_three(monkeypatch, tmp_path):
    monkeypatch.setattr(cli, "warn_if_rate_limited", lambda: None)
    monkeypatch.setattr(cli, "validate_public_url", lambda url: None)

    def robots_disallowed(*args, **kwargs):
        raise RobotsDisallowed("robots disallowed")

    monkeypatch.setattr(cli, "check_robots", robots_disallowed)

    result = CliRunner().invoke(
        cli.main,
        [
            "https://example.com",
            "--check-robots",
            "--output",
            str(tmp_path / "article.txt"),
        ],
    )

    assert result.exit_code == 3
    assert "robots disallowed" in result.output


def test_output_file_does_not_copy_to_clipboard_by_default(tmp_path, monkeypatch):
    monkeypatch.setattr(cli, "warn_if_rate_limited", lambda: None)
    monkeypatch.setattr(cli, "validate_public_url", lambda url: None)
    monkeypatch.setattr(
        cli,
        "check_robots",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            AssertionError("robots.txt must not be checked by default")
        ),
    )
    monkeypatch.setattr(
        cli,
        "fetch_static",
        lambda *args, **kwargs: FetchResult(
            "<html><body>Article text</body></html>", 200, "https://example.com"
        ),
    )
    copied = []
    monkeypatch.setattr(cli, "copy_text", copied.append)
    output = tmp_path / "article.txt"

    result = CliRunner().invoke(
        cli.main,
        [
            "https://example.com",
            "--static",
            "--mode",
            "text",
            "--max-chars",
            "6",
            "--output",
            str(output),
        ],
    )

    assert result.exit_code == 0
    assert output.read_text(encoding="utf-8") == "Articl"
    assert copied == []


def test_no_clipboard_requires_an_output_file(monkeypatch):
    monkeypatch.setattr(cli, "warn_if_rate_limited", lambda: None)
    monkeypatch.setattr(cli, "validate_public_url", lambda url: None)

    result = CliRunner().invoke(
        cli.main, ["https://example.com", "--no-clipboard"]
    )

    assert result.exit_code == 1
    assert "--no-clipboard requires --output FILE" in result.output
