"""
Enums and constants used across the application.
"""

from enum import Enum


# ── User & Account ──────────────────────────────────────────────

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class RoleName(str, Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class ProgramType(str, Enum):
    INTERN = "intern"
    STUDENT = "student"


# ── Course ──────────────────────────────────────────────────────

class CourseStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# ── Enrollment ──────────────────────────────────────────────────

class EnrollmentStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    DROPPED = "dropped"
    PAUSED = "paused"


class BatchName(str, Enum):
    """Supported intern cohorts within a track."""

    BATCH_1 = "BATCH 1"
    BATCH_2 = "BATCH 2"


# ── Lesson ──────────────────────────────────────────────────────

class LessonType(str, Enum):
    LIVE = "live"
    RECORDED = "recorded"
    LAB = "lab"
    WORKSHOP = "workshop"


# ── Attendance ──────────────────────────────────────────────────

class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


# ── Submissions ─────────────────────────────────────────────────

class SubmissionStatus(str, Enum):
    SUBMITTED = "submitted"
    GRADED = "graded"
    LATE = "late"
    RESUBMITTED = "resubmitted"


# ── Notifications ───────────────────────────────────────────────

class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    ALERT = "alert"


# ── Scoring ─────────────────────────────────────────────────────

class ScoreType(str, Enum):
    ATTENDANCE = "attendance"
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"
    PROJECT = "project"
    ENGAGEMENT = "engagement"
    CONSISTENCY = "consistency"
    ACTIVITY = "activity"
    OVERALL = "overall"


class Classification(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    AVERAGE = "average"
    NEEDS_ATTENTION = "needs_attention"
    HIGH_RISK = "high_risk"


# ── Recommendations ─────────────────────────────────────────────

class RecommendationStatus(str, Enum):
    ACTIVE = "active"
    DISMISSED = "dismissed"
    COMPLETED = "completed"


class RecommendationSource(str, Enum):
    MANUAL = "manual"
    AI_RULE = "ai_rule"
    AI_ML = "ai_ml"


# ── Scoring Weights ─────────────────────────────────────────────

SCORING_WEIGHTS = {
    ScoreType.ATTENDANCE: 0.15,
    ScoreType.QUIZ: 0.20,
    ScoreType.ASSIGNMENT: 0.20,
    ScoreType.PROJECT: 0.15,
    ScoreType.ENGAGEMENT: 0.10,
    ScoreType.CONSISTENCY: 0.10,
    ScoreType.ACTIVITY: 0.10,
}

# Weights when no project exists in course
SCORING_WEIGHTS_NO_PROJECT = {
    ScoreType.ATTENDANCE: 0.15,
    ScoreType.QUIZ: 0.275,
    ScoreType.ASSIGNMENT: 0.275,
    ScoreType.ENGAGEMENT: 0.10,
    ScoreType.CONSISTENCY: 0.10,
    ScoreType.ACTIVITY: 0.10,
}

# Classification thresholds
CLASSIFICATION_THRESHOLDS = {
    Classification.EXCELLENT: 85,
    Classification.GOOD: 70,
    Classification.AVERAGE: 55,
    Classification.NEEDS_ATTENTION: 40,
    Classification.HIGH_RISK: 0,
}

# ── Pagination ──────────────────────────────────────────────────

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
