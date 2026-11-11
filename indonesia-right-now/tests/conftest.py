from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        _env_file=None,
        app_request_timeout=10,
        newsid_output_dir=tmp_path,
        newsid_preset_path=tmp_path / "does-not-exist.yaml",
        ai_enabled=False,
        ai_output_dir=tmp_path / "ai-output",
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as test_client:
        yield test_client
