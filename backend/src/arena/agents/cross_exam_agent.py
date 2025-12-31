"""Cross-examination agent for Round 4."""

from typing import Any, Dict, Optional

from arena.agents.base_agent import BaseAgent
from arena.llm.gemini_client import get_gemini_llm
from arena.llm.prompts import CROSS_EXAMINATION_PROMPT
from langchain_core.language_models import BaseChatModel


class CrossExamAgent(BaseAgent):
    """Agent that challenges other agents' claims in Round 4."""

    def __init__(
        self,
        name: str,
        perspective: str,
        debate_id: Optional[str] = None,
        temperature: float = 0.7,
        llm: Optional[BaseChatModel] = None,
    ) -> None:
        llm = llm or get_gemini_llm(temperature=temperature)
        super().__init__(
            name=name,
            role=f"Cross-examination: {perspective}",
            llm=llm,
            debate_id=debate_id,
        )
        self.perspective = perspective

    async def cross_examine(
        self,
        idea_text: str,
        clarification: str,
        attacks: Dict[str, Any],
        defense: Dict[str, Any],
        other_claims: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Run the cross-exam prompt and return parsed response + evidence tags."""

        import json

        prompt = self.format_prompt(
            CROSS_EXAMINATION_PROMPT,
            agent_name=self.name,
            agent_perspective=self.perspective,
            idea_text=idea_text,
            clarification=clarification,
            attacks=json.dumps(attacks, indent=2),
            defense=json.dumps(defense, indent=2),
            other_claims=json.dumps(other_claims, indent=2),
        )

        response = await self.invoke(prompt)
        return await self.process_response(response, round_number=4)
