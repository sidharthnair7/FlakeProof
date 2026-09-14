"""SQLite layer: migrating an old database, and the replay document the web UI reads."""
import sqlite3
import tempfile
import unittest
from pathlib import Path

from agent import db

# The attempts and runs tables as the first version of Flakeproof created them.
OLD_ATTEMPTS = """CREATE TABLE attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, test_name TEXT NOT NULL,
    project_url TEXT, sha TEXT, root_cause TEXT, patch_diff TEXT, verdict TEXT DEFAULT 'PENDING',
    refusal_reason TEXT, pr_url TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"""
OLD_RUNS = """CREATE TABLE runs (id INTEGER PRIMARY KEY AUTOINCREMENT, attempt_id INTEGER NOT NULL,
    seq INTEGER NOT NULL, passed INTEGER NOT NULL, test_order TEXT, phase TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)"""


class Database(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.path = Path(self.tmp.name) / "runs.db"

    def tearDown(self):
        self.tmp.cleanup()

    def test_init_migrates_an_old_database(self):
        old = sqlite3.connect(self.path)
        old.execute(OLD_ATTEMPTS)
        old.execute(OLD_RUNS)
        old.commit()
        old.close()

        db.init(self.path)

        conn = db.connect(self.path)
        try:
            run_cols = {r["name"] for r in conn.execute("PRAGMA table_info(runs)")}
            attempt_cols = {r["name"] for r in conn.execute("PRAGMA table_info(attempts)")}
            indexes = {r["name"] for r in conn.execute("PRAGMA index_list(runs)")}
        finally:
            conn.close()
        self.assertIn("candidate_id", run_cols)
        self.assertIn("status", attempt_cols)
        self.assertIn("idx_runs_candidate", indexes)

    def test_replay_carries_everything_the_ui_reads(self):
        db.init(self.path)
        conn = db.connect(self.path)
        try:
            aid = db.insert_attempt(conn, "com.example.VictimTest#testReads",
                                    polluter="PolluterTest#testDirties")
            db.insert_run(conn, aid, 1, True, "alphabetical", "baseline")
            db.insert_run(conn, aid, 2, False, "reversealphabetical", "baseline", failing="error: boom")
            cid = db.insert_candidate(conn, aid, 1, "planted", "Reset after each test", "why",
                                      "diff --git a/X.java b/X.java\n", ["X.java"])
            db.insert_run(conn, aid, 1, True, "alphabetical", "verify", candidate_id=cid)
            db.log_event(conn, aid, "verdict", "gate", f"#{cid} VERIFIED")
            data = db.replay(conn)
        finally:
            conn.close()

        attempt = data["attempts"][0]
        self.assertEqual((attempt["baseline_passes"], attempt["baseline_runs"]), (1, 2))
        self.assertEqual(attempt["candidates"][0]["files"], ["X.java"])
        self.assertEqual(len(attempt["runs"]), 3)
        self.assertEqual(attempt["events"][0]["kind"], "verdict")
        self.assertEqual(data["tally"]["runs"], 3)


if __name__ == "__main__":
    unittest.main()
