import pytest

from pyscrape.safety import UnsafeURLError, validate_public_url


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "http://127.0.0.1/",
        "http://localhost/",
        "https://user:password@example.com/",
        "http://[::1",
    ],
)
def test_rejects_non_public_or_credentialed_urls(url):
    with pytest.raises(UnsafeURLError):
        validate_public_url(url)
