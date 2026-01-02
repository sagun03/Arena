"""Integration tests for API endpoints"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from arena.models.idea import ExtractedStructure, Idea


@pytest.mark.asyncio
async def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_validate_idea_endpoint(client):
    """Test POST /arena/validate endpoint"""
    with patch("arena.routers.arena.extract_idea_from_prd") as mock_extract, patch(
        "arena.routers.arena.save_debate_state"
    ) as mock_save, patch("arena.routers.arena.execute_debate") as mock_execute, patch(
        "arena.routers.arena.consume_credits"
    ) as mock_consume, patch(
        "arena.routers.arena.get_firestore_client"
    ) as mock_firestore:
        # Mock idea extraction
        mock_idea = Idea(
            original_prd_text="Test PRD",
            extracted_structure=ExtractedStructure(),
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

        response = client.post(
            "/arena/validate",
            json={"prd_text": "Test PRD text"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "debate_id" in data
        assert "message" in data


@pytest.mark.asyncio
async def test_get_debate_endpoint(client):
    """Test GET /arena/debate/{debate_id} endpoint"""
    with patch("arena.routers.arena.get_debate_state") as mock_get:
        mock_state = {
            "debate_id": "test-123",
            "user_id": "test-user",
            "current_round": 2,
            "round_status": "in_progress",
            "transcript": [],
            "evidence_tags": [],
        }
        mock_get.return_value = mock_state

        response = client.get("/arena/debate/test-123")

        assert response.status_code == 200
        data = response.json()
        assert data["debate_id"] == "test-123"
        assert data["current_round"] == 2


@pytest.mark.asyncio
async def test_get_debate_not_found(client):
    """Test GET /arena/debate/{debate_id} with non-existent debate"""
    with patch("arena.routers.arena.get_debate_state") as mock_get:
        mock_get.return_value = None

        response = client.get("/arena/debate/non-existent")

        assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_verdict_endpoint(client):
    """Test GET /arena/debate/{debate_id}/verdict endpoint"""
    with patch("arena.routers.arena.get_debate_state") as mock_get, patch(
        "arena.routers.arena.get_firestore_client"
    ) as mock_firestore:
        mock_state = {
            "debate_id": "test-123",
            "user_id": "test-user",
            "round_status": "completed",
            "verdict": {
                "decision": "Proceed",
                "scorecard": {
                    "overall_score": 75,
                    "market_score": 80,
                    "customer_score": 70,
                    "feasibility_score": 75,
                    "differentiation_score": 70,
                },
                "kill_shots": [],
                "assumptions": [],
                "test_plan": [],
                "reasoning": "Test reasoning",
                "confidence": 0.8,
            },
        }
        mock_get.return_value = mock_state
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_doc.to_dict.return_value = {}
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_firestore.return_value = mock_db

        response = client.get("/arena/debate/test-123/verdict")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["verdict"] is not None


@pytest.mark.asyncio
async def test_get_verdict_pending(client):
    """Test GET /arena/debate/{debate_id}/verdict with pending debate"""
    with patch("arena.routers.arena.get_debate_state") as mock_get, patch(
        "arena.routers.arena.get_firestore_client"
    ) as mock_firestore:
        mock_state = {
            "debate_id": "test-123",
            "user_id": "test-user",
            "round_status": "in_progress",
        }
        mock_get.return_value = mock_state
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_doc.to_dict.return_value = {}
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_firestore.return_value = mock_db

        response = client.get("/arena/debate/test-123/verdict")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
        assert data["verdict"] is None


@pytest.mark.asyncio
async def test_get_graph_structure(client):
    """Test GET /arena/graph/structure endpoint"""
    response = client.get("/arena/graph/structure")

    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert "mermaid" in data
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0


@pytest.mark.asyncio
async def test_get_debate_graph_progress(client):
    """Test GET /arena/debate/{debate_id}/graph endpoint"""
    with patch("arena.routers.arena.get_debate_state") as mock_get:
        mock_state = {
            "debate_id": "test-123",
            "user_id": "test-user",
            "current_round": 2,
            "round_status": "in_progress",
        }
        mock_get.return_value = mock_state

        response = client.get("/arena/debate/test-123/graph")

        assert response.status_code == 200
        data = response.json()
        assert data["debate_id"] == "test-123"
        assert data["current_round"] == 2
        assert "completed_nodes" in data
        assert "pending_nodes" in data
