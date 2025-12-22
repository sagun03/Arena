"""Base agent class with evidence tagging and ChromaDB integration"""

import json
from typing import Any, Dict, List, Optional

from arena.models.evidence import EvidenceTag, EvidenceType
from arena.vectorstore.evidence_store import search_similar_evidence, store_evidence
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
        response = await self.llm.ainvoke([message], **kwargs)
        content = response.content
        if isinstance(content, str):
            return content
        elif isinstance(content, list):
            # Handle list of content blocks
            return str(content[0]) if content else ""
        else:
            return str(content)

    def parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        Parse JSON response from LLM, handling markdown code blocks.

        Args:
            response: Raw LLM response

        Returns:
            Parsed JSON dictionary

        Raises:
            json.JSONDecodeError: If response cannot be parsed
        """
        content = response.strip()

        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        return json.loads(content)

    def extract_evidence_tags(
        self, response_data: Dict[str, Any], round_number: int
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
                        evidence_tags.append(
                            EvidenceTag(
                                text=claim["text"],
                                type=evidence_type,
                                agent=self.name,
                                round=round_number,
                            )
                        )
                    except ValueError:
                        # Invalid evidence type, skip
                        continue

        return evidence_tags

    async def store_evidence_tags(
        self, evidence_tags: List[EvidenceTag], round_number: int
    ) -> List[str]:
        """
        Store evidence tags in ChromaDB.

        Args:
            evidence_tags: List of evidence tags to store
            round_number: Current debate round number

        Returns:
            List of document IDs
        """
        doc_ids = []
        for tag in evidence_tags:
            metadata = {
                "agent": tag.agent,
                "round": tag.round,
                "evidence_type": tag.type.value,
                "debate_id": self.debate_id,
            }
            doc_id = await store_evidence(tag.text, metadata)
            doc_ids.append(doc_id)
        return doc_ids

    async def search_evidence(
        self, query: str, n: int = 5, debate_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar evidence in ChromaDB.

        Args:
            query: Search query
            n: Number of results
            debate_id: Optional debate ID to filter (defaults to self.debate_id)

        Returns:
            List of similar evidence
        """
        search_debate_id = debate_id or self.debate_id
        return await search_similar_evidence(query, n=n, debate_id=search_debate_id)

    def format_prompt(self, template: str, **kwargs: Any) -> str:
        """
        Format prompt template with provided arguments.

        Args:
            template: Prompt template string
            **kwargs: Arguments to format into template

        Returns:
            Formatted prompt string
        """
        return template.format(**kwargs)

    async def process_response(
        self, response: str, round_number: int, should_store_evidence: bool = True
    ) -> Dict[str, Any]:
        """
        Process agent response: parse JSON, extract evidence tags, store evidence.

        Args:
            response: Raw LLM response
            round_number: Current debate round number
            should_store_evidence: Whether to store evidence tags in ChromaDB

        Returns:
            Dictionary with parsed response and evidence tags
        """
        # Parse JSON response
        parsed_response = self.parse_json_response(response)

        # Extract evidence tags
        evidence_tags = self.extract_evidence_tags(parsed_response, round_number)

        # Store evidence if requested
        if should_store_evidence and evidence_tags:
            await self.store_evidence_tags(evidence_tags, round_number)

        return {
            "response": parsed_response,
            "evidence_tags": evidence_tags,
            "raw_response": response,
        }
