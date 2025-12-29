"""Builder agent - Feasibility analysis and constrained defense"""

import json
from typing import Any, Dict, List, Optional

from arena.agents.base_worker import BaseWorkerAgent
from arena.llm.gemini_client import get_gemini_llm
from arena.llm.prompts import BUILDER_PROMPT
from arena.models.evidence import EvidenceTag
from langchain_core.language_models import BaseChatModel


class BuilderAgent(BaseWorkerAgent):
    """
    Builder/Feasibility Agent - Analyzes feasibility and provides defense.

    Focuses on:
    - Technical and business feasibility
    - Constrained defense (using only stated facts)
    - Risk assessment and mitigation
    - Implementation challenges
    """

    def __init__(
        self,
        debate_id: Optional[str] = None,
        temperature: float = 0.6,
        llm: Optional[BaseChatModel] = None,
    ):
        """
        Initialize Builder agent.

        Args:
            debate_id: Optional debate ID for evidence filtering
            temperature: LLM temperature (lower = more constrained)
        """
        llm = llm or get_gemini_llm(temperature=temperature)
        super().__init__(
            name="Builder",
            role="Feasibility & defense - analyzes technical/business feasibility",
            llm=llm,
            prompt_template=BUILDER_PROMPT,
            debate_id=debate_id,
        )

    async def defend_idea(
        self,
        idea_text: str,
        extracted_structure: Dict[str, Any],
        attacks: Dict[str, str],
        evidence_tags: List[EvidenceTag],
    ) -> Dict[str, Any]:
        """
        Provide constrained defense of the idea.

        Args:
            idea_text: Original PRD text
            extracted_structure: Extracted structure from PRD
            attacks: Attacks from Round 2 (Skeptic, Customer, Market)
            evidence_tags: Evidence tags from previous rounds

        Returns:
            Dictionary with defense, feasibility analysis, and evidence tags
        """
        # Format extracted structure as JSON string
        extracted_structure_str = json.dumps(extracted_structure, indent=2)
        attacks_str = json.dumps(attacks, indent=2)
        evidence_tags_str = json.dumps([tag.model_dump() for tag in evidence_tags], indent=2)

        # Format prompt with attacks and evidence
        prompt = self.format_prompt(
            self.prompt_template,
            idea_text=idea_text,
            extracted_structure=extracted_structure_str,
            attacks=attacks_str,
            evidence_tags=evidence_tags_str,
        )

        # Invoke LLM
        response = await self.invoke(prompt)

        # Process response (parse, extract evidence, store)
        result = await self.process_response(response, round_number=3)

        return result
