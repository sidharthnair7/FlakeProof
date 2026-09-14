"""The pull request's evidence: a confidence bound only over runs that could have failed."""
import unittest

from agent import github

ORDERS = ["alphabetical", "reversealphabetical", "random", "filesystem"]


def run(order: str, passed: bool, phase: str = "verify", candidate_id: int | None = 13) -> dict:
    return {"test_order": order, "passed": int(passed), "phase": phase,
            "candidate_id": None if phase == "baseline" else candidate_id}


ATTEMPT = {"id": 5, "test_name": "com.example.VictimTest#testReads", "polluter": "PolluterTest#testDirties"}
FIX = {"id": 13, "verdict": "VERIFIED", "blade2_verdict": "CLEAN",
       "blade2_reason": "No band-aid pattern found by the deterministic scanner. Model (100% real fix): "
                        "addresses the underlying concurrency issue."}
WRONG = {"id": 11, "title": "Restore the wrong parser", "source": "planted", "verdict": "REFUSED_UNPROVEN",
         "blade2_category": "", "blade2_reason": "", "blade2_line_no": None}
IGNORE = {"id": 12, "title": "Skip the polluting test", "source": "planted", "verdict": "REFUSED_BANDAID",
          "blade2_category": "ignore", "blade2_line_no": 220,
          "blade2_reason": "skips or excludes the test. Model: it disables the test."}


class EvidenceBody(unittest.TestCase):
    def setUp(self):
        baseline = [run(o, o != "reversealphabetical", "baseline") for o in ORDERS for _ in range(5)]
        fix = [run(o, True) for o in ORDERS for _ in range(50)]
        wrong = [run(o, o in ("alphabetical", "filesystem"), candidate_id=11) for o in ORDERS for _ in range(50)]
        ignore = [run(o, True, candidate_id=12) for o in ORDERS for _ in range(50)]
        self.runs = baseline + fix + wrong + ignore
        self.body = github.render_pr_body(ATTEMPT, FIX, "Reset the shared state after each test.",
                                          self.runs, [WRONG, IGNORE], category="order-dependent")

    def test_bound_counts_only_the_order_where_the_unfixed_code_always_failed(self):
        self.assertIn("In reverse alphabetical order the unfixed code failed all 5 baseline runs; "
                      "after the patch, 50 of 50 passed.", self.body)
        self.assertIn("below 6% at 95% confidence", self.body)
        self.assertNotIn("1.5%", self.body)
        self.assertIn("| **Total** | **15 / 20** | **200 / 200** |", self.body)

    def test_no_model_prose_and_no_placeholder_fields(self):
        for text in ("concurrency", "Model", "unknown", "see summary"):
            self.assertNotIn(text, self.body)

    def test_refusals_state_what_the_gate_saw(self):
        self.assertIn("Restore the wrong parser (planted by hand): **refused, not proven.** 100 of 200 reruns "
                      "passed. It failed 50 of 50 runs in the order where the unfixed code always failed.", self.body)
        self.assertIn("**refused as a band-aid** (ignore, line 220). It passed 200 of 200 reruns.", self.body)

    def test_without_an_order_that_always_failed_no_bound_is_claimed(self):
        runs = [run(o, True, "baseline") for o in ORDERS] + [run(o, True) for o in ORDERS for _ in range(50)]
        body = github.render_pr_body(ATTEMPT, FIX, "summary", runs, [])
        self.assertIn("no confidence bound is stated", body)
        self.assertNotIn("% at 95%", body)

    def test_bound_is_rounded_up(self):
        self.assertEqual(github.bound_percent(50), "6%")
        self.assertEqual(github.bound_percent(48), "6.3%")
        self.assertEqual(github.bound_percent(200), "1.5%")


if __name__ == "__main__":
    unittest.main()
