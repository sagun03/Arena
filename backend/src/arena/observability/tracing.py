"""Tracing decorators and utilities"""

import asyncio
import functools
import logging
from typing import Any, Callable, TypeVar

F = TypeVar("F", bound=Callable[..., Any])

logger = logging.getLogger(__name__)


def trace_agent_call(agent_name: str, round_number: int | None = None):
    """
    Decorator to trace agent calls.

    Args:
        agent_name: Name of the agent being traced
        round_number: Optional round number for context

    Returns:
        Decorated function with tracing enabled
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            trace_name = f"{agent_name}"
            if round_number:
                trace_name += f" - Round {round_number}"

            logger.debug(f"Executing trace: {trace_name}")
            return await func(*args, **kwargs)

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            trace_name = f"{agent_name}"
            if round_number:
                trace_name += f" - Round {round_number}"

            logger.debug(f"Executing trace: {trace_name}")
            return func(*args, **kwargs)

        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        else:
            return sync_wrapper  # type: ignore

    return decorator


def trace_node(node_name: str):
    """
    Decorator to trace LangGraph node execution.

    Args:
        node_name: Name of the node being traced

    Returns:
        Decorated function with tracing enabled
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def wrapper(state: Any, *args: Any, **kwargs: Any) -> Any:
            # Extract debate_id from state if available
            debate_id = state.get("debate_id", "unknown") if isinstance(state, dict) else "unknown"
            trace_name = f"Node: {node_name} (debate: {debate_id})"

            logger.debug(f"Executing trace: {trace_name}")
            return await func(state, *args, **kwargs)

        return wrapper  # type: ignore

    return decorator
