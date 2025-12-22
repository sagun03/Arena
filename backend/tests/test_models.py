"""Unit tests for data models"""

import pytest
from arena.models.evidence import EvidenceTag, EvidenceType
from arena.models.idea import ExtractedStructure, Idea, IdeaInput, Section
from arena.models.verdict import KillShot, Scorecard, TestPlanItem, Verdict
from pydantic import ValidationError


class TestIdeaModels:
    """Tests for idea models"""

    def test_section_model(self):
        """Test Section model"""
        section = Section(
            title="Test Section",
            content="Test content",
            category="core",
            key_points=["Point 1", "Point 2"],
        )
        assert section.title == "Test Section"
        assert section.category == "core"

    def test_extracted_structure_model(self):
        """Test ExtractedStructure model"""
        structure = ExtractedStructure(
            sections=[],
            key_facts={"key": "value"},
            lists={"items": ["a", "b"]},
        )
        assert structure.key_facts["key"] == "value"
        assert len(structure.lists["items"]) == 2

    def test_idea_model(self):
        """Test Idea model"""
        idea = Idea(
            original_prd_text="Test PRD",
            extracted_structure=ExtractedStructure(),
        )
        assert idea.original_prd_text == "Test PRD"

    def test_idea_input_model(self):
        """Test IdeaInput model"""
        input_data = IdeaInput(prd_text="Test PRD text")
        assert input_data.prd_text == "Test PRD text"


class TestVerdictModels:
    """Tests for verdict models"""

    def test_scorecard_model(self):
        """Test Scorecard model"""
        scorecard = Scorecard(
            overall_score=75,
            market_score=80,
            customer_score=70,
            feasibility_score=75,
            differentiation_score=70,
        )
        assert scorecard.overall_score == 75
        assert 0 <= scorecard.overall_score <= 100

    def test_scorecard_validation(self):
        """Test Scorecard validation"""
        with pytest.raises(ValidationError):
            Scorecard(
                overall_score=150,  # Invalid: > 100
                market_score=80,
                customer_score=70,
                feasibility_score=75,
                differentiation_score=70,
            )

    def test_killshot_model(self):
        """Test KillShot model"""
        killshot = KillShot(
            title="Market Saturated",
            description="Market is dominated",
            severity="critical",
            agent="Market",
        )
        assert killshot.title == "Market Saturated"
        assert killshot.severity == "critical"

    def test_test_plan_item_model(self):
        """Test TestPlanItem model"""
        item = TestPlanItem(
            day=1,
            task="Interview customers",
            success_criteria="5+ interviews",
        )
        assert item.day == 1
        assert 1 <= item.day <= 7

    def test_verdict_model(self):
        """Test Verdict model"""
        verdict = Verdict(
            decision="Proceed",
            scorecard=Scorecard(
                overall_score=75,
                market_score=80,
                customer_score=70,
                feasibility_score=75,
                differentiation_score=70,
            ),
            kill_shots=[],
            assumptions=[],
            test_plan=[],
            reasoning="Test reasoning",
            confidence=0.8,
        )
        assert verdict.decision == "Proceed"
        assert 0.0 <= verdict.confidence <= 1.0


class TestEvidenceModels:
    """Tests for evidence models"""

    def test_evidence_tag_model(self):
        """Test EvidenceTag model"""
        tag = EvidenceTag(
            text="Test claim",
            type=EvidenceType.EVIDENCE,
            agent="Skeptic",
            round=2,
        )
        assert tag.text == "Test claim"
        assert tag.type == EvidenceType.EVIDENCE
        assert tag.agent == "Skeptic"
        assert tag.round == 2

    def test_evidence_types(self):
        """Test all evidence types"""
        assert EvidenceType.EVIDENCE.value == "evidence"
        assert EvidenceType.ASSUMPTION.value == "assumption"
        assert EvidenceType.NEEDS_VALIDATION.value == "needs_validation"
