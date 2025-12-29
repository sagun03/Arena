"""Customer agent - Customer reality and willingness to pay"""

from typing import Any, Dict, Optional

from arena.agents.base_worker import BaseWorkerAgent
from arena.llm.gemini_client import get_gemini_llm
from arena.llm.prompts import CUSTOMER_PROMPT
from langchain_core.language_models import BaseChatModel


class CustomerAgent(BaseWorkerAgent):
    """
    Customer Reality Agent - Analyzes from customer's perspective.

    Focuses on:
    - Problem validation (do customers have this problem?)
    - Pain level and willingness to pay
    - Alternatives customers currently use
    - Switching costs and barriers
    - Customer segment analysis
    """

    def __init__(
        self,
        debate_id: Optional[str] = None,
        temperature: float = 0.7,
        llm: Optional[BaseChatModel] = None,
    ):
        """
        Initialize Customer agent.

        Args:
            debate_id: Optional debate ID for evidence filtering
            temperature: LLM temperature
        """
        llm = llm or get_gemini_llm(temperature=temperature)
        super().__init__(
            name="Customer",
            role="Customer reality - analyzes pain points and willingness to pay",
            llm=llm,
            prompt_template=CUSTOMER_PROMPT,
            debate_id=debate_id,
        )

    async def analyze_customer(
        self,
        idea_text: str,
        extracted_structure: Dict[str, Any],
        previous_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze idea from customer perspective.

        Args:
            idea_text: Original PRD text
            extracted_structure: Extracted structure from PRD
            previous_context: Context from previous rounds

        Returns:
            Dictionary with customer analysis and evidence tags
        """
        # Execute worker agent (base class handles JSON conversion)
        result = await self.execute(
            idea_text=idea_text,
            extracted_structure=extracted_structure,
            previous_context=previous_context,
            round_number=2,
        )

        return result
