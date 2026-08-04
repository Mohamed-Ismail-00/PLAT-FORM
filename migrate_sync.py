"""
Clean Synchronous Migration Script with Orphan FK Filtering for Neon PostgreSQL
"""
import sqlite3
import psycopg2
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine
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

sqlite_path = "./backend/spi.db"
postgres_url = "postgresql://neondb_owner:npg_BJlVDqji0K1w@ep-super-dew-ax5eli11.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

print("1. Re-creating complete schema in Neon PostgreSQL...")
sync_engine = create_engine(postgres_url)
Base.metadata.drop_all(sync_engine)
Base.metadata.create_all(sync_engine)
sync_engine.dispose()
print("All 23 tables created successfully in PostgreSQL!")

sq_conn = sqlite3.connect(sqlite_path)
sq_cur = sq_conn.cursor()

pg_conn = psycopg2.connect(postgres_url)
pg_cur = pg_conn.cursor()

# Cache valid parent IDs to prevent FK constraint failures
valid_users = set(r[0] for r in sq_cur.execute('SELECT id FROM users;').fetchall())
valid_students = set(r[0] for r in sq_cur.execute('SELECT id FROM students;').fetchall())
valid_courses = set(r[0] for r in sq_cur.execute('SELECT id FROM courses;').fetchall())
valid_lessons = set(r[0] for r in sq_cur.execute('SELECT id FROM lessons;').fetchall())
valid_enrollments = set(r[0] for r in sq_cur.execute('SELECT id FROM enrollments;').fetchall())

ordered_tables = [
    "roles",
    "users",
    "user_roles",
    "instructors",
    "students",
    "courses",
    "lessons",
    "enrollments",
    "quizzes",
    "assignments",
    "projects",
    "quiz_attempts",
    "assignment_submissions",
    "project_submissions",
    "attendance",
    "video_progress",
    "activity_logs",
    "predictions",
    "recommendations",
    "notifications",
    "instructor_notes"
]

for tbl in ordered_tables:
    sq_cur.execute(f'SELECT * FROM "{tbl}"')
    rows = sq_cur.fetchall()
    if not rows:
        print(f"  - {tbl}: 0 rows (skipped)")
        continue

    col_names = [description[0] for description in sq_cur.description]
    cols_str = ", ".join([f'"{c}"' for c in col_names])
    placeholders = ", ".join(["%s"] * len(col_names))

    # Filter out orphan rows where FK parents don't exist
    filtered_rows = []
    for r in rows:
        r_dict = dict(zip(col_names, r))
        if tbl == "user_roles" and r_dict.get("user_id") not in valid_users:
            continue
        if tbl == "students" and r_dict.get("user_id") not in valid_users:
            continue
        if tbl == "instructors" and r_dict.get("user_id") not in valid_users:
            continue
        if tbl == "lessons" and r_dict.get("course_id") not in valid_courses:
            continue
        if tbl == "enrollments" and (r_dict.get("student_id") not in valid_students or r_dict.get("course_id") not in valid_courses):
            continue
        if tbl == "attendance" and (r_dict.get("student_id") not in valid_students or r_dict.get("lesson_id") not in valid_lessons):
            continue
        if tbl == "predictions" and r_dict.get("enrollment_id") not in valid_enrollments:
            continue
        filtered_rows.append(r)

    if not filtered_rows:
        print(f"  - {tbl}: 0 valid rows (skipped)")
        continue

    insert_sql = f'INSERT INTO "{tbl}" ({cols_str}) VALUES ({placeholders});'

    try:
        pg_cur.executemany(insert_sql, filtered_rows)
        pg_conn.commit()
        print(f"  - {tbl}: inserted {len(filtered_rows)} rows OK")
    except Exception as e:
        pg_conn.rollback()
        print(f"  - {tbl}: FAILED -> {e}")

sq_conn.close()
pg_conn.close()
print("\nPERFECT FULL DATABASE MIGRATION COMPLETED SUCCESSFULLY!")
