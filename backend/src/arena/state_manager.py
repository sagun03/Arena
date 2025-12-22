"""In-memory state manager for debate sessions"""

from typing import Any, Dict, Optional

# Global state store (in-memory)
_debate_states: Dict[str, Dict[str, Any]] = {}


async def save_debate_state(debate_id: str, state_dict: Dict[str, Any]) -> bool:
    """
    Save debate state to in-memory storage.

    Args:
        debate_id: Unique debate identifier
        state_dict: State dictionary to save

    Returns:
        True if saved successfully
    """
    try:
        _debate_states[debate_id] = state_dict
        return True
    except Exception as e:
        print(f"Error saving debate state: {e}")
        return False


async def get_debate_state(debate_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve debate state from in-memory storage.

    Args:
        debate_id: Unique debate identifier

    Returns:
        State dictionary or None if not found
    """
    try:
        return _debate_states.get(debate_id)
    except Exception as e:
        print(f"Error retrieving debate state: {e}")
        return None


async def delete_debate_state(debate_id: str) -> bool:
    """
    Delete debate state from in-memory storage.

    Args:
        debate_id: Unique debate identifier

    Returns:
        True if deleted successfully
    """
    try:
        if debate_id in _debate_states:
            del _debate_states[debate_id]
            return True
        return False
    except Exception as e:
        print(f"Error deleting debate state: {e}")
        return False


def get_all_debate_states() -> Dict[str, Dict[str, Any]]:
    """Get all debate states (for debugging/testing)"""
    return _debate_states.copy()


def clear_all_states() -> None:
    """Clear all debate states (for testing)"""
    global _debate_states
    _debate_states = {}
