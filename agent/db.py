"""SQLite persistence. The agent writes here; the dashboard reads here.

Chosen over an in-memory structure because a 200-rerun job is long and must survive a crash,
and because the accepted/refused tally is a single GROUP BY. WAL mode so the dashboard can read
while the agent writes.

Tables
  attempts    one row per flaky test the agent was pointed at
  candidates  one row per candidate patch judged by the gate (agent-written or planted)
  runs        one row per JVM execution: baseline (before any patch) or verify (Blade 1)
  hypotheses  what each diagnosis agent concluded, with confidence
  events      the agent trace: node starts, tool calls, handoffs, gate decisions
  gate_checks "Try the gate" submissions from the dashboard, CLI or AgentCore
"""
import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

from agent.config import DB_PATH

SCHEMA_TABLES = """
CREATE TABLE IF NOT EXISTS attempts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name      TEXT    NOT NULL,          -- fqcn#method
    project_url    TEXT,
    repo_path      TEXT,
    sha            TEXT,
    polluter       TEXT,                      -- Surefire selector, Class#method
    category       TEXT,                      -- order-dependent | async-wait | concurrency | ...
    root_cause     TEXT,
    verdict        TEXT    DEFAULT 'PENDING', -- VERIFIED | REFUSED_UNPROVEN | REFUSED_BANDAID | PENDING
    refusal_reason TEXT,
    pr_url         TEXT,
    status         TEXT    DEFAULT 'RUNNING', -- RUNNING | DONE | FAILED
    error          TEXT,
    created_at     TEXT    DEFAULT CURRENT_TIMESTAMP,
    finished_at    TEXT
);

CREATE TABLE IF NOT EXISTS candidates (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id      INTEGER NOT NULL REFERENCES attempts(id),
    ordinal         INTEGER NOT NULL,
    source          TEXT    NOT NULL,          -- agent | planted
    title           TEXT,
    rationale       TEXT,
    diff            TEXT,
    files           TEXT,                      -- JSON list of changed paths
    compiled        INTEGER,                   -- 1/0, NULL if not attempted
    compile_error   TEXT,
    blade1_runs     INTEGER DEFAULT 0,
    blade1_passes   INTEGER DEFAULT 0,
    blade2_verdict  TEXT,                      -- CLEAN | BANDAID
    blade2_category TEXT,
    blade2_reason   TEXT,
    blade2_line     TEXT,                      -- the offending line, verbatim
    blade2_line_no  INTEGER,                   -- line number in the patched file
    blade2_file     TEXT,
    verdict         TEXT    DEFAULT 'PENDING', -- VERIFIED | REFUSED_UNPROVEN | REFUSED_BANDAID | PENDING
    created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
    finished_at     TEXT
);

CREATE TABLE IF NOT EXISTS runs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id   INTEGER NOT NULL REFERENCES attempts(id),
    candidate_id INTEGER REFERENCES candidates(id),   -- NULL for baseline runs
    seq          INTEGER NOT NULL,   -- 1..N
    passed       INTEGER NOT NULL,   -- 0 or 1. Skipped counts as 0: @Ignore is not a pass.
    test_order   TEXT,               -- the Surefire order that produced this result
    phase        TEXT,               -- baseline | verify
    failing      TEXT,               -- failure message, if any
    duration_ms  INTEGER,
    created_at   TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hypotheses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id  INTEGER NOT NULL REFERENCES attempts(id),
    agent       TEXT,
    category    TEXT,
    confidence  REAL,
    summary     TEXT,
    evidence    TEXT,
    created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id  INTEGER REFERENCES attempts(id),
    ts          TEXT    DEFAULT CURRENT_TIMESTAMP,
    kind        TEXT,     -- node | tool | handoff | model | gate | refusal | pr | info | error
    agent       TEXT,
    detail      TEXT
);

CREATE TABLE IF NOT EXISTS gate_checks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source      TEXT,     -- web | cli | agentcore
    diff        TEXT,
    verdict     TEXT,     -- CLEAN | BANDAID
    category    TEXT,
    reason      TEXT,
    line        TEXT,
    model_used  INTEGER,
    created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
);
"""

