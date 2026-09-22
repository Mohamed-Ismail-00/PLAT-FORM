"""
V1 API router — aggregates all sub-routers.
"""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.courses import router as courses_router
from app.api.v1.students import router as students_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.scoring import router as scoring_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.partners import router as partners_router
from app.api.v1.organizations import router as organizations_router
from app.api.v1.certificates import router as certificates_router
from app.api.v1.trainer_feedback import router as trainer_feedback_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(courses_router)
api_v1_router.include_router(students_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(scoring_router)
api_v1_router.include_router(attendance_router)
api_v1_router.include_router(partners_router)
api_v1_router.include_router(organizations_router)
api_v1_router.include_router(certificates_router)
api_v1_router.include_router(trainer_feedback_router)
