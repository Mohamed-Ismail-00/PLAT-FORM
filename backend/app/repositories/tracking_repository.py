"""
Tracking repositories: Attendance, VideoProgress, ActivityLog.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tracking import Attendance, VideoProgress, ActivityLog
from app.repositories.base import BaseRepository


class AttendanceRepository(BaseRepository[Attendance]):
    def __init__(self, db: AsyncSession):
        super().__init__(Attendance, db)

    async def get_by_student_and_course(self, student_id: UUID, course_id: UUID):
        from app.models.course import Lesson
        result = await self.db.execute(
            select(Attendance)
            .join(Lesson, Attendance.lesson_id == Lesson.id)
            .where(Attendance.student_id == student_id, Lesson.course_id == course_id)
        )
        return list(result.scalars().all())

    async def get_by_lesson(self, lesson_id: UUID):
        result = await self.db.execute(
            select(Attendance).where(Attendance.lesson_id == lesson_id)
        )
        return list(result.scalars().all())

    async def get_student_attendance_rate(self, student_id: UUID, course_id: UUID) -> dict:
        records = await self.get_by_student_and_course(student_id, course_id)
        total = len(records)
        if total == 0:
            return {"rate": 0, "present": 0, "absent": 0, "late": 0, "excused": 0, "total": 0}

        present = sum(1 for r in records if r.status == "present")
        late = sum(1 for r in records if r.status == "late")
        absent = sum(1 for r in records if r.status == "absent")
        excused = sum(1 for r in records if r.status == "excused")

        countable = total - excused
        rate = ((present + late) / countable * 100) if countable > 0 else 0

        return {"rate": round(rate, 1), "present": present, "absent": absent, "late": late, "excused": excused, "total": total}

    async def exists(self, student_id: UUID, lesson_id: UUID) -> bool:
        result = await self.db.execute(
            select(func.count()).select_from(Attendance)
            .where(Attendance.student_id == student_id, Attendance.lesson_id == lesson_id)
        )
        return result.scalar_one() > 0


class VideoProgressRepository(BaseRepository[VideoProgress]):
    def __init__(self, db: AsyncSession):
        super().__init__(VideoProgress, db)

    async def get_by_student_and_lesson(self, student_id: UUID, lesson_id: UUID) -> Optional[VideoProgress]:
        result = await self.db.execute(
            select(VideoProgress)
            .where(VideoProgress.student_id == student_id, VideoProgress.lesson_id == lesson_id)
        )
        return result.scalar_one_or_none()

    async def get_by_student_and_course(self, student_id: UUID, course_id: UUID):
        from app.models.course import Lesson
        result = await self.db.execute(
            select(VideoProgress)
            .join(Lesson, VideoProgress.lesson_id == Lesson.id)
            .where(VideoProgress.student_id == student_id, Lesson.course_id == course_id)
        )
        return list(result.scalars().all())

    async def upsert(self, student_id: UUID, lesson_id: UUID, data: dict) -> VideoProgress:
        existing = await self.get_by_student_and_lesson(student_id, lesson_id)
        if existing:
            for key, value in data.items():
                setattr(existing, key, value)
            if data.get("watched_percentage", 0) >= 90:
                existing.completed = True
            existing.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            return existing
        else:
            vp = VideoProgress(
                student_id=student_id,
                lesson_id=lesson_id,
                **data,
                completed=data.get("watched_percentage", 0) >= 90,
            )
            self.db.add(vp)
            await self.db.flush()
            return vp


class ActivityLogRepository(BaseRepository[ActivityLog]):
    def __init__(self, db: AsyncSession):
        super().__init__(ActivityLog, db)

    async def get_last_activity(self, student_id: UUID) -> Optional[datetime]:
        result = await self.db.execute(
            select(func.max(ActivityLog.created_at))
            .where(ActivityLog.student_id == student_id)
        )
        return result.scalar_one_or_none()

    async def get_active_days_in_range(self, student_id: UUID, days: int = 30) -> int:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.db.execute(
            select(func.count(func.distinct(func.date(ActivityLog.created_at))))
            .where(ActivityLog.student_id == student_id, ActivityLog.created_at >= since)
        )
        return result.scalar_one()

    async def get_active_weeks(self, student_id: UUID, since: datetime) -> int:
        bind = getattr(self.db, "bind", None)
        if bind and bind.dialect.name == "sqlite":
            week_expr = func.strftime("%Y-%W", ActivityLog.created_at)
        else:
            week_expr = func.date_trunc("week", ActivityLog.created_at)

        result = await self.db.execute(
            select(func.count(func.distinct(week_expr))).where(
                ActivityLog.student_id == student_id, ActivityLog.created_at >= since
            )
        )
        return result.scalar_one()

    async def log_activity(self, student_id: UUID, action: str, resource_type: str = None, resource_id: UUID = None):
        log = ActivityLog(
            student_id=student_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
        )
        self.db.add(log)
        await self.db.flush()
        return log

    async def get_recent(self, student_id: UUID, limit: int = 10):
        result = await self.db.execute(
            select(ActivityLog)
            .where(ActivityLog.student_id == student_id)
            .order_by(ActivityLog.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_total_watch_time(self, student_id: UUID, days: int = 7) -> int:
        """Get total video watch seconds in the last N days."""
        from app.models.tracking import VideoProgress
        since = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.db.execute(
            select(func.coalesce(func.sum(VideoProgress.watch_duration_seconds), 0))
            .where(VideoProgress.student_id == student_id, VideoProgress.updated_at >= since)
        )
        return result.scalar_one()
