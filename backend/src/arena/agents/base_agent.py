"""Base agent class with evidence tagging and ChromaDB integration"""

import json
from typing import Any, Dict, List, Optional

from arena.llm.rate_control import llm_call_with_limits
from arena.models.evidence import EvidenceTag, EvidenceType
from arena.monitoring.metrics import record_llm_call
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage


class BaseAgent:
    """
    Base agent class with evidence tagging and ChromaDB integration.

    All agents in ARENA extend this class to get:
    - Evidence tagging functionality
    - ChromaDB integration for evidence storage/retrieval
    - Response parsing utilities
    - Error handling
    """

    def __init__(
        self,
        name: str,
        role: str,
        llm: BaseChatModel,
        debate_id: Optional[str] = None,
    ):
        """
        Initialize base agent.

        Args:
            name: Agent name (e.g., "Skeptic", "Judge")
            role: Agent role description
            llm: LangChain LLM instance
            debate_id: Optional debate ID for evidence filtering
        """
        self.name = name
        self.role = role
        self.llm = llm
        self.debate_id = debate_id

    async def invoke(self, prompt: str, **kwargs: Any) -> str:
        """
        Invoke LLM with prompt.

        Args:
            prompt: Prompt text
            **kwargs: Additional arguments for LLM

        Returns:
            LLM response content
        """
        message = HumanMessage(content=prompt)
        response = await llm_call_with_limits(
            self.debate_id,
            lambda: self.llm.ainvoke([message], **kwargs),
        )
        content = response.content
        if isinstance(content, str):
            record_llm_call("agent_invoke", self.debate_id, "ok")
            return content
        elif isinstance(content, list):
            # Handle list of content blocks
            result = str(content[0]) if content else ""
            record_llm_call("agent_invoke", self.debate_id, "ok")
            return result
        else:
            result = str(content)
            record_llm_call("agent_invoke", self.debate_id, "ok")
            return result

    def parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        Parse JSON response from LLM, handling markdown code blocks.
        Falls back to structured format if response is plain text.

        Args:
            response: Raw LLM response

        Returns:
            Parsed JSON dictionary

        Raises:
            json.JSONDecodeError: If response cannot be parsed
        """
        import sys

        content = response.strip()

        # Debug log for empty or very short responses
        if not content or len(content) < 10:
            print(
                f"[{self.name}] WARNING: Empty/short response (len={len(content)}): "
                f"{repr(content[:100])}",
                file=sys.stderr,
            )

        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        if not content:
            print(
                f"[{self.name}] ERROR: Empty after stripping. Original: {repr(response[:200])}",
                file=sys.stderr,
            )
            raise ValueError(f"{self.name} returned empty response after code block removal")

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            print(
                f"[{self.name}] WARNING: JSON parse failed, wrapping plain " f"text response",
                file=sys.stderr,
            )
            # Fallback: if it's not JSON, wrap the text response in a response field
            return {"response": content, "raw_response": response, "parsed_as": "plain_text"}

    def extract_evidence_tags(
        self,
        response_data: Dict[str, Any],
        round_number: int,
        source_lookup: Optional[List[Dict[str, Any]]] = None,
    ) -> List[EvidenceTag]:
        """
        Extract evidence tags from agent response.

        Args:
            response_data: Parsed JSON response from agent
            round_number: Current debate round number

        Returns:
            List of EvidenceTag objects
        """
        evidence_tags = []

        # Check for claims array in response
        if "claims" in response_data:
            for claim in response_data["claims"]:
                if isinstance(claim, dict) and "text" in claim and "type" in claim:
                    try:
                        evidence_type = EvidenceType(claim["type"])
                        sources = []
                        if source_lookup and isinstance(claim.get("sources"), list):
                            for index in claim["sources"]:
                                if (
                                    isinstance(index, int)
                                    and 0 <= index < len(source_lookup)
                                    and isinstance(source_lookup[index], dict)
                                ):
                                    sources.append(source_lookup[index])
                        evidence_tags.append(
                            EvidenceTag(
                                text=claim["text"],
                                type=evidence_type,
                                agent=self.name,
                                round=round_number,
                                sources=sources,
                            )
                        )
                    except ValueError:
                        # Invalid evidence type, skip
                        continue

        return evidence_tags

    def format_prompt(self, template: str, **kwargs: Any) -> str:
        """
        Format prompt template with provided arguments.

        Gracefully handles missing template variables by providing defaults.

        Args:
            template: Prompt template string
            **kwargs: Arguments to format into template

        Returns:
            Formatted prompt string
        """
        import re

        # Find all placeholder variables in template
        placeholders = set(re.findall(r"\{(\w+)\}", template))

        # Add default empty values for missing placeholders
        for placeholder in placeholders:
            if placeholder not in kwargs:
                kwargs[placeholder] = ""

        return template.format(**kwargs)

    async def process_response(
        self,
        response: str,
        round_number: int,
        source_lookup: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Process agent response: parse JSON and extract evidence tags.

        Args:
            response: Raw LLM response
            round_number: Current debate round number

        Returns:
            Dictionary with parsed response and evidence tags
        """
        # Parse JSON response
        parsed_response = self.parse_json_response(response)

        # Extract evidence tags
        evidence_tags = self.extract_evidence_tags(parsed_response, round_number, source_lookup)

        return {
            "response": parsed_response,
            "evidence_tags": evidence_tags,
            "raw_response": response,
        }
