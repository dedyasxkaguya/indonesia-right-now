from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "indonesia-right-now"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_workers: int = 1
    app_log_level: str = "INFO"
    app_cors_origins: str = "*"
    app_request_timeout: float = 120
    api_key: str = ""
    rate_limit_fetch: str = "20/minute"
    rate_limit_news: str = "10/minute"
    rate_limit_health: str = "120/minute"
    newsid_preset_path: Path = Path("./presets/indonesia_default.yaml")
    newsid_output_dir: Path = Path("./output")
    newsid_ua: str = "news-indonesia-collector/1.0"
    pyscrape_ua: str = "pyscrape/1.0 (+public)"
    pyscrape_default_timeout: int = 60
    pyscrape_max_chars: int = 50000
    fetch_max_url_length: int = 2048
    log_format: str = "json"
    groq_api_key: str = ""
    ai_enabled: bool = True
    ai_guard_model: str = "openai/gpt-oss-120b"
    ai_extractor_model: str = "openai/gpt-oss-120b"
    ai_guard_threshold: float = 0.7
    ai_chunk_max_chars: int = 3000
    ai_max_chunks: int = 20
    ai_max_concurrency: int = 3
    ai_extractor_retries: int = 1
    ai_output_language: str = "id"
    ai_cache_ttl: int = 600
    ai_cache_max: int = 128
    ai_output_dir: Path = Path("./output/ai")
    ai_request_timeout: int = 120

    @field_validator("app_env")
    @classmethod
    def validate_app_env(cls, value: str) -> str:
        value = value.casefold()
        if value not in {"development", "production"}:
            raise ValueError("APP_ENV must be development or production")
        return value

    @field_validator("app_workers")
    @classmethod
    def validate_workers(cls, value: int) -> int:
        if value < 1:
            raise ValueError("APP_WORKERS must be at least 1")
        return value

    @field_validator("app_port")
    @classmethod
    def validate_port(cls, value: int) -> int:
        if not 1 <= value <= 65535:
            raise ValueError("APP_PORT must be between 1 and 65535")
        return value

    @field_validator("app_request_timeout")
    @classmethod
    def validate_request_timeout(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("APP_REQUEST_TIMEOUT must be greater than zero")
        return value

    @field_validator("app_log_level")
    @classmethod
    def validate_log_level(cls, value: str) -> str:
        value = value.upper()
        if value not in {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"}:
            raise ValueError("APP_LOG_LEVEL must be a standard Python log level")
        return value

    @field_validator("pyscrape_default_timeout")
    @classmethod
    def validate_fetch_timeout(cls, value: int) -> int:
        if value < 1:
            raise ValueError("PYSCRAPE_DEFAULT_TIMEOUT must be at least 1")
        return value

    @field_validator("pyscrape_max_chars")
    @classmethod
    def validate_max_chars(cls, value: int) -> int:
        if value < 0:
            raise ValueError("PYSCRAPE_MAX_CHARS cannot be negative")
        return value

    @field_validator("fetch_max_url_length")
    @classmethod
    def validate_max_url_length(cls, value: int) -> int:
        if value < 1:
            raise ValueError("FETCH_MAX_URL_LENGTH must be at least 1")
        return value

    @field_validator("app_cors_origins")
    @classmethod
    def validate_origins(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("APP_CORS_ORIGINS cannot be empty")
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if "*" in origins and origins != ["*"]:
            raise ValueError("APP_CORS_ORIGINS cannot combine * with explicit origins")
        return value

    @field_validator("log_format")
    @classmethod
    def validate_log_format(cls, value: str) -> str:
        value = value.casefold()
        if value not in {"json", "console"}:
            raise ValueError("LOG_FORMAT must be json or console")
        return value

    @field_validator("ai_guard_threshold")
    @classmethod
    def validate_ai_guard_threshold(cls, value: float) -> float:
        if not 0 < value < 1:
            raise ValueError("AI_GUARD_THRESHOLD must be between 0 and 1")
        return value

    @field_validator("ai_chunk_max_chars")
    @classmethod
    def validate_ai_chunk_max_chars(cls, value: int) -> int:
        if not 500 <= value <= 20000:
            raise ValueError("AI_CHUNK_MAX_CHARS must be between 500 and 20000")
        return value

    @field_validator("ai_max_chunks")
    @classmethod
    def validate_ai_max_chunks(cls, value: int) -> int:
        if value < 1:
            raise ValueError("AI_MAX_CHUNKS must be at least 1")
        return value

    @field_validator("ai_max_concurrency")
    @classmethod
    def validate_ai_max_concurrency(cls, value: int) -> int:
        if not 1 <= value <= 16:
            raise ValueError("AI_MAX_CONCURRENCY must be between 1 and 16")
        return value

    @field_validator("ai_extractor_retries")
    @classmethod
    def validate_ai_extractor_retries(cls, value: int) -> int:
        if value < 0:
            raise ValueError("AI_EXTRACTOR_RETRIES cannot be negative")
        return value

    @field_validator("ai_output_language")
    @classmethod
    def validate_ai_output_language(cls, value: str) -> str:
        value = value.casefold()
        if value not in {"id", "auto"}:
            raise ValueError("AI_OUTPUT_LANGUAGE must be id or auto")
        return value

    @field_validator("ai_cache_ttl", "ai_cache_max", "ai_request_timeout")
    @classmethod
    def validate_positive_ai_setting(cls, value: int) -> int:
        if value < 1:
            raise ValueError("AI cache and timeout settings must be at least 1")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
