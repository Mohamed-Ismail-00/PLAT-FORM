"""
Attendance API routes.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.constants import RoleName
from app.core.dependencies import CurrentUser, DBSession, require_roles
from app.core.exceptions import ConflictException
from app.models.tracking import Attendance
from app.repositories.tracking_repository import AttendanceRepository, ActivityLogRepository
from app.schemas.tracking import AttendanceCreate, AttendanceBulkCreate, AttendanceUpdate
from app.schemas.common import DataResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("")
async def record_attendance(
    data: AttendanceCreate, db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.INSTRUCTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Record attendance for a student."""
    repo = AttendanceRepository(db)
    exists = await repo.exists(data.student_id, data.lesson_id)
    if exists:
        raise ConflictException("Attendance already recorded for this student and lesson")

    record = Attendance(student_id=data.student_id, lesson_id=data.lesson_id, status=data.status)
    record = await repo.create(record)

    # Log activity
    activity_repo = ActivityLogRepository(db)
    await activity_repo.log_activity(data.student_id, "attendance_recorded", "lesson", data.lesson_id)

    return DataResponse(data={"id": str(record.id), "status": record.status})


@router.post("/bulk")
async def bulk_record_attendance(
    data: AttendanceBulkCreate, db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.INSTRUCTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Bulk record attendance for a whole class."""
    repo = AttendanceRepository(db)
    results = []
    for item in data.records:
        exists = await repo.exists(item.student_id, data.lesson_id)
        if not exists:
            record = Attendance(student_id=item.student_id, lesson_id=data.lesson_id, status=item.status)
            record = await repo.create(record)
            results.append({"student_id": str(item.student_id), "status": item.status})
    return DataResponse(data={"recorded": len(results), "records": results})


@router.get("")
async def list_attendance(
    db: DBSession, current_user: CurrentUser,
    lesson_id: UUID = None, student_id: UUID = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
):
    """Query attendance records."""
    repo = AttendanceRepository(db)
    filters = []
    if lesson_id:
        filters.append(Attendance.lesson_id == lesson_id)
    if student_id:
        filters.append(Attendance.student_id == student_id)

    records = await repo.get_all(offset=(page - 1) * page_size, limit=page_size, filters=filters)
    total = await repo.count(filters=filters)

    return {
        "data": [{
            "id": str(r.id), "student_id": str(r.student_id),
            "lesson_id": str(r.lesson_id), "status": r.status,
            "checked_at": r.checked_at.isoformat() if r.checked_at else None,
        } for r in records],
        "meta": {"page": page, "page_size": page_size, "total": total},
    }
