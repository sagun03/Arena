"""Integration tests for API endpoints"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from arena.llm.prd_extractor import extract_idea_from_prd
from arena.models.idea import ExtractedStructure, Idea


@pytest.mark.asyncio
async def test_prd_extraction():
    """Test PRD extraction (with mocked LLM)"""
    prd_text = "A simple app to manage tasks"

    with patch("arena.llm.prd_extractor.get_gemini_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        json_str = (
            '{"sections": [], "key_facts": {"title": "Task Manager"}, '
            '"lists": {}, "metadata": {"title": "Task Manager"}}'
        )
        mock_llm.ainvoke = AsyncMock(return_value=AsyncMock(content=json_str))
        mock_get_llm.return_value = mock_llm

        idea = await extract_idea_from_prd(prd_text)
        assert idea is not None
        assert idea.original_prd_text == prd_text


@pytest.mark.asyncio
async def test_idea_validation_endpoint(client):
    """Test idea validation API endpoint (with mocked extract and save)"""
    prd_text = "A mobile app for tracking expenses"

    with patch("arena.routers.arena.extract_idea_from_prd") as mock_extract, patch(
        "arena.routers.arena.save_debate_state"
    ) as mock_save, patch("arena.routers.arena.execute_debate") as mock_execute, patch(
        "arena.routers.arena.consume_credits"
    ) as mock_consume, patch(
        "arena.routers.arena.get_firestore_client"
    ) as mock_firestore:
        mock_idea = Idea(
            original_prd_text=prd_text,
            extracted_structure=ExtractedStructure(metadata={"title": "Expense Tracker"}),
        )
        mock_extract.return_value = mock_idea
        mock_save.return_value = AsyncMock()
        mock_execute.return_value = AsyncMock()
        mock_consume.return_value = None

        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_doc.to_dict.return_value = {}
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_firestore.return_value = mock_db

        response = client.post("/arena/validate", json={"prd_text": prd_text})

        assert response.status_code == 200
        data = response.json()
        assert "debate_id" in data
        assert data["message"] is not None
