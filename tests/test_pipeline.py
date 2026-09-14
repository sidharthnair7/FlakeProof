"""Pipeline helpers that need no JVM and no network: the mode line, and rebuilding a finished attempt."""
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from agent import db, pipeline


class ModeLabel(unittest.TestCase):
    def test_a_no_agent_run_still_names_the_judge_model(self):
        with mock.patch.object(pipeline, "model_available", return_value=True), \
                mock.patch.object(pipeline, "describe_model", return_value="bedrock:test-model"):
            self.assertEqual(pipeline.mode_label(use_agent=False),
                             "no agents; planted candidates only; band-aid judge on bedrock:test-model")
            self.assertEqual(pipeline.mode_label(use_agent=True), "agents (bedrock:test-model)")

    def test_no_model_at_all(self):
        with mock.patch.object(pipeline, "model_available", return_value=False):
            self.assertEqual(pipeline.mode_label(use_agent=True),
                             "no agents and no model; planted candidates only")


class ContextForAttempt(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        path = Path(self.tmp.name) / "runs.db"
        db.init(path)
        self.conn = db.connect(path)

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def _attempt(self, verdicts: list[str]) -> int:
        aid = db.insert_attempt(self.conn, "com.example.VictimTest#testReads",
                                project_url="https://github.com/example/repo", repo_path="workdir/repo",
                                polluter="PolluterTest#testDirties")
        db.insert_run(self.conn, aid, 1, True, "alphabetical", "baseline")
        db.insert_run(self.conn, aid, 2, False, "reversealphabetical", "baseline")
        for ordinal, verdict in enumerate(verdicts, 1):
            cid = db.insert_candidate(self.conn, aid, ordinal, "planted", f"candidate {ordinal}", "", "diff", [])
            db.update(self.conn, "candidates", cid, verdict=verdict)
        return aid

    def test_rebuilds_the_baseline_and_picks_the_first_verified_candidate(self):
        aid = self._attempt(["REFUSED_BANDAID", "VERIFIED", "VERIFIED"])
        ctx = pipeline.context_for_attempt(self.conn, aid, open_prs=False)
        first_verified = db.rows(self.conn, "SELECT id FROM candidates WHERE attempt_id = ? AND "
                                            "verdict = 'VERIFIED' ORDER BY ordinal", (aid,))[0]["id"]
        self.assertEqual(ctx.verified_candidate_id, first_verified)
        self.assertEqual((ctx.baseline_passes, ctx.baseline_total), (1, 2))
        self.assertEqual((ctx.fqcn, ctx.method), ("com.example.VictimTest", "testReads"))
        self.assertFalse(ctx.open_prs)

    def test_refuses_an_attempt_with_no_verified_candidate(self):
        aid = self._attempt(["REFUSED_UNPROVEN", "REFUSED_BANDAID"])
        with self.assertRaises(SystemExit):
            pipeline.context_for_attempt(self.conn, aid, open_prs=False)


if __name__ == "__main__":
    unittest.main()
