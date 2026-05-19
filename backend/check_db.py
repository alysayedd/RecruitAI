import sqlite3
conn = sqlite3.connect("recruitment_ai.db")
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print("Tables:", tables)
if "users" in tables:
    cursor = conn.execute("SELECT id, name, email, role FROM users")
    for row in cursor:
        print("User:", row)
    cursor = conn.execute("PRAGMA table_info(users)")
    print("Columns:", [row for row in cursor.fetchall()])
