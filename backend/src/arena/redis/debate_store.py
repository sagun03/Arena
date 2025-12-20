"""Debate state storage in Redis"""

import json
from typing import Any, Dict, Mapping, Optional, cast

from arena.redis.redis_client import get_redis_client


def save_debate_state(debate_id: str, state_dict: Dict[str, Any]) -> bool:
    """
    Save debate state to Redis as hash.

    Args:
        debate_id: Unique debate identifier
        state_dict: State dictionary to save (must be JSON serializable)

    Returns:
        True if saved successfully, False otherwise
    """
    try:
        client = get_redis_client()
        key = f"debate:{debate_id}"

        # Convert state_dict to JSON-serializable format
        serializable_state = _make_serializable(state_dict)

        # Save as hash
        # Type cast needed: Redis expects Mapping[str | bytes, bytes | float | int | str]
        # but we provide Dict[str, str] which is compatible (all values are JSON strings)
        client.hset(
            key, mapping=cast(Mapping[str | bytes, bytes | float | int | str], serializable_state)
        )

        # Set TTL (24 hours)
        client.expire(key, 86400)

        return True
    except Exception as e:
        print(f"Error saving debate state: {e}")
        return False


def get_debate_state(debate_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve debate state from Redis.

    Args:
        debate_id: Unique debate identifier

    Returns:
        State dictionary or None if not found
    """
    try:
        client = get_redis_client()
        key = f"debate:{debate_id}"

        # Get all fields from hash
        state = client.hgetall(key)

        if not state:
            return None

        # Parse JSON values back
        parsed_state = {}
        for field, value in state.items():
            try:
                parsed_state[field] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                parsed_state[field] = value

        return parsed_state
    except Exception as e:
        print(f"Error retrieving debate state: {e}")
        return None


def delete_debate_state(debate_id: str) -> bool:
    """
    Delete debate state from Redis.

    Args:
        debate_id: Unique debate identifier

    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        client = get_redis_client()
        key = f"debate:{debate_id}"
        result = client.delete(key)
        return result > 0
    except Exception as e:
        print(f"Error deleting debate state: {e}")
        return False


def _make_serializable(obj: Any) -> Dict[str, str]:
    """
    Convert object to JSON-serializable dictionary with string values.

    Args:
        obj: Object to serialize

    Returns:
        Dictionary with string values
    """
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            if isinstance(value, (dict, list)):
                result[str(key)] = json.dumps(value)
            elif isinstance(value, (str, int, float, bool, type(None))):
                result[str(key)] = json.dumps(value)
            else:
                # For Pydantic models and other objects
                result[str(key)] = json.dumps(value, default=str)
        return result
    else:
        # If not a dict, convert to dict first
        if hasattr(obj, "model_dump"):
            # Pydantic model
            return _make_serializable(obj.model_dump())
        elif hasattr(obj, "dict"):
            # Pydantic v1
            return _make_serializable(obj.dict())
        else:
            return _make_serializable(obj.__dict__ if hasattr(obj, "__dict__") else {})
