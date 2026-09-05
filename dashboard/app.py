"""FastAPI dashboard. Reads the same SQLite the agent writes.

    uvicorn dashboard.app:app --reload
"""
from fastapi import FastAPI
from fastapi.responses import FileResponse

from agent import db
from agent.config import ROOT

app = FastAPI(title="Flaky Test Repair Agent")


@app.get("/api/attempts")
def attempts():
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT * FROM attempts ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/attempts/{attempt_id}/runs")
def runs(attempt_id: int):
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT seq, passed, test_order, phase FROM runs "
            "WHERE attempt_id = ? ORDER BY seq",
            (attempt_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/")
def index():
    return FileResponse(ROOT / "dashboard" / "static" / "index.html")
