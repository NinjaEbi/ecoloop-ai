"""
EcoLoop AI Assessment Service

Delegates scoring to the centralized scoring engine while maintaining
backward-compatible interfaces for existing tests and handlers.
"""

from typing import Any
from .scoring_engine import score_assessment as centralized_score_assessment


def score_assessment(device: str, answers: dict[str, Any]):
    """Delegate to centralized scoring engine."""
    return centralized_score_assessment(device, answers)
