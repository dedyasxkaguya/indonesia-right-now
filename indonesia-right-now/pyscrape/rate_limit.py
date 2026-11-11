import json
import logging
import os
import tempfile
import time
from pathlib import Path

logger = logging.getLogger(__name__)
RUN_LIMIT = 5
WINDOW_SECONDS = 60


def warn_if_rate_limited() -> None:
    """Warn after repeated runs; never block a user from accessing a public page."""
    user_id = os.getuid() if hasattr(os, "getuid") else os.environ.get("USERNAME", "user")
    state_path = Path(tempfile.gettempdir()) / f"pyscrape-runs-{user_id}.json"
    now = time.time()
    try:
        runs = json.loads(state_path.read_text(encoding="utf-8"))
        if not isinstance(runs, list):
            runs = []
    except (OSError, json.JSONDecodeError):
        runs = []
    recent = [
        timestamp
        for timestamp in runs
        if isinstance(timestamp, (int, float)) and now - timestamp < WINDOW_SECONDS
    ]
    if len(recent) >= RUN_LIMIT:
        logger.warning(
            "You have run pyscrape %d times in the last minute; please avoid overloading sites.",
            len(recent),
        )
    recent.append(now)
    try:
        state_path.write_text(json.dumps(recent), encoding="utf-8")
    except OSError as exc:
        logger.debug("Could not persist run-rate state: %s", exc)
