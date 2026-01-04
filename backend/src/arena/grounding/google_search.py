"""Google Custom Search grounding helpers."""

from __future__ import annotations

import logging
from typing import Dict, List

import requests  # type: ignore[import-untyped]
from arena.config.settings import settings

logger = logging.getLogger(__name__)

GOOGLE_SEARCH_ENDPOINT = "https://www.googleapis.com/customsearch/v1"


def grounded_search_enabled() -> bool:
    return bool(
        settings.enable_grounded_search
        and settings.google_search_api_key
        and settings.google_search_engine_id
    )


def search_google(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Return top search results for a query, or [] when grounding is disabled."""
    if not grounded_search_enabled() or not query.strip():
        return []

    payload = {
        "key": settings.google_search_api_key,
        "cx": settings.google_search_engine_id,
        "q": query,
        "num": min(max_results, 10),
    }

    try:
        response = requests.get(GOOGLE_SEARCH_ENDPOINT, params=payload, timeout=8)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", []) or []
        results = []
        for item in items[:max_results]:
            results.append(
                {
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                }
            )
        return results
    except requests.RequestException as exc:
        logger.warning("grounded_search_failed query=%s error=%s", query, exc)
        return []


def format_sources_for_prompt(sources: List[Dict[str, str]]) -> str:
    """Format sources list for prompt consumption."""
    if not sources:
        return "[]"

    formatted = []
    for index, source in enumerate(sources):
        formatted.append(
            {
                "index": index,
                "title": source.get("title", ""),
                "url": source.get("url", ""),
                "snippet": source.get("snippet", ""),
            }
        )
    return str(formatted)
