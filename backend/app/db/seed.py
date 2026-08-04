"""
Database seed script — creates initial roles, permissions, and demo data.
Run: python -m app.db.seed
"""

import asyncio
import uuid
from datetime import datetime, date, timedelta, timezone
import random

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory, engine
from app.models.base import Base
from app.models.user import User, Student, Instructor
from app.models.role import Role, Permission, UserRole, RolePermission
from app.models.course import Course, Lesson
from app.models.enrollment import Enrollment
from app.models.assessment import Quiz, Assignment, Project
from app.models.submission import QuizAttempt, AssignmentSubmission, ProjectSubmission
from app.models.tracking import Attendance, VideoProgress, ActivityLog
from app.models.prediction import Prediction, Recommendation
from app.models.notification import Notification, InstructorNote
from app.core.security import hash_password


async def seed_database():
    """Seed the database with initial data."""
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        try:
            # ── Roles ────────────────────────────────────────
            roles = {}
            for role_name in ["student", "instructor", "admin", "super_admin"]:
                role = Role(name=role_name, description=f"{role_name.replace('_', ' ').title()} role")
                db.add(role)
                roles[role_name] = role
            await db.flush()

            # ── Permissions ──────────────────────────────────
            resources = ["users", "courses", "students", "enrollments", "attendance",
                         "quizzes", "assignments", "projects", "dashboard", "scoring", "notifications"]
            actions = ["create", "read", "update", "delete"]
            permissions = {}
            for resource in resources:
                for action in actions:
                    perm = Permission(resource=resource, action=action)
                    db.add(perm)
                    permissions[f"{resource}:{action}"] = perm
            await db.flush()

            # ── Role-Permission Mapping ──────────────────────
            # Super Admin gets everything
            for perm in permissions.values():
                db.add(RolePermission(role_id=roles["super_admin"].id, permission_id=perm.id))

            # Admin gets most things
            for perm_key, perm in permissions.items():
                if "delete" not in perm_key or "users" not in perm_key:
                    db.add(RolePermission(role_id=roles["admin"].id, permission_id=perm.id))

            await db.flush()

            # ── Super Admin User ─────────────────────────────
            admin_user = User(
                email="admin@innovera.com",
                password_hash=hash_password("Admin@2026"),
                first_name="System",
                last_name="Administrator",
                status="active",
            )
            db.add(admin_user)
            await db.flush()
            db.add(UserRole(user_id=admin_user.id, role_id=roles["super_admin"].id))

            # ── Demo Instructor ──────────────────────────────
            inst_user = User(
                email="ahmed.hassan@innovera.com",
                password_hash=hash_password("Instructor@2026"),
                first_name="Ahmed",
                last_name="Hassan",
                status="active",
            )
            db.add(inst_user)
            await db.flush()
            db.add(UserRole(user_id=inst_user.id, role_id=roles["instructor"].id))

            instructor = Instructor(user_id=inst_user.id, specialization="Full Stack Development", bio="Senior Software Engineer")
            db.add(instructor)
            await db.flush()
            # --- Parse Excel File and Generate Courses/Students ---
            import pandas as pd
            import math
            import os
            
            excel_path = 'Attend Sheet Intern.xlsx'
            students = []
            
            track_mapping = {
                'Ai': 'Artificial Intelligence',
                'Sw': 'Software Engineering',
                'Digital Marketing': 'Digital Marketing',
                'Admin': 'Administration',
                'Events': 'Events Management',
                'HR': 'Human Resources'
            }
            
            prefix_mapping = {
                'Ai': 'AI',
                'Sw': 'SW',
                'Digital Marketing': 'DM',
                'Admin': 'ADMIN',
                'Events': 'EVENTS',
                'HR': 'HR'
            }
            
            if os.path.exists(excel_path):
                xl = pd.ExcelFile(excel_path)
                for sheet_name in xl.sheet_names:
                    if sheet_name not in track_mapping:
                        continue
                        
                    track_full_name = track_mapping[sheet_name]
                    df = pd.read_excel(excel_path, sheet_name=sheet_name)
                    
                    # Discover Attendance columns (Week or session)
                    attendance_cols = [c for c in df.columns if 'week' in str(c).lower() or 'session' in str(c).lower()]
                    # Discover Task columns (Task but not Task 1 link)
                    task_cols = [c for c in df.columns if 'task' in str(c).lower() and 'link' not in str(c).lower()]
                    
                    # Create Course for this track
                    course = Course(
                        instructor_id=instructor.id,
                        title=f"{track_full_name} Track",
                        description=f"Internship track for {track_full_name}",
                        total_lessons=len(attendance_cols),
                        duration_weeks=len(attendance_cols),
                        status="active",
                        difficulty_level="beginner"
                    )
                    db.add(course)
                    await db.flush()
                    
                    lessons = []
                    for i, col in enumerate(attendance_cols):
                        lesson = Lesson(course_id=course.id, title=str(col), order_number=i+1, type="live")
                        db.add(lesson)
                        lessons.append(lesson)
                    await db.flush()
                    
                    assignments = []
                    for i, col in enumerate(task_cols):
                        assignment = Assignment(course_id=course.id, title=str(col), total_marks=100)
                        db.add(assignment)
                        assignments.append(assignment)
                    await db.flush()
                    
                    # Determine column names for Name, Email, Phone
                    name_col = next((c for c in df.columns if 'name' in str(c).lower() or 'اسم' in str(c)), None)
                    email_col = next((c for c in df.columns if 'email' in str(c).lower() or 'بريد' in str(c) or 'emails' in str(c).lower()), None)
                    if not email_col and len(df) > 0:
                        # Fallback: check first row for an email address
                        for c in df.columns:
                            val = str(df.iloc[0].get(c, ''))
                            if '@' in val and '.' in val:
                                email_col = c
                                break
                    
                    phone_col = next((c for c in df.columns if 'phone' in str(c).lower() or 'موبايل' in str(c)), None)
                    
                    for index, row in df.iterrows():
                        name = str(row.get(name_col, '')) if name_col else ''
                        if name == 'nan' or not name.strip():
                            continue
                        name = name.strip()
                        
                        email_raw = str(row.get(email_col, '')) if email_col else ''
                        email = email_raw.strip() if email_raw.strip() not in ['nan', ''] else f"intern.{sheet_name.lower()}.{index}@innovera.com"
                        
                        phone_raw = str(row.get(phone_col, '')) if phone_col else ''
                        phone = phone_raw.strip() if phone_raw.strip() != 'nan' else ""
                        
                        parts = name.split()
                        first_name = parts[0] if len(parts) > 0 else "Unknown"
                        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

                        user = User(
                            email=email,
                            password_hash=hash_password("Student@2026"),
                            first_name=first_name,
                            last_name=last_name,
                            status="active"
                        )
                        db.add(user)
                        await db.flush()
                        db.add(UserRole(user_id=user.id, role_id=roles["student"].id))

                        student = Student(
                            user_id=user.id,
                            student_code=f"{prefix_mapping[sheet_name]}-26-{(index + 1):03d}",
                            education_level="bachelor"
                        )
                        db.add(student)
                        await db.flush()

                        enrollment = Enrollment(
                            student_id=student.id,
                            course_id=course.id,
                            status="active",
                            progress_percentage=0
                        )
                        db.add(enrollment)
                        await db.flush()

                        attended_count = 0
                        for i, col in enumerate(attendance_cols):
                            val = row.get(col)
                            is_present = False
                            if pd.notna(val) and str(val).strip() != '' and str(val).strip().lower() not in ['false', '0', 'no', 'absent']:
                                is_present = True
                                attended_count += 1
                            
                            db.add(Attendance(
                                student_id=student.id,
                                lesson_id=lessons[i].id,
                                status="present" if is_present else "absent"
                            ))

                        completed_tasks_count = 0
                        for j, col in enumerate(task_cols):
                            val = row.get(col)
                            is_submitted = False
                            if pd.notna(val) and str(val).strip() != '' and str(val).strip().lower() not in ['false', '0', 'no']:
                                is_submitted = True
                                completed_tasks_count += 1
                                
                            if is_submitted:
                                db.add(AssignmentSubmission(
                                    student_id=student.id,
                                    assignment_id=assignments[j].id,
                                    submission_url="",
                                    score=100,
                                    status="graded"
                                ))
                        
                        enrollment.attended_lessons_count = attended_count
                        enrollment.total_lessons_count = max(len(attendance_cols), 10)
                        enrollment.completed_tasks_count = completed_tasks_count
                        enrollment.total_tasks_count = max(len(task_cols), 12)
                        
                        students.append((student, enrollment))
                
                await db.flush()
                
                # --- Run Scoring Engine ---
                from app.services.scoring.engine import ScoreManager
                score_engine = ScoreManager(db)
                for student, enrollment in students:
                    await score_engine.calculate_all_scores(student.id, enrollment.id, enrollment.course_id)

            await db.commit()
            print("Database seeded successfully with real AI Interns data!")
            print("   Admin: admin@innovera.com / Admin@2026")
            print("   Instructor: ahmed.hassan@innovera.com / Instructor@2026")

        except Exception as e:
            await db.rollback()
            print(f"Seeding failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())
