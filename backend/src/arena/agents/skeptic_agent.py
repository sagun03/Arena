"""Skeptic agent - Adversarial short-seller perspective"""

from typing import Any, Dict, Optional

from arena.agents.base_worker import BaseWorkerAgent
from arena.llm.gemini_client import get_gemini_llm
from arena.llm.prompts import SKEPTIC_PROMPT
from langchain_core.language_models import BaseChatModel


class SkepticAgent(BaseWorkerAgent):
    """
    Skeptic Agent - Attacks idea from short-seller's perspective.

    Focuses on:
    - Fatal flaws that could kill the idea
    - Weak assumptions likely to be false
    - Market risks and business model flaws
    - Execution risks
    """

    def __init__(
        self,
        debate_id: Optional[str] = None,
        temperature: float = 0.8,
        llm: Optional[BaseChatModel] = None,
    ):
        """
        Initialize Skeptic agent.

        Args:
            debate_id: Optional debate ID for evidence filtering
            temperature: LLM temperature (higher = more adversarial)
        """
        llm = llm or get_gemini_llm(temperature=temperature)
        super().__init__(
            name="Skeptic",
            role="Adversarial short-seller - finds flaws and risks",
            llm=llm,
            prompt_template=SKEPTIC_PROMPT,
            debate_id=debate_id,
        )

    async def attack_idea(
        self,
        idea_text: str,
        extracted_structure: Dict[str, Any],
        previous_context: Optional[Dict[str, Any]] = None,
        historical_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Attack idea from adversarial perspective.

        Args:
            idea_text: Original PRD text
            extracted_structure: Extracted structure from PRD
            previous_context: Context from previous rounds (e.g., clarification)

        Returns:
            Dictionary with attack points, fatal flaws, and evidence tags
        """
        # Execute worker agent (base class handles JSON conversion)
        result = await self.execute(
            idea_text=idea_text,
            extracted_structure=extracted_structure,
            previous_context=previous_context,
            round_number=2,
            historical_context=historical_context,
        )

        return result
