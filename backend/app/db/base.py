"""
Import all models so Alembic can detect them.
"""

from app.models.base import Base  # noqa
from app.models.user import User, Student, Instructor  # noqa
from app.models.role import Role, Permission, UserRole, RolePermission  # noqa
from app.models.course import Course, Lesson  # noqa
from app.models.enrollment import Enrollment  # noqa
from app.models.assessment import Quiz, Assignment, Project  # noqa
from app.models.submission import QuizAttempt, AssignmentSubmission, ProjectSubmission  # noqa
from app.models.tracking import Attendance, VideoProgress, ActivityLog  # noqa
from app.models.prediction import Prediction, Recommendation  # noqa
from app.models.notification import Notification, InstructorNote  # noqa
from app.models.organization import Organization  # noqa
from app.models.partner import PartnerUser, PartnerStudent, PartnerDocument  # noqa
from app.models.certificate import CertificateIssuanceEvent  # noqa
from app.models.trainer_feedback import TrainerFeedbackImport, TrainerFeedbackResponse  # noqa
