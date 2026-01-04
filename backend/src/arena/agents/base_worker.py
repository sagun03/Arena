"""Base worker agent class"""

from typing import Optional

from arena.agents.base_agent import BaseAgent
from langchain_core.language_models import BaseChatModel


class BaseWorkerAgent(BaseAgent):
    """
    Base worker agent class.

    Worker agents (Skeptic, Customer, Market, Builder) extend this class.
    They execute specialized tasks and their outputs are validated by the Judge supervisor.
    """

    def __init__(
        self,
        name: str,
        role: str,
        llm: BaseChatModel,
        prompt_template: str,
        debate_id: Optional[str] = None,
    ):
        """
        Initialize worker agent.

        Args:
            name: Agent name (e.g., "Skeptic", "Customer")
            role: Agent role description
            llm: LangChain LLM instance
            prompt_template: Prompt template for this agent
            debate_id: Optional debate ID for evidence filtering
        """
        super().__init__(name=name, role=role, llm=llm, debate_id=debate_id)
        self.prompt_template = prompt_template

    async def execute(
        self,
        idea_text: str,
        extracted_structure: dict,
        previous_context: Optional[dict] = None,
        round_number: int = 2,
        attacks: Optional[dict] = None,
        historical_context: Optional[str] = None,
        grounded_sources: Optional[list[dict]] = None,
    ) -> dict:
        """
        Execute worker agent task.

        Args:
            idea_text: Original PRD text
            extracted_structure: Extracted structure from PRD (dict)
            previous_context: Context from previous rounds
            round_number: Current debate round number
            attacks: Optional attacks dict for defense agents
            historical_context: Optional historical context for formatting

        Returns:
            Processed response with evidence tags
        """
        # Convert extracted_structure to JSON string for prompt
        import json

        extracted_structure_str = json.dumps(extracted_structure, indent=2)
        previous_context_str = json.dumps(previous_context, indent=2) if previous_context else "{}"
        attacks_str = json.dumps(attacks, indent=2) if attacks else "{}"
        historical_context_str = historical_context or ""
        grounded_sources_list = grounded_sources or []
        grounded_sources_prompt = [
            {"index": idx, **source} for idx, source in enumerate(grounded_sources_list)
        ]
        grounded_sources_str = json.dumps(grounded_sources_prompt, indent=2)

        # Format prompt (only include args used by this agent's template)
        prompt = self.format_prompt(
            self.prompt_template,
            idea_text=idea_text,
            extracted_structure=extracted_structure_str,
            previous_context=previous_context_str,
            attacks=attacks_str,  # Added for builder agent
            historical_context=historical_context_str,
            grounded_sources=grounded_sources_str,
        )

        # Invoke LLM
        response = await self.invoke(prompt)

        # Process response (parse, extract evidence, store)
        result = await self.process_response(response, round_number, grounded_sources_list)

        return result