# Indexes are created after the migrations below: an index on a column that an old database
# does not have yet would stop init() before the column could be added.
SCHEMA_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_runs_attempt ON runs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_runs_candidate ON runs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_events_attempt ON events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_candidates_attempt ON candidates(attempt_id);
"""

# Columns added after the first schema shipped. init() adds any that are missing so an old
# runs.db keeps working.
_MIGRATIONS = {
    "attempts": {
        "repo_path": "TEXT", "polluter": "TEXT", "category": "TEXT", "status": "TEXT DEFAULT 'RUNNING'",
        "error": "TEXT", "finished_at": "TEXT",
    },
    "runs": {"candidate_id": "INTEGER", "failing": "TEXT", "duration_ms": "INTEGER"},
}


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def connect(path=None) -> sqlite3.Connection:
    path = path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row      # rows behave like dicts
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def init(path=None) -> None:
    conn = connect(path)
    try:
        conn.executescript(SCHEMA_TABLES)
        for table, cols in _MIGRATIONS.items():
            existing = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
            for col, decl in cols.items():
                if col not in existing:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {decl}")
        conn.executescript(SCHEMA_INDEXES)
        conn.commit()
    finally:
        conn.close()


# ---- writers --------------------------------------------------------------------------------

def insert_attempt(conn, test_name, project_url=None, repo_path=None, sha=None,
                   polluter=None) -> int:
    cur = conn.execute(
        "INSERT INTO attempts (test_name, project_url, repo_path, sha, polluter, verdict, status)"
        " VALUES (?,?,?,?,?,'PENDING','RUNNING')",
        (test_name, project_url, repo_path, sha, polluter))
    conn.commit()
    return cur.lastrowid


def update(conn, table: str, row_id: int, **fields: Any) -> None:
    if not fields:
        return
    sets = ", ".join(f"{k} = ?" for k in fields)
    conn.execute(f"UPDATE {table} SET {sets} WHERE id = ?", (*fields.values(), row_id))
    conn.commit()


def insert_candidate(conn, attempt_id, ordinal, source, title, rationale, diff, files) -> int:
    cur = conn.execute(
        "INSERT INTO candidates (attempt_id, ordinal, source, title, rationale, diff, files)"
        " VALUES (?,?,?,?,?,?,?)",
        (attempt_id, ordinal, source, title, rationale, diff, json.dumps(files)))
    conn.commit()
    return cur.lastrowid


def insert_run(conn, attempt_id, seq, passed, test_order, phase, candidate_id=None,
               failing=None, duration_ms=None) -> None:
    conn.execute(
        "INSERT INTO runs (attempt_id, candidate_id, seq, passed, test_order, phase, failing,"
        " duration_ms) VALUES (?,?,?,?,?,?,?,?)",
        (attempt_id, candidate_id, seq, int(bool(passed)), test_order, phase, failing, duration_ms))
    conn.commit()


def insert_hypothesis(conn, attempt_id, agent, category, confidence, summary, evidence) -> int:
    cur = conn.execute(
        "INSERT INTO hypotheses (attempt_id, agent, category, confidence, summary, evidence)"
        " VALUES (?,?,?,?,?,?)",
        (attempt_id, agent, category, float(confidence), summary, evidence))
    conn.commit()
    return cur.lastrowid


def log_event(conn, attempt_id, kind, agent, detail) -> None:
    if not isinstance(detail, str):
        detail = json.dumps(detail, default=str)
    conn.execute("INSERT INTO events (attempt_id, ts, kind, agent, detail) VALUES (?,?,?,?,?)",
                 (attempt_id, now(), kind, agent, detail[:4000]))
    conn.commit()


def insert_gate_check(conn, source, diff, verdict, category, reason, line, model_used) -> int:
    cur = conn.execute(
        "INSERT INTO gate_checks (source, diff, verdict, category, reason, line, model_used)"
        " VALUES (?,?,?,?,?,?,?)",
        (source, diff, verdict, category, reason, line, int(bool(model_used))))
    conn.commit()
    return cur.lastrowid


# ---- readers --------------------------------------------------------------------------------

def rows(conn, sql, params=()) -> list[dict]:
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def tally(conn) -> dict:
    """The thesis as numbers. Counted over candidates, because the gate judges candidates."""
    out = {"attempted": 0, "verified": 0, "refused": 0, "refused_unproven": 0,
           "refused_bandaid": 0, "pending": 0, "attempts": 0, "prs": 0, "runs": 0}
    for r in conn.execute("SELECT verdict, COUNT(*) n FROM candidates GROUP BY verdict"):
        n = r["n"]
        out["attempted"] += n
        if r["verdict"] == "VERIFIED":
            out["verified"] += n
        elif r["verdict"] == "REFUSED_UNPROVEN":
            out["refused"] += n
            out["refused_unproven"] += n
        elif r["verdict"] == "REFUSED_BANDAID":
            out["refused"] += n
            out["refused_bandaid"] += n
        else:
            out["pending"] += n
    out["attempts"] = conn.execute("SELECT COUNT(*) FROM attempts").fetchone()[0]
    out["prs"] = conn.execute("SELECT COUNT(*) FROM attempts WHERE pr_url IS NOT NULL").fetchone()[0]
    out["runs"] = conn.execute("SELECT COUNT(*) FROM runs").fetchone()[0]
    return out


def list_attempts(conn) -> list[dict]:
    return rows(conn, """
        SELECT a.*,
               (SELECT COUNT(*) FROM candidates c WHERE c.attempt_id = a.id) AS n_candidates,
               (SELECT COUNT(*) FROM runs r WHERE r.attempt_id = a.id) AS n_runs,
               (SELECT COALESCE(SUM(passed),0) FROM runs r
                 WHERE r.attempt_id = a.id AND r.phase = 'baseline') AS baseline_passes,
               (SELECT COUNT(*) FROM runs r
                 WHERE r.attempt_id = a.id AND r.phase = 'baseline') AS baseline_runs
        FROM attempts a ORDER BY a.id DESC""")


def get_attempt(conn, attempt_id: int) -> dict | None:
    found = rows(conn, "SELECT * FROM attempts WHERE id = ?", (attempt_id,))
    if not found:
        return None
    a = found[0]
    a["candidates"] = rows(conn, "SELECT * FROM candidates WHERE attempt_id = ? ORDER BY ordinal",
                           (attempt_id,))
    for c in a["candidates"]:
        c["files"] = json.loads(c["files"] or "[]")
    a["hypotheses"] = rows(conn, "SELECT * FROM hypotheses WHERE attempt_id = ? ORDER BY id",
                           (attempt_id,))
    a["events"] = rows(conn, "SELECT * FROM events WHERE attempt_id = ? ORDER BY id", (attempt_id,))
    return a


def runs_for(conn, attempt_id: int, candidate_id: int | None = None, phase: str | None = None):
    sql = "SELECT seq, passed, test_order, phase, failing, duration_ms, candidate_id FROM runs WHERE attempt_id = ?"
    params: list = [attempt_id]
    if candidate_id is not None:
        sql += " AND candidate_id = ?"
        params.append(candidate_id)
    elif phase == "baseline":
        sql += " AND candidate_id IS NULL"
    if phase:
        sql += " AND phase = ?"
        params.append(phase)
    sql += " ORDER BY seq"
    return rows(conn, sql, params)


def replay(conn) -> dict:
    """Everything the web UI and a replay-only deployment read, as one JSON-ready document:
    the tally, every attempt with its candidates, runs, hypotheses and events, and recent gate checks."""
    out = {"tally": tally(conn), "attempts": [],
           "gate_checks": rows(conn, "SELECT * FROM gate_checks ORDER BY id DESC LIMIT 100")}
    for summary in list_attempts(conn):
        full = get_attempt(conn, summary["id"])
        full["runs"] = runs_for(conn, summary["id"])
        full["baseline_passes"] = summary["baseline_passes"]
        full["baseline_runs"] = summary["baseline_runs"]
        out["attempts"].append(full)
    return out


if __name__ == "__main__":
    init()
    print(f"initialised {DB_PATH}")
