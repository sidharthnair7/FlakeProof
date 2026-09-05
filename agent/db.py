"""SQLite persistence. The agent writes here; the dashboard reads here.

Chosen over an in-memory structure because a 200-rerun job is long and must survive a crash,
and because the accepted/refused tally is a single GROUP BY.
"""
import sqlite3
from pathlib import Path

from agent.config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS attempts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name     TEXT    NOT NULL,
    project_url   TEXT,
    sha           TEXT,
    root_cause    TEXT,
    patch_diff    TEXT,
    verdict       TEXT,           -- VERIFIED | REFUSED_UNPROVEN | REFUSED_BANDAID | PENDING
    refusal_reason TEXT,
    pr_url        TEXT,
    created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id  INTEGER NOT NULL REFERENCES attempts(id),
    seq         INTEGER NOT NULL,   -- 1..N
    passed      INTEGER NOT NULL,   -- 0 or 1
    test_order  TEXT,               -- the shuffled order that produced this result
    phase       TEXT,               -- 'before' or 'after' the patch
    created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_runs_attempt ON runs(attempt_id);
"""


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row      # rows behave like dicts
    return conn


def init() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


if __name__ == "__main__":
    init()
    print(f"initialised {DB_PATH}")
