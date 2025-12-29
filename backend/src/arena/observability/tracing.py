"""Tracing decorators for agent calls and graph nodes"""

import functools
import time
from typing import Any, Callable, Coroutine

from arena.monitoring.metrics import logger


def trace_agent_call(agent_name: str, round_number: int):
    """Decorator to trace an async agent function call."""

    def decorator(func: Callable[..., Coroutine[Any, Any, Any]]):
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any):
            start = time.time()
            logger.info("trace agent_start name=%s round=%d", agent_name, round_number)
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                dur = time.time() - start
                logger.info(
                    "trace agent_end name=%s round=%d duration_ms=%d",
                    agent_name,
                    round_number,
                    int(dur * 1000),
                )

        return wrapper

    return decorator


def trace_node(node_name: str):
    """Decorator to trace an async graph node function."""

    def decorator(func: Callable[..., Coroutine[Any, Any, Any]]):
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any):
            start = time.time()
            logger.info("trace node_start name=%s", node_name)
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                dur = time.time() - start
                logger.info(
                    "trace node_end name=%s duration_ms=%d",
                    node_name,
                    int(dur * 1000),
                )

        return wrapper

    return decorator
