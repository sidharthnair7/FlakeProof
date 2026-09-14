"""The web app: recorded runs as JSON, and the built web UI, from one address.

    uvicorn dashboard.app:app --port 8000        then open http://localhost:8000

It reads the same SQLite database the agent writes (WAL mode), so the UI shows a run while it is
happening. The UI source is in frontend/; build it once with `npm run build` and this app serves
frontend/dist. During UI development, `npm run dev` proxies /api to this app instead.
"""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

from agent import db
from agent.config import ROOT

DIST = (ROOT / "frontend" / "dist").resolve()

NOT_BUILT = """<!doctype html><title>Flakeproof</title>
<body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; line-height: 1.5">
<h1>The web UI is not built yet</h1>
<p>From the repository root, run:</p>
<pre>cd frontend
npm install
npm run build</pre>
<p>Then reload this page. The data API is already running at <a href="/api/replay">/api/replay</a>.</p>
</body>"""

app = FastAPI(title="Flakeproof")
db.init()


def _read(fn):
    conn = db.connect()
    try:
        return fn(conn)
    finally:
        conn.close()


@app.get("/api/replay")
def replay():
    """Tally, and every attempt with its candidates, runs, hypotheses and agent events."""
    return _read(db.replay)


@app.get("/api/attempts")
def attempts():
    return _read(lambda conn: db._public(db.list_attempts(conn)))


@app.get("/api/attempts/{attempt_id}")
def attempt(attempt_id: int):
    def load(conn):
        found = db.get_attempt(conn, attempt_id)
        if found:
            found["runs"] = db.runs_for(conn, attempt_id)
        return db._public(found)
    found = _read(load)
    if not found:
        raise HTTPException(status_code=404, detail=f"no attempt #{attempt_id}")
    return found


@app.get("/api/attempts/{attempt_id}/runs")
def runs(attempt_id: int):
    return _read(lambda conn: db._public(db.runs_for(conn, attempt_id)))


@app.get("/{path:path}", include_in_schema=False)
def ui(path: str):
    """Serve the built UI. Unknown paths get index.html so client-side routes like /dashboard work."""
    if path.startswith("api/"):
        raise HTTPException(status_code=404)
    index = DIST / "index.html"
    if not index.exists():
        return HTMLResponse(NOT_BUILT, status_code=503)
    target = (DIST / path).resolve()
    if path and target.is_file() and DIST in target.parents:
        return FileResponse(target)
    return FileResponse(index)
