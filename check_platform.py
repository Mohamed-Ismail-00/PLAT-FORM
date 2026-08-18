
"""Platform health check script - read only, no modifications."""
import httpx
import json

base = "https://innovera-interns-performance.vercel.app/api/v1"

print("=" * 60)
print("PLATFORM REVIEW - READ ONLY")
print("=" * 60)

# 1. Courses endpoint
print("\n--- 1. COURSES ---")
r = httpx.get(f"{base}/courses", timeout=15)
courses = r.json().get("data", [])
print(f"Status: {r.status_code} | Count: {len(courses)}")
for c in courses:
    print(f"  - {c['title']} (id: {c['id'][:8]}...)")

# 2. Students endpoint
print("\n--- 2. STUDENTS ---")
r = httpx.get(f"{base}/students?page_size=1000", timeout=15)
students = r.json().get("data", [])
print(f"Status: {r.status_code} | Total Count: {len(students)}")
# Show first 5
for s in students[:5]:
    name = s.get("full_name", s.get("first_name", "?"))
    print(f"  - {name} | code: {s.get('student_code', 'N/A')}")
if len(students) > 5:
    print(f"  ... and {len(students) - 5} more")

# 3. Auth / Login
print("\n--- 3. AUTH (LOGIN) ---")
creds_list = [
    ("admin@innovera.com", "Innovera@2026"),
    ("superadmin@innovera.com", "Innovera@2026"),
    ("admin@innovera.com", "Admin@2026"),
]
for email, pw in creds_list:
    r = httpx.post(f"{base}/auth/login", json={"email": email, "password": pw}, timeout=15)
    has_token = "access_token" in r.json().get("data", {}) if r.status_code == 200 else False
    print(f"  {email} -> Status: {r.status_code} | Token: {has_token}")

# 4. Quick-add endpoint (OPTIONS only, no actual add)
print("\n--- 4. QUICK-ADD ENDPOINT (OPTIONS check) ---")
r = httpx.options(f"{base}/students/quick-add", timeout=15)
print(f"  OPTIONS status: {r.status_code}")

# 5. Tasks endpoint
print("\n--- 5. TASKS ---")
try:
    r = httpx.get(f"{base}/tasks", timeout=15)
    print(f"  Status: {r.status_code}")
    if r.status_code == 200:
        tasks_data = r.json().get("data", [])
        print(f"  Tasks count: {len(tasks_data)}")
except Exception as e:
    print(f"  Error: {e}")

# 6. Submissions endpoint
print("\n--- 6. SUBMISSIONS ---")
try:
    r = httpx.get(f"{base}/submissions", timeout=15)
    print(f"  Status: {r.status_code}")
except Exception as e:
    print(f"  Error: {e}")

# 7. Dashboard / Stats
print("\n--- 7. DASHBOARD ---")
try:
    r = httpx.get(f"{base}/dashboard", timeout=15)
    print(f"  Status: {r.status_code}")
    if r.status_code == 200:
        print(f"  Data keys: {list(r.json().get('data', {}).keys())}")
except Exception as e:
    print(f"  Error: {e}")

print("\n" + "=" * 60)
print("REVIEW COMPLETE")
print("=" * 60)
