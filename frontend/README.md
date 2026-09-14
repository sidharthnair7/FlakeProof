# FlakeProof web UI

React, Vite and Tailwind. It shows the runs FlakeProof recorded in `data/runs.db`, served by the FastAPI app in `dashboard/app.py`. There is no sample data: every number on screen comes from the API.

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

`GET /api/replay` returns the tally and every attempt with its candidates, runs, hypotheses and agent events (`replay()` in `agent/db.py`). The UI polls it every 3 seconds, so a run in progress fills in live. `src/lib/replay.ts` maps it to the UI types in `src/lib/types.ts`.
