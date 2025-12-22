"""Judge agent - Supervisor agent for quality control and verdict generation"""

import json
from typing import Any, Dict, List, Optional

from arena.agents.base_agent import BaseAgent
from arena.llm.prompts import (
    JUDGE_CLARIFICATION_PROMPT,
    JUDGE_QUALITY_GATE_PROMPT,
    JUDGE_VERDICT_PROMPT,
)
from arena.models.evidence import EvidenceTag
from arena.models.idea import Idea
from arena.models.verdict import Verdict
from langchain_core.language_models import BaseChatModel


class JudgeAgent(BaseAgent):
    """
    Judge Supervisor Agent.

    Responsible for:
    - Round 1: Clarification - forcing clear articulation
    - Quality gates: Validating round outputs
    - Round 5: Verdict generation - final decision
    """

    def __init__(self, llm: BaseChatModel, debate_id: Optional[str] = None):
        """
        Initialize Judge agent.

        Args:
            llm: LangChain LLM instance
            debate_id: Optional debate ID for evidence filtering
        """
        super().__init__(
            name="Judge",
            role="Supervisor - Quality control and decision making",
            llm=llm,
            debate_id=debate_id,
        )

    async def clarify_idea(self, idea: Idea) -> Dict[str, Any]:
        """
        Round 1: Clarify idea by forcing clear articulation.

        Args:
            idea: Idea object with PRD text and extracted structure

        Returns:
            Dictionary with clarification questions, articulations, and quality score
        """
        # Format prompt
        prompt = self.format_prompt(
            JUDGE_CLARIFICATION_PROMPT,
            idea_text=idea.original_prd_text,
            extracted_structure=json.dumps(idea.extracted_structure.model_dump(), indent=2),
        )

        # Invoke LLM
        response = await self.invoke(prompt)

        # Parse response
        parsed_response = self.parse_json_response(response)

        # Extract evidence tags
        evidence_tags = self.extract_evidence_tags(parsed_response, round_number=1)

        # Store evidence
        if evidence_tags:
            await self.store_evidence_tags(evidence_tags, round_number=1)

        return {
            "clarification_questions": parsed_response.get("clarification_questions", []),
            "identified_gaps": parsed_response.get("identified_gaps", []),
            "required_articulations": parsed_response.get("required_articulations", {}),
            "quality_score": parsed_response.get("quality_score", 0.0),
            "ready_for_debate": parsed_response.get("ready_for_debate", False),
            "evidence_tags": evidence_tags,
            "raw_response": response,
        }

    async def evaluate_quality_gate(
        self,
        round_type: str,
        round_output: Dict[str, Any],
        evidence_tags: Optional[List[EvidenceTag]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate quality gate after a round.

        Args:
            round_type: Type of round (e.g., "clarification", "attacks", "defense")
            round_output: Output from the round
            evidence_tags: Optional evidence tags from the round

        Returns:
            Dictionary with quality evaluation and decision
        """
        # Format round output as JSON string for prompt
        round_output_str = json.dumps(round_output, indent=2)
        evidence_tags_str = (
            json.dumps([tag.model_dump() for tag in evidence_tags], indent=2)
            if evidence_tags
            else "[]"
        )

        # Format prompt
        prompt = self.format_prompt(
            JUDGE_QUALITY_GATE_PROMPT,
            round_type=round_type,
            round_output=round_output_str,
            evidence_tags=evidence_tags_str,
        )

        # Invoke LLM
        response = await self.invoke(prompt)

        # Parse response
        parsed_response = self.parse_json_response(response)

        return {
            "quality_score": parsed_response.get("quality_score", 0.0),
            "meets_standards": parsed_response.get("meets_standards", False),
            "issues": parsed_response.get("issues", []),
            "strengths": parsed_response.get("strengths", []),
            "decision": parsed_response.get("decision", "retry"),
            "feedback": parsed_response.get("feedback", ""),
            "raw_response": response,
        }

    async def generate_verdict(
        self,
        idea: Idea,
        clarification: str,
        attacks: Dict[str, str],
        defense: str,
        cross_examination: List[Dict[str, str]],
        evidence_tags: List[EvidenceTag],
    ) -> Verdict:
        """
        Round 5: Generate final verdict.

        Args:
            idea: Original idea
            clarification: Round 1 clarification output
            attacks: Round 2 attacks from worker agents
            defense: Round 3 defense from Builder
            cross_examination: Round 4 cross-examination results
            evidence_tags: All evidence tags from debate

        Returns:
            Verdict object with decision, scorecard, kill-shots, etc.
        """
        # Format evidence tags as JSON
        evidence_tags_str = json.dumps([tag.model_dump() for tag in evidence_tags], indent=2)

        # Format attacks as JSON
        attacks_str = json.dumps(attacks, indent=2)

        # Format cross-examination as JSON
        cross_exam_str = json.dumps(cross_examination, indent=2)

        # Format prompt
        prompt = self.format_prompt(
            JUDGE_VERDICT_PROMPT,
            idea_text=idea.original_prd_text,
            clarification=clarification,
            attacks=attacks_str,
            defense=defense,
            cross_examination=cross_exam_str,
            evidence_tags=evidence_tags_str,
        )

        # Invoke LLM
        response = await self.invoke(prompt)

        # Parse response
        parsed_response = self.parse_json_response(response)

        # Convert to Verdict model
        verdict = Verdict(
            decision=parsed_response["decision"],
            scorecard=parsed_response["scorecard"],
            kill_shots=parsed_response["kill_shots"],
            assumptions=parsed_response["assumptions"],
            test_plan=parsed_response["test_plan"],
            reasoning=parsed_response["reasoning"],
            confidence=parsed_response.get("confidence", 0.5),
        )

        return verdict

    def validate_evidence(self, evidence_tags: List[EvidenceTag]) -> Dict[str, Any]:
        """
        Validate evidence tags for consistency and quality.

        Args:
            evidence_tags: List of evidence tags to validate

        Returns:
            Validation results
        """
        verified_count = sum(1 for tag in evidence_tags if tag.type.value == "Verified")
        assumption_count = sum(1 for tag in evidence_tags if tag.type.value == "Assumption")
        needs_validation_count = sum(
            1 for tag in evidence_tags if tag.type.value == "NeedsValidation"
        )

        validation_results: Dict[str, Any] = {
            "total_tags": len(evidence_tags),
            "verified_count": verified_count,
            "assumption_count": assumption_count,
            "needs_validation_count": needs_validation_count,
            "issues": [],
        }

        # Check for potential issues
        if verified_count == 0:
            validation_results["issues"].append("No verified evidence found")

        if assumption_count > verified_count * 2:
            validation_results["issues"].append(
                "Too many assumptions relative to verified evidence"
            )

        return validation_results
