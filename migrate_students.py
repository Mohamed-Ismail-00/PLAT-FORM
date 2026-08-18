"""
Migration script: Add program_type column to courses and import Innovera Students data.
Run once to:
1. Add program_type column to courses table
2. Set existing courses to 'intern'
3. Create 4 new student courses
4. Import 96 students from Excel sheets with attendance data
"""

import asyncio
import sys
import os
import re
import uuid

sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import openpyxl
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_BJlVDqji0K1w@ep-super-dew-ax5eli11.c-4.us-east-2.aws.neon.tech/neondb?ssl=require"


# ── Excel Data Extraction ──────────────────────────────────────

def extract_students_from_sheet(filepath):
    """Extract student names and attendance data from Sheet2."""
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb["Sheet2"]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    header = rows[0]
    students = []

    for row in rows[1:]:
        name = row[0]
        if not name or not str(name).strip():
            continue

        clean_name = str(name).strip()
        # Remove unicode direction markers
        clean_name = clean_name.replace("\u202a", "").replace("\u202c", "")
        clean_name = clean_name.strip()

        if not clean_name:
            continue

        # Find attendance percentage (last numeric column or 'Percentage'/'persentage' column)
        attendance_pct = 0
        attended_count = 0
        total_sessions = 0

        # Try to find percentage and attended columns
        for i, h in enumerate(header):
            h_str = str(h).lower() if h else ""
            if "percent" in h_str or "persentage" in h_str:
                val = row[i]
                if val is not None and val != "" and val != 0:
                    attendance_pct = float(val)
            if "attended" in h_str or "total attend" in h_str or "total number" in h_str:
                val = row[i]
                if val is not None and val != "":
                    attended_count = int(val)

        # Count session columns (those with 'Session' in header that have 1 or 0)
        session_cols = []
        for i, h in enumerate(header):
            h_str = str(h) if h else ""
            if "session" in h_str.lower():
                session_cols.append(i)

        if session_cols:
            total_sessions = len(session_cols)
            if attended_count == 0 and attendance_pct == 0:
                # Count attended from session columns
                for ci in session_cols:
                    val = row[ci] if ci < len(row) else None
                    if val == 1:
                        attended_count += 1
                if total_sessions > 0:
                    attendance_pct = round((attended_count / total_sessions) * 100, 2)

        students.append({
            "name": clean_name,
            "attended": attended_count,
            "total_sessions": total_sessions,
            "attendance_pct": attendance_pct,
        })

    return students


# ── Main Migration ──────────────────────────────────────────────

COURSES_DATA = [
    {
        "title": "Cybersecurity Foundation (Retake)",
        "instructor_name": "Dr. Ammar",
        "file": "data seets/Dr. Ammar- Cybersecurity Founation - Rtake.xlsx",
        "total_sessions": 12,
        "code_prefix": "CSF",
    },
    {
        "title": "Network Security Fundamentals",
        "instructor_name": "Dr. Ayman",
        "file": "data seets/Dr. Ayman - Network Security Fundamentals.xlsx",
        "total_sessions": 8,
        "code_prefix": "NSF",
    },
    {
        "title": "Cybersecurity",
        "instructor_name": "Dr. Ihab",
        "file": "data seets/Dr. Ihab- Cybersecurity.xlsx",
        "total_sessions": 9,
        "code_prefix": "CYB",
    },
    {
        "title": "Game Design Accelerator",
        "instructor_name": "Dr. Mohamed Ihab",
        "file": "data seets/Dr. Mohamed Ihab - Game Design Accelerator.xlsx",
        "total_sessions": 1,
        "code_prefix": "GDA",
    },
]


def generate_email(first_name, last_name):
    """Generate a clean email from a name."""
    base = f"{first_name.lower()}.{last_name.lower()}"
    base = re.sub(r"[^a-z0-9.]", "", base)
    return f"{base}@innovera-student.com"


def split_name(full_name):
    """Split a full name into first and last name."""
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], parts[0]
    return parts[0], " ".join(parts[1:])


