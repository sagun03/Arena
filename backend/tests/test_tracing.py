"""Unit tests for tracing functionality"""

import pytest
from arena.observability.tracing import trace_agent_call, trace_node


@pytest.mark.asyncio
async def test_trace_agent_call_decorator():
    """Test trace_agent_call decorator"""

    @trace_agent_call("TestAgent", round_number=1)
    async def test_function():
        return "test result"

    result = await test_function()
    assert result == "test result"


@pytest.mark.asyncio
async def test_trace_node_decorator():
    """Test trace_node decorator"""

    @trace_node("test_node")
    async def test_node(state):
        return state

    state = {"debate_id": "test-123"}
    result = await test_node(state)
    assert result == state
