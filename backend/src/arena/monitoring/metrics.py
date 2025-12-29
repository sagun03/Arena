"""Simple metrics + structured logging helpers"""

import logging
from collections import Counter
from typing import Optional

from arena.config.settings import settings

logger = logging.getLogger("arena")
logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s"))
logger.addHandler(_handler)

counters: Counter[str] = Counter()


def record_llm_call(kind: str, debate_id: Optional[str], status: str) -> None:
    key = f"llm:{kind}:{status}"
    counters[key] += 1
    # minimal structured log
    logger.info(
        "metric llm_call kind=%s status=%s debate_id=%s count=%d",
        kind,
        status,
        debate_id,
        counters[key],
    )


def record_retry(kind: str) -> None:
    counters[f"retry:{kind}"] += 1
    logger.info("metric retry kind=%s count=%d", kind, counters[f"retry:{kind}"])


def record_429(kind: str) -> None:
    counters[f"429:{kind}"] += 1
    logger.warning("metric 429 kind=%s count=%d", kind, counters[f"429:{kind}"])
