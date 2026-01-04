"""Market agent - Market saturation and competition analysis"""

from typing import Any, Dict, Optional

from arena.agents.base_worker import BaseWorkerAgent
from arena.llm.gemini_client import get_gemini_llm
from arena.llm.prompts import MARKET_PROMPT
from langchain_core.language_models import BaseChatModel


class MarketAgent(BaseWorkerAgent):
    """
    Market & Competition Agent - Analyzes market dynamics.

    Focuses on:
    - Market size validation
    - Direct and indirect competitors
    - Market saturation analysis
    - Barriers to entry
    - Competitive advantage assessment
    """

    def __init__(
        self,
        debate_id: Optional[str] = None,
        temperature: float = 0.7,
        llm: Optional[BaseChatModel] = None,
    ):
        """
        Initialize Market agent.

        Args:
            debate_id: Optional debate ID for evidence filtering
            temperature: LLM temperature
        """
        llm = llm or get_gemini_llm(temperature=temperature)
        super().__init__(
            name="Market",
            role="Market & competition - analyzes saturation and competitors",
            llm=llm,
            prompt_template=MARKET_PROMPT,
            debate_id=debate_id,
        )

    async def analyze_market(
        self,
        idea_text: str,
        extracted_structure: Dict[str, Any],
        previous_context: Optional[Dict[str, Any]] = None,
        historical_context: Optional[str] = None,
        grounded_sources: Optional[list[dict]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze market and competition.

        Args:
            idea_text: Original PRD text
            extracted_structure: Extracted structure from PRD
            previous_context: Context from previous rounds

        Returns:
            Dictionary with market analysis and evidence tags
        """
        # Execute worker agent (base class handles JSON conversion)
        result = await self.execute(
            idea_text=idea_text,
            extracted_structure=extracted_structure,
            previous_context=previous_context,
            round_number=2,
            historical_context=historical_context,
            grounded_sources=grounded_sources,
        )

        return result
