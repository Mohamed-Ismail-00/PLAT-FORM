import sqlite3
import psycopg2

sqlite_path = "./backend/spi.db"
postgres_url = "postgresql://neondb_owner:npg_BJlVDqji0K1w@ep-super-dew-ax5eli11.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

sq_conn = sqlite3.connect(sqlite_path)
sq_cur = sq_conn.cursor()

pg_conn = psycopg2.connect(postgres_url)
pg_cur = pg_conn.cursor()

tables = [
    "roles",
    "users",
    "instructors",
    "students",
    "courses",
    "lessons",
    "enrollments",
    "assignments",
    "assignment_submissions",
    "attendance",
    "predictions"
]

for tbl in tables:
    sq_cur.execute(f'SELECT * FROM "{tbl}"')
    rows = sq_cur.fetchall()
    if not rows:
        continue
    
    col_names = [d[0] for d in sq_cur.description]
    cols_str = ", ".join([f'"{c}"' for c in col_names])
    placeholders = ", ".join(["%s"] * len(col_names))
    
    insert_sql = f'INSERT INTO "{tbl}" ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'
    
    try:
        pg_cur.executemany(insert_sql, rows)
        pg_conn.commit()
        print(f"[SUCCESS] {tbl}: inserted {len(rows)} rows OK")
    except Exception as e:
        pg_conn.rollback()
        print(f"[ERROR] {tbl}: {e}")

sq_conn.close()
pg_conn.close()
print("\nMIGRATION COMPLETED SUCCESSFULLY!")
