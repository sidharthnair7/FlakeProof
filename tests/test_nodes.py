"""The band-aid judge reads a patch as an independent reviewer, not through the agents' eyes."""
import unittest
from pathlib import Path

from agent import session
from agent.nodes import _judge_context


class JudgeContext(unittest.TestCase):
    def setUp(self):
        self.ctx = session.RunContext(attempt_id=1, repo=Path("."), fqcn="com.example.VictimTest",
                                      method="testReads", polluter="PolluterTest#testDirties",
                                      conn=None)

    def test_names_the_test_and_its_reproduction_scope(self):
        text = _judge_context(self.ctx)
        self.assertIn("com.example.VictimTest#testReads", text)
        self.assertIn("PolluterTest#testDirties", text)

    def test_never_includes_the_agents_diagnosis(self):
        self.ctx.diagnosis = {"category": "order-dependent",
                              "root_cause": "fragments arrive out of sequence",
                              "mechanism": "the parser assumes ordering",
                              "fix_strategy": "validate the fragment order"}
        text = _judge_context(self.ctx)
        for leaked in ("fragment", "sequence", "ordering", "validate"):
            self.assertNotIn(leaked, text)


if __name__ == "__main__":
    unittest.main()
