import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env")

print(f"Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

with open("scripts/schema.sql", "r", encoding="utf-8") as f:
    sql = f.read()

print("Applying schema migrations...")
cur.execute(sql)
conn.commit()
cur.close()
conn.close()

print("✅ Schema applied and wards seeded successfully!")
