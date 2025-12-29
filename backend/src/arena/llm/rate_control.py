"""Async rate limiting and backoff utilities for LLM and embeddings"""

import asyncio
import logging
import random
from typing import Any, Awaitable, Callable, Dict, Optional, Tuple, Type

from arena.config.settings import settings
from arena.monitoring.metrics import record_429, record_retry

logger = logging.getLogger("arena.rate")

# Per-debate concurrency limiters
_semaphores: Dict[str, asyncio.Semaphore] = {}
_global_embed_semaphore: asyncio.Semaphore = asyncio.Semaphore(2)


def get_debate_semaphore(debate_id: Optional[str]) -> asyncio.Semaphore:
    """Return an asyncio.Semaphore guarding LLM concurrency per debate."""
    key = debate_id or "__global__"
    if key not in _semaphores:
        _semaphores[key] = asyncio.Semaphore(settings.llm_max_concurrency_per_debate)
    return _semaphores[key]


async def with_backoff(
    func: Callable[..., Awaitable[Any]],
    *args: Any,
    exceptions: Tuple[Type[BaseException], ...] = (Exception,),
    max_attempts: int | None = None,
    base_delay: float | None = None,
    max_delay: float | None = None,
    **kwargs: Any,
) -> Any:
    """
    Execute `func` with exponential backoff on failures.

    Args:
        func: async callable to execute
        exceptions: tuple of exception types to retry on
        max_attempts: max attempts before raising
        base_delay: initial delay
        max_delay: maximum delay cap
        *args/**kwargs: forwarded to func
    """
    attempts = 0
    max_attempts = max_attempts or settings.llm_backoff_max_attempts
    base_delay = base_delay or settings.llm_backoff_base_delay
    max_delay = max_delay or settings.llm_backoff_max_delay

    while True:
        try:
            return await func(*args, **kwargs)
        except exceptions as e:  # retryable
            attempts += 1
            if attempts >= max_attempts:
                logger.warning("Backoff exhausted after %s attempts: %s", attempts, e)
                raise
            # Detect 429
            msg = str(e)
            if "429" in msg or "rate limit" in msg.lower():
                record_429("llm")
            record_retry("llm")
            # Exponential with jitter
            delay = min(max_delay, base_delay * (2 ** (attempts - 1)))
            delay *= 0.7 + 0.6 * random.random()  # jitter [0.7, 1.3)
            logger.info("Retrying after %.2fs due to error: %s", delay, e)
            await asyncio.sleep(delay)


async def llm_call_with_limits(
    debate_id: Optional[str],
    call: Callable[[], Awaitable[Any]],
) -> Any:
    """Wrap an LLM call with per-debate semaphore and backoff."""
    sem = get_debate_semaphore(debate_id)
    async with sem:
        return await with_backoff(call)


async def embeddings_call_with_limits(call: Callable[[], Awaitable[Any]]) -> Any:
    """Wrap an embeddings call with global semaphore and backoff."""
    async with _global_embed_semaphore:
        return await with_backoff(call)