async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # ── Step 1: Add program_type column if not exists ──
        print("Step 1: Adding program_type column to courses table...")
        try:
            await session.execute(text(
                "ALTER TABLE courses ADD COLUMN IF NOT EXISTS program_type VARCHAR(20) NOT NULL DEFAULT 'intern'"
            ))
            await session.commit()
            print("  ✅ Column added (or already exists)")
        except Exception as e:
            await session.rollback()
            print(f"  ⚠️ Column might already exist: {e}")

        # ── Step 2: Set existing courses to 'intern' ──
        print("Step 2: Setting existing courses to program_type='intern'...")
        await session.execute(text("UPDATE courses SET program_type = 'intern' WHERE program_type IS NULL OR program_type = 'intern'"))
        await session.commit()
        print("  ✅ Done")

        # ── Step 3: Get instructor ID (reuse existing) ──
        result = await session.execute(text("SELECT id FROM instructors LIMIT 1"))
        instructor_row = result.fetchone()
        if not instructor_row:
            print("  ❌ No instructor found! Creating a default one...")
            # Create a default instructor user
            inst_user_id = str(uuid.uuid4())
            inst_id = str(uuid.uuid4())
            from app.core.security import hash_password
            await session.execute(text(
                "INSERT INTO users (id, email, password_hash, first_name, last_name, status) "
                "VALUES (:id, :email, :pw, :fn, :ln, 'active')"
            ), {"id": inst_user_id, "email": "instructor@innovera.com", "pw": hash_password("Innovera@2026"), "fn": "Course", "ln": "Instructor"})
            await session.execute(text(
                "INSERT INTO instructors (id, user_id) VALUES (:id, :uid)"
            ), {"id": inst_id, "uid": inst_user_id})
            await session.commit()
            instructor_id = inst_id
        else:
            instructor_id = str(instructor_row[0])
        print(f"  Using instructor: {instructor_id}")

        # ── Step 4: Get student role ID ──
        result = await session.execute(text("SELECT id FROM roles WHERE name = 'student'"))
        role_row = result.fetchone()
        student_role_id = str(role_row[0])
        print(f"  Student role ID: {student_role_id}")

        # ── Step 5: Check which courses already exist ──
        result = await session.execute(text("SELECT title FROM courses WHERE program_type = 'student'"))
        existing_student_courses = {row[0] for row in result.fetchall()}

        # ── Step 6: Import each course and its students ──
        total_imported = 0
        used_emails = set()

        # Get existing emails to avoid conflicts
        result = await session.execute(text("SELECT email FROM users"))
        for row in result.fetchall():
            used_emails.add(row[0])

        for course_data in COURSES_DATA:
            print(f"\n{'='*60}")
            print(f"  Course: {course_data['title']}")

            if course_data["title"] in existing_student_courses:
                print(f"  ⚠️ Course already exists, skipping...")
                continue

            # Create the course
            course_id = str(uuid.uuid4())
            await session.execute(text(
                "INSERT INTO courses (id, instructor_id, title, description, total_lessons, status, program_type) "
                "VALUES (:id, :inst, :title, :desc, :tl, 'active', 'student')"
            ), {
                "id": course_id,
                "inst": instructor_id,
                "title": course_data["title"],
                "desc": f"{course_data['title']} - taught by {course_data['instructor_name']}",
                "tl": course_data["total_sessions"],
            })
            await session.commit()
            print(f"  ✅ Course created: {course_id}")

            # Extract students from Excel
            students = extract_students_from_sheet(course_data["file"])
            print(f"  Found {len(students)} students in Excel")

            student_counter = 0
            for student_info in students:
                student_counter += 1
                first_name, last_name = split_name(student_info["name"])

                # Generate unique email
                email = generate_email(first_name, last_name)
                if email in used_emails:
                    counter = 1
                    base = email.split("@")[0]
                    domain = email.split("@")[1]
                    while email in used_emails:
                        email = f"{base}{counter}@{domain}"
                        counter += 1

                used_emails.add(email)

                # Create User
                user_id = str(uuid.uuid4())
                from app.core.security import hash_password
                pw_hash = hash_password("Innovera@2026")
                await session.execute(text(
                    "INSERT INTO users (id, email, password_hash, first_name, last_name, status) "
                    "VALUES (:id, :email, :pw, :fn, :ln, 'active')"
                ), {"id": user_id, "email": email, "pw": pw_hash, "fn": first_name, "ln": last_name})

                # Assign student role
                await session.execute(text(
                    "INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES (:uid, :rid, NOW())"
                ), {"uid": user_id, "rid": student_role_id})

                # Create Student profile
                student_id = str(uuid.uuid4())
                student_code = f"{course_data['code_prefix']}-26-{str(student_counter).zfill(3)}"
                await session.execute(text(
                    "INSERT INTO students (id, user_id, student_code, metadata, created_at) VALUES (:id, :uid, :code, :meta, NOW())"
                ), {"id": student_id, "uid": user_id, "code": student_code, "meta": "{}"})

                # Create Enrollment with attendance data
                enrollment_id = str(uuid.uuid4())
                attended = student_info["attended"]
                total_sess = course_data["total_sessions"]
                att_pct = student_info["attendance_pct"]
                progress = round(att_pct / 2.0, 1)  # attendance is half of progress

                await session.execute(text(
                    "INSERT INTO enrollments (id, student_id, course_id, status, attended_lessons_count, total_lessons_count, completed_tasks_count, total_tasks_count, progress_percentage, enrolled_at) "
                    "VALUES (:id, :sid, :cid, 'active', :att, :total, 0, 0, :prog, NOW())"
                ), {
                    "id": enrollment_id,
                    "sid": student_id,
                    "cid": course_id,
                    "att": attended,
                    "total": total_sess,
                    "prog": progress,
                })

                total_imported += 1

            await session.commit()
            print(f"  ✅ Imported {student_counter} students for {course_data['title']}")

        print(f"\n{'='*60}")
        print(f"🎉 MIGRATION COMPLETE! Total students imported: {total_imported}")
        print(f"{'='*60}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
