"""Unit tests for agents"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from arena.agents.base_agent import BaseAgent
from arena.agents.builder_agent import BuilderAgent
from arena.agents.customer_agent import CustomerAgent
from arena.agents.judge_agent import JudgeAgent
from arena.agents.market_agent import MarketAgent
from arena.agents.skeptic_agent import SkepticAgent
from arena.models.idea import ExtractedStructure, Idea


class TestBaseAgent:
    """Tests for BaseAgent"""

    @pytest.mark.asyncio
    async def test_invoke(self, mock_llm):
        """Test LLM invocation"""
        agent = BaseAgent(
            name="TestAgent",
            role="Test Role",
            llm=mock_llm,
        )

        result = await agent.invoke("Test prompt")
        assert result is not None
        mock_llm.ainvoke.assert_called_once()

    def test_parse_json_response(self, mock_llm):
        """Test JSON response parsing"""
        agent = BaseAgent(
            name="TestAgent",
            role="Test Role",
            llm=mock_llm,
        )

        # Test with markdown code block
        response = '```json\n{"key": "value"}\n```'
        parsed = agent.parse_json_response(response)
        assert parsed == {"key": "value"}

        # Test without markdown
        response = '{"key": "value"}'
        parsed = agent.parse_json_response(response)
        assert parsed == {"key": "value"}

    def test_extract_evidence_tags(self, mock_llm):
        """Test evidence tag extraction"""
        agent = BaseAgent(
            name="TestAgent",
            role="Test Role",
            llm=mock_llm,
        )

        response_data = {
            "claims": [
                {"text": "Test claim", "type": "evidence"},
                {"text": "Test assumption", "type": "assumption"},
            ]
        }

        tags = agent.extract_evidence_tags(response_data, round_number=1)
        assert len(tags) == 2
        assert tags[0].text == "Test claim"
        assert tags[1].text == "Test assumption"


class TestJudgeAgent:
    """Tests for JudgeAgent"""

    @pytest.mark.asyncio
    async def test_clarify_idea(self, mock_llm):
        """Test idea clarification"""
        # Mock LLM response
        mock_response = MagicMock()
        mock_response.content = (
            '{"clarification": "Test clarification", '
            '"clarification_questions": [], "required_articulations": {}}'
        )
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        judge = JudgeAgent(llm=mock_llm, debate_id="test-123")

        idea = Idea(
            original_prd_text="Test PRD",
            extracted_structure=ExtractedStructure(),
        )

        result = await judge.clarify_idea(idea)
        assert "clarification" in result or "raw_response" in result

    @pytest.mark.asyncio
    async def test_validate_quality_gate(self, mock_llm):
        """Test quality gate validation"""
        mock_response = MagicMock()
        mock_response.content = '{"proceed": true, "reasoning": "Quality is good"}'
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        judge = JudgeAgent(llm=mock_llm, debate_id="test-123")

        result = await judge.validate_quality_gate(
            round_number=2,
            round_output={"attacks": {}},
            previous_context={},
        )
        assert "decision" in result or "should_proceed" in result


class TestWorkerAgents:
    """Tests for worker agents (Skeptic, Customer, Market, Builder)"""

    @pytest.mark.asyncio
    async def test_skeptic_agent_execute(self, mock_llm):
        """Test SkepticAgent execution"""
        mock_response = MagicMock()
        mock_response.content = '{"response": "Test attack", "claims": []}'
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        agent = SkepticAgent(
            llm=mock_llm,
            debate_id="test-123",
        )

        idea_text = "Test idea"
        extracted_structure = {"sections": []}

        result = await agent.execute(idea_text, extracted_structure)
        assert "response" in result or "raw_response" in result

    @pytest.mark.asyncio
    async def test_customer_agent_execute(self, mock_llm):
        """Test CustomerAgent execution"""
        mock_response = MagicMock()
        mock_response.content = '{"response": "Test customer analysis", "claims": []}'
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        agent = CustomerAgent(
            llm=mock_llm,
            debate_id="test-123",
        )

        idea_text = "Test idea"
        extracted_structure = {"sections": []}

        result = await agent.execute(idea_text, extracted_structure)
        assert "response" in result or "raw_response" in result

    @pytest.mark.asyncio
    async def test_market_agent_execute(self, mock_llm):
        """Test MarketAgent execution"""
        mock_response = MagicMock()
        mock_response.content = '{"response": "Test market analysis", "claims": []}'
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        agent = MarketAgent(
            llm=mock_llm,
            debate_id="test-123",
        )

        idea_text = "Test idea"
        extracted_structure = {"sections": []}

        result = await agent.execute(idea_text, extracted_structure)
        assert "response" in result or "raw_response" in result

    @pytest.mark.asyncio
    async def test_builder_agent_execute(self, mock_llm):
        """Test BuilderAgent execution"""
        mock_response = MagicMock()
        mock_response.content = '{"response": "Test feasibility analysis", "claims": []}'
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        agent = BuilderAgent(
            llm=mock_llm,
            debate_id="test-123",
        )

        idea_text = "Test idea"
        extracted_structure = {"sections": []}

        result = await agent.execute(idea_text, extracted_structure)
        assert "response" in result or "raw_response" in result
