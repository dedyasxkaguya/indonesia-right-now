FROM python:3.11-slim AS builder

WORKDIR /build
COPY pyproject.toml README.md ./
COPY app ./app
COPY newsid ./newsid
COPY pyscrape ./pyscrape
COPY presets ./presets
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir ".[dev,test,language]"

FROM python:3.11-slim AS runtime

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NEWSID_OUTPUT_DIR=/data/output \
    AI_OUTPUT_DIR=/data/output/ai

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY pyproject.toml ./
COPY app ./app
COPY newsid ./newsid
COPY pyscrape ./pyscrape
COPY presets ./presets
RUN python -m playwright install --with-deps chromium \
    && groupadd --system app \
    && useradd --system --gid app --create-home app \
    && mkdir -p /data/output/ai \
    && chown -R app:app /data /ms-playwright /app

USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"
CMD ["indonesia-right-now"]
