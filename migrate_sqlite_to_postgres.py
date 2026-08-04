"""
SQLite to Neon PostgreSQL Migration Script
Usage:
    python migrate_sqlite_to_postgres.py "postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require"
"""

import sys
import os
import asyncio

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Import Base and all models to ensure metadata is populated
from app.models.base import Base
from app.models.role import Role, UserRole
from app.models.user import User, Student, Instructor
from app.models.course import Course, Lesson
from app.models.enrollment import Enrollment
from app.models.assessment import Quiz, Assignment, Project
from app.models.submission import QuizAttempt, AssignmentSubmission, ProjectSubmission
from app.models.tracking import Attendance, VideoProgress, ActivityLog
from app.models.prediction import Prediction, Recommendation
from app.models.notification import Notification, InstructorNote


async def migrate(postgres_url: str, sqlite_db_path: str = "./backend/spi.db"):
    if not os.path.exists(sqlite_db_path):
        print(f"[ERROR] SQLite database file not found at: {sqlite_db_path}")
        return

    # Standardize Postgres URL for asyncpg
    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif postgres_url.startswith("postgresql://") and not postgres_url.startswith("postgresql+asyncpg://"):
        postgres_url = postgres_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Clean up channel_binding or sslmode for asyncpg
    if "channel_binding=" in postgres_url:
        postgres_url = postgres_url.split("&channel_binding=")[0].split("?channel_binding=")[0]
    if "sslmode=" in postgres_url:
        postgres_url = postgres_url.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=prefer").replace("sslmode=disable", "ssl=disable")

    print(f"[INFO] Connecting to SQLite: {sqlite_db_path}")
    sqlite_url = f"sqlite+aiosqlite:///{sqlite_db_path}"
    sqlite_engine = create_async_engine(sqlite_url)
    sqlite_session_factory = sessionmaker(sqlite_engine, class_=AsyncSession, expire_on_commit=False)

    print(f"[INFO] Connecting to Target PostgreSQL...")
    postgres_engine = create_async_engine(postgres_url, echo=False)
    postgres_session_factory = sessionmaker(postgres_engine, class_=AsyncSession, expire_on_commit=False)

    # Step 1: Create all tables in PostgreSQL
    print("[INFO] Creating schema and tables in PostgreSQL...")
    async with postgres_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[SUCCESS] Schema created successfully.")

    # Step 2: Ordered list of models to migrate (respecting foreign key hierarchy)
    models_in_order = [
        Role,
        User,
        UserRole,
        Instructor,
        Student,
        Course,
        Lesson,
        Enrollment,
        Quiz,
        Assignment,
        Project,
        QuizAttempt,
        AssignmentSubmission,
        ProjectSubmission,
        Attendance,
        VideoProgress,
        ActivityLog,
        Prediction,
        Recommendation,
        Notification,
        InstructorNote
    ]

    async with sqlite_session_factory() as src_session, postgres_session_factory() as dst_session:
        for model in models_in_order:
            model_name = model.__name__
            try:
                result = await src_session.execute(select(model))
                records = result.scalars().all()
                count = len(records)

                if count == 0:
                    print(f"  - {model_name}: 0 records (skipped)")
                    continue

                for obj in records:
                    src_session.expunge(obj)
                    dst_session.add(obj)

                await dst_session.commit()
                print(f"  - {model_name}: migrated {count} records successfully")

            except Exception as e:
                await dst_session.rollback()
                print(f"  [WARNING] Error migrating {model_name}: {e}")

    await sqlite_engine.dispose()
    await postgres_engine.dispose()
    print("\n[SUCCESS] Migration completed successfully!")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate_sqlite_to_postgres.py <NEON_POSTGRES_CONNECTION_STRING>")
        sys.exit(1)

    target_url = sys.argv[1]
    asyncio.run(migrate(target_url))
