"""
database.py
Persistent SQLite database management for Plant Disease Prediction History.
Maintains an audit trail of inferences with parameterized queries.
"""

import sqlite3
import os
from typing import List, Dict, Any, Optional
from config import DB_PATH


def get_db_connection() -> sqlite3.Connection:
    """Create and return a thread-safe connection to the predictions database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the predictions audit schema."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    predicted_class TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    is_uncertain INTEGER NOT NULL DEFAULT 0,
                    expert_urgency TEXT,
                    fuzzy_score REAL,
                    client_ip TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_pred_created_at ON predictions(created_at);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_pred_class ON predictions(predicted_class);")
    finally:
        conn.close()


def record_prediction(
    filename: str,
    predicted_class: str,
    confidence: float,
    is_uncertain: bool = False,
    expert_urgency: Optional[str] = None,
    fuzzy_score: Optional[float] = None,
    client_ip: Optional[str] = None
) -> int:
    """Record an inference event into the persistent database."""
    conn = get_db_connection()
    try:
        with conn:
            cursor = conn.execute("""
                INSERT INTO predictions (
                    filename, predicted_class, confidence, is_uncertain, expert_urgency, fuzzy_score, client_ip
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                os.path.basename(filename),  # Store only clean basename, never arbitrary paths
                predicted_class,
                float(confidence),
                1 if is_uncertain else 0,
                expert_urgency or "Routine",
                float(fuzzy_score) if fuzzy_score is not None else None,
                client_ip or "127.0.0.1"
            ))
            return cursor.lastrowid
    finally:
        conn.close()


def get_recent_predictions(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent prediction audit logs."""
    safe_limit = max(1, min(int(limit), 200))
    conn = get_db_connection()
    try:
        cursor = conn.execute("""
            SELECT id, filename, predicted_class, confidence, is_uncertain, expert_urgency, fuzzy_score, created_at
            FROM predictions
            ORDER BY created_at DESC
            LIMIT ?
        """, (safe_limit,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized at:", DB_PATH)
