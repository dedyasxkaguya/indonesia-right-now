from pathlib import Path

from pyscrape.extract import extract_content, limit_content
from pyscrape.fetcher import detect_bot_check

FIXTURES = Path(__file__).parent / "fixtures"


def test_extracts_markdown_and_reader_content():
    html = (FIXTURES / "article.html").read_text(encoding="utf-8")
    markdown = extract_content(html, "markdown", url="https://example.com/article")
    reader = extract_content(html, "reader", url="https://example.com/article")

    assert "# A useful test article" in markdown
    assert "A useful test article" in reader
    assert "Site navigation" not in reader


def test_detects_captcha_without_attempting_to_solve_it():
    assert detect_bot_check("<html><body>Complete this CAPTCHA</body></html>", 200)
    assert detect_bot_check("<html></html>", 403)
    assert not detect_bot_check("<html><body>Article content</body></html>", 200)


def test_limit_content_caps_output_and_reports_truncation():
    truncated, was_truncated = limit_content("abcdefghij", 6)
    unchanged, was_not_truncated = limit_content("short", 6)
    unlimited, unlimited_was_truncated = limit_content("abcdefghij", 0)

    assert truncated == "abcdef"
    assert was_truncated
    assert unchanged == "short"
    assert not was_not_truncated
    assert unlimited == "abcdefghij"
    assert not unlimited_was_truncated
