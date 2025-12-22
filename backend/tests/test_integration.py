"""Integration tests for API endpoints"""

import pytest
from arena.llm.prd_extractor import extract_idea_from_prd


@pytest.mark.asyncio
async def test_prd_extraction():
    """Test PRD extraction"""
    prd_text = "A simple app to manage tasks"
    idea = await extract_idea_from_prd(prd_text)
    assert idea is not None
    assert idea.original_prd_text == prd_text


@pytest.mark.asyncio
async def test_idea_validation_endpoint(client):
    """Test idea validation API endpoint"""
    prd_text = "A mobile app for tracking expenses"

    response = await client.post("/arena/validate", json={"prd_text": prd_text})

    assert response.status_code == 200
    data = response.json()
    assert "debate_id" in data
    assert data["message"] is not None
