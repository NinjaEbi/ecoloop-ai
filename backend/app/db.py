import json
import sqlite3
from contextlib import contextmanager
from .config import DB_PATH

@contextmanager
def connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def initialise() -> None:
    with connection() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS assessments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          image_path TEXT,
          device_type TEXT NOT NULL,
          recognition_status TEXT NOT NULL,
          recognition_confidence REAL NOT NULL,
          manual_assessment INTEGER NOT NULL DEFAULT 0,
          answers_json TEXT NOT NULL,
          findings_json TEXT NOT NULL,
          condition TEXT NOT NULL,
          condition_score REAL NOT NULL,
          assessment_confidence REAL NOT NULL,
          ecoscore REAL NOT NULL,
          ecoscore_breakdown_json TEXT NOT NULL,
          recommendation_scores_json TEXT NOT NULL,
          recommended_action TEXT NOT NULL,
          explanation TEXT NOT NULL,
          stakeholder_category TEXT NOT NULL
        );
        """)

def insert_assessment(record: dict) -> int:
    columns = list(record)
    values = [json.dumps(record[c]) if c.endswith("_json") else record[c] for c in columns]
    with connection() as conn:
        cursor = conn.execute(
            f"INSERT INTO assessments ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})", values
        )
        return cursor.lastrowid

def list_assessments(device: str | None = None, recommendation: str | None = None):
    query = "SELECT * FROM assessments WHERE 1=1"
    params = []
    if device:
        query += " AND device_type = ?"; params.append(device)
    if recommendation:
        query += " AND recommended_action = ?"; params.append(recommendation)
    query += " ORDER BY id DESC"
    with connection() as conn:
        return [dict(row) for row in conn.execute(query, params).fetchall()]

def get_assessment(assessment_id: int):
    with connection() as conn:
        row = conn.execute("SELECT * FROM assessments WHERE id = ?", (assessment_id,)).fetchone()
        return dict(row) if row else None

def dashboard():
    with connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM assessments").fetchone()[0]
        avg = conn.execute("SELECT AVG(ecoscore) FROM assessments").fetchone()[0]
        device = conn.execute("SELECT device_type, COUNT(*) c FROM assessments GROUP BY device_type ORDER BY c DESC LIMIT 1").fetchone()
        action = conn.execute("SELECT recommended_action, COUNT(*) c FROM assessments GROUP BY recommended_action ORDER BY c DESC LIMIT 1").fetchone()
    return {"total_assessments": total, "average_ecoscore": round(avg or 0, 1), "most_common_device": device[0] if device else None, "most_common_recommendation": action[0] if action else None}
