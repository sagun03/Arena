"""Synthetic interview agent for persona-based feedback."""

import json
from typing import Any, Dict, Optional

from arena.agents.base_agent import BaseAgent
from arena.llm.gemini_client import get_gemini_llm
from arena.llm.prompts import INTERVIEW_PROMPT, INTERVIEW_REBUTTAL_PROMPT
from langchain_core.language_models import BaseChatModel


class InterviewAgent(BaseAgent):
    """Persona-driven interview agent."""

    def __init__(
        self,
        debate_id: Optional[str] = None,
        temperature: float = 0.6,
        llm: Optional[BaseChatModel] = None,
    ) -> None:
        llm = llm or get_gemini_llm(temperature=temperature)
        super().__init__(
            name="Customer",
            role="Synthetic customer persona interview",
            llm=llm,
            debate_id=debate_id,
        )

    async def run_interview(
        self,
        idea_text: str,
        persona: Dict[str, Any],
        extracted_structure: Dict[str, Any],
    ) -> Dict[str, Any]:
        prompt = self.format_prompt(
            INTERVIEW_PROMPT,
            idea_text=idea_text,
            persona=json.dumps(persona, indent=2),
            extracted_structure=json.dumps(extracted_structure, indent=2),
        )
        response = await self.invoke(prompt)
        parsed_response = self.parse_json_response(response)
        return {
            "response": parsed_response,
            "raw_response": response,
        }

    async def rebuttal_chat(
        self,
        idea_text: str,
        persona: Dict[str, Any],
        founder_message: str,
        history: list[dict[str, str]],
    ) -> Dict[str, Any]:
        prompt = self.format_prompt(
            INTERVIEW_REBUTTAL_PROMPT,
            idea_text=idea_text,
            persona=json.dumps(persona, indent=2),
            founder_message=founder_message,
            history=json.dumps(history, indent=2),
        )
        response = await self.invoke(prompt)
        parsed_response = self.parse_json_response(response)
        return {
            "response": parsed_response,
            "raw_response": response,
        }
