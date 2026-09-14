# Flakeproof web UI

React, Vite and Tailwind. It shows the runs Flakeproof recorded in `data/runs.db`, served by the FastAPI app in `dashboard/app.py`. There is no sample data: every number on screen comes from the API.

- The landing page (`/`) walks through the recorded demo run: the three patches the gate judged, both checks, and the diff.
- The dashboard (`/dashboard`) shows what needs a decision (a pull request whose fix was proven), every run with its verdicts, and who acted in the latest agent run. Selecting a run opens its evidence at `/dashboard?run=N`: the patches side by side, reruns by test order, the diff and the event log.

## Run it

From the repository root, with the Python environment set up (see the main README):

```bash
cd frontend
npm install
npm run build
cd ..
python -m uvicorn dashboard.app:app --port 8000
```

Open http://localhost:8000 for the landing page, or http://localhost:8000/dashboard.

## Develop

Keep the API running, then in a second terminal:

```bash
cd frontend
npm run dev
```

Vite serves the UI with hot reload and proxies `/api` to http://127.0.0.1:8000.

## Where the data comes from

`GET /api/replay` returns the tally and every attempt with its candidates, runs, hypotheses and agent events (`replay()` in `agent/db.py`, with local file paths removed). The UI polls it every 3 seconds, so a run in progress fills in live. `src/lib/replay.ts` maps it to the UI types in `src/lib/types.ts`.
