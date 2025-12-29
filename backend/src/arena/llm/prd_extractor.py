"""PRD extraction using Gemini with dynamic structure extraction"""

import json

from arena.llm.gemini_client import get_gemini_llm
from arena.llm.rate_control import llm_call_with_limits
from arena.models.idea import ExtractedStructure, Idea, Section

EXTRACTION_PROMPT = (
    """Analyze this PRD and extract its structure dynamically. """
    """Preserve ALL information - nothing should be lost.

Instructions:
1. Identify the product/idea title or name (usually the main heading or first section title)
2. Identify all sections/topics in the PRD
3. Extract each section with its full content
4. Categorize sections into: core, market, technical, business, execution, risks, or other
5. Extract key facts as key-value pairs (e.g., "Target Customer": "...", "Pricing": "...")
6. Extract lists (competitors, features, risks, technologies, etc.)
7. Preserve ALL information - if something doesn't fit categories, use "other" category

Return a JSON object with this structure:
{{
    "title": "Product or Idea Name/Title",
    "sections": [
        {{
            "title": "Section title",
            "content": "Full section content",
            "category": "core|market|technical|business|execution|risks|other",
            "key_points": ["point1", "point2"]
        }}
    ],
    "key_facts": {{
        "Key Name": "Value",
        "Another Key": "Another Value"
    }},
    "lists": {{
        "Competitors": ["comp1", "comp2"],
        "Features": ["feature1", "feature2"]
    }},
    "metadata": {{
        "total_sections": 5,
        "has_technical": true,
        "has_market_analysis": true,
        "has_financials": false
    }}
}}

PRD Text:
{prd_text}

Return only valid JSON, no markdown formatting."""
)


async def extract_idea_from_prd(prd_text: str, debate_id: str | None = None) -> Idea:
    """
    Dynamically extracts structure from PRD text using Gemini.

    Args:
        prd_text: Raw PRD text from user

    Returns:
        Idea object with original PRD text and extracted structure
    """
    llm = get_gemini_llm(temperature=0.3)  # Lower temperature for more consistent extraction

    # Format prompt with PRD text
    prompt = EXTRACTION_PROMPT.format(prd_text=prd_text)

    # Call Gemini
    response = await llm_call_with_limits(debate_id, lambda: llm.ainvoke(prompt))

    # Parse JSON response
    try:
        # Extract JSON from response (handle markdown code blocks if present)
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]  # Remove ```json
        if content.startswith("```"):
            content = content[3:]  # Remove ```
        if content.endswith("```"):
            content = content[:-3]  # Remove closing ```
        content = content.strip()

        extracted_data = json.loads(content)
    except json.JSONDecodeError as e:
        # Fallback: create minimal structure if JSON parsing fails
        extracted_data = {
            "title": "Untitled Idea",
            "sections": [
                {"title": "Full PRD", "content": prd_text, "category": "other", "key_points": []}
            ],
            "key_facts": {},
            "lists": {},
            "metadata": {"total_sections": 1, "extraction_error": str(e)},
        }

    # Build ExtractedStructure
    sections = [
        Section(
            title=section.get("title", "Untitled"),
            content=section.get("content", ""),
            category=section.get("category", "other"),
            key_points=section.get("key_points", []),
        )
        for section in extracted_data.get("sections", [])
    ]

    extracted_structure = ExtractedStructure(
        sections=sections,
        key_facts=extracted_data.get("key_facts", {}),
        lists=extracted_data.get("lists", {}),
        metadata=extracted_data.get("metadata", {}),
    )

    # Store title in metadata for easy access
    extracted_structure.metadata["title"] = extracted_data.get("title", "Untitled Idea")

    # Create Idea object
    idea = Idea(original_prd_text=prd_text, extracted_structure=extracted_structure)
    return idea


def prepare_idea_for_embedding(idea: Idea) -> str:
    """
    Combines extracted structure into a single text string for embedding.

    Args:
        idea: Idea object with extracted structure

    Returns:
        Combined text string ready for embedding
    """
    parts = []

    # Add sections
    for section in idea.extracted_structure.sections:
        parts.append(f"## {section.title} ({section.category})")
        parts.append(section.content)
        if section.key_points:
            parts.append("Key Points:")
            for point in section.key_points:
                parts.append(f"- {point}")

    # Add key facts
    if idea.extracted_structure.key_facts:
        parts.append("\n## Key Facts")
        for key, value in idea.extracted_structure.key_facts.items():
            parts.append(f"{key}: {value}")

    # Add lists
    if idea.extracted_structure.lists:
        parts.append("\n## Lists")
        for list_name, items in idea.extracted_structure.lists.items():
            parts.append(f"{list_name}:")
            for item in items:
                parts.append(f"- {item}")

    return "\n".join(parts)
