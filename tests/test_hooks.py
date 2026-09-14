"""The two locks on the pull request, tested without a model: the edge out of the gate, and RefusalGuard."""
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from agent import db, pipeline, session
from agent.hooks import RefusalGuard


class PullRequestLocks(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        path = Path(self.tmp.name) / "runs.db"
        db.init(path)
        self.conn = db.connect(path)
        self.aid = db.insert_attempt(self.conn, "com.example.VictimTest#testReads")
        self.cid = db.insert_candidate(self.conn, self.aid, 1, "agent", "Reset after each test", "", "diff", [])
        self.ctx = session.start(session.RunContext(
            attempt_id=self.aid, repo=Path(self.tmp.name), fqcn="com.example.VictimTest",
            method="testReads", polluter=None, conn=self.conn))

    def tearDown(self):
        session.clear()
        self.conn.close()
        self.tmp.cleanup()

    def _call(self, tool: str = "open_pull_request"):
        event = SimpleNamespace(tool_use={"name": tool, "input": {}}, cancel_tool=False)
        RefusalGuard()._check(event)
        return event

    def test_nothing_verified_routes_to_refuse_and_the_hook_cancels_the_pr(self):
        self.assertFalse(pipeline.gate_verified())
        self.assertTrue(pipeline.gate_refused())
        self.assertTrue(self._call().cancel_tool)

    def test_verified_in_memory_but_not_in_the_database_is_still_refused(self):
        self.ctx.verified_candidate_id = self.cid       # the gate never wrote VERIFIED for it
        self.assertTrue(pipeline.gate_verified())
        self.assertTrue(self._call().cancel_tool)

    def test_a_verified_candidate_may_open_the_pr(self):
        db.update(self.conn, "candidates", self.cid, verdict="VERIFIED")
        self.ctx.verified_candidate_id = self.cid
        self.assertTrue(pipeline.gate_verified())
        self.assertFalse(pipeline.gate_refused())
        self.assertFalse(self._call().cancel_tool)

    def test_other_tools_are_untouched(self):
        self.assertFalse(self._call("read_source").cancel_tool)

    def test_with_no_run_in_progress_the_pr_is_refused(self):
        session.clear()
        self.assertTrue(self._call().cancel_tool)


if __name__ == "__main__":
    unittest.main()
