"""
Scorer Interface — Strategy Pattern contract.
All scorers (rule-based and future ML) implement this interface.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class ScoreResult:
    """Output of a scorer calculation."""
    score_type: str
    score_value: float  # 0-100
    breakdown: dict = field(default_factory=dict)
    metadata: dict = field(default_factory=dict)


class ScorerInterface(ABC):
    """Abstract interface for all scoring strategies."""

    @abstractmethod
    async def calculate(self, student_id: UUID, enrollment_id: UUID, course_id: UUID) -> ScoreResult:
        """Calculate score for a student in a specific enrollment."""
        ...

    @abstractmethod
    def get_score_type(self) -> str:
        """Return the score type identifier."""
        ...

    @abstractmethod
    def get_version(self) -> str:
        """Return the scorer version."""
        ...


def clamp(value: float, min_val: float = 0, max_val: float = 100) -> float:
    """Clamp a value between min and max."""
    return max(min_val, min(max_val, value))
