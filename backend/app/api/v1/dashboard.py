"""
Dashboard API routes for Student, Instructor, and Admin.
"""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.constants import RoleName
from app.core.dependencies import CurrentUser, DBSession, require_roles
from app.repositories.user_repository import StudentRepository, InstructorRepository
from app.services.dashboard_service import DashboardService
from app.schemas.common import DataResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboards"])


@router.get("/student")
async def student_dashboard(db: DBSession, current_user: CurrentUser):
    """Get student's own dashboard."""
    student_repo = StudentRepository(db)
    student = await student_repo.get_by_user_id(current_user["user_id"])
    if not student:
        return DataResponse(data={})

    service = DashboardService(db)
    result = await service.get_student_dashboard(student.id)
    return DataResponse(data=result)


@router.get("/student/{student_id}")
async def view_student_dashboard(
    student_id: UUID, db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.INSTRUCTOR)),
):
    """View a specific student's dashboard (Admin/Instructor)."""
    service = DashboardService(db)
    result = await service.get_student_dashboard(student_id)
    return DataResponse(data=result)


@router.get("/instructor")
async def instructor_dashboard(db: DBSession, current_user: CurrentUser):
    """Get instructor's dashboard."""
    instructor_repo = InstructorRepository(db)
    instructor = await instructor_repo.get_by_user_id(current_user["user_id"])
    if not instructor:
        return DataResponse(data={})

    service = DashboardService(db)
    result = await service.get_instructor_dashboard(instructor.id)
    return DataResponse(data=result)


@router.get("/admin")
async def admin_dashboard(
    db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
    program_type: str = "intern",
):
    """Get admin overview dashboard."""
    service = DashboardService(db)
    result = await service.get_admin_dashboard(program_type=program_type)
    return DataResponse(data=result)
