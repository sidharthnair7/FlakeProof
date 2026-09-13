"""Blade 2, deterministic half. No JVM and no model: these run in well under a second."""
import unittest
from pathlib import Path

from agent.__main__ import _load_plants
from agent.bandaid import scan_diff

CANDIDATES = Path(__file__).resolve().parent.parent / "demo" / "candidates"


def patch(added=(), removed=(), path="src/test/java/FooTest.java"):
    """A one-hunk unified diff with the given removed and added lines."""
    body = [f"-{line}" for line in removed] + [f"+{line}" for line in added]
    return (f"--- a/{path}\n+++ b/{path}\n@@ -10,{len(removed)} +10,{len(added)} @@\n"
            + "\n".join(body) + "\n")


def categories(diff):
    return scan_diff(diff).categories()


class MasksAreRefused(unittest.TestCase):
    def test_sleep(self):
        self.assertEqual(categories(patch(["        Thread.sleep(500);"])), ["sleep"])

    def test_ignore(self):
        self.assertEqual(categories(patch(["    @Ignore"])), ["ignore"])

    def test_order_pinning(self):
        self.assertEqual(categories(patch(["@FixMethodOrder(MethodSorters.NAME_ASCENDING)"])),
                         ["order_pinning"])

    def test_fork_isolation(self):
        diff = patch(["          <reuseForks>false</reuseForks>"], path="pom.xml")
        self.assertEqual(categories(diff), ["isolation"])

    def test_retry(self):
        diff = patch(["          <rerunFailingTestsCount>3</rerunFailingTestsCount>"], path="pom.xml")
        self.assertEqual(categories(diff), ["retry"])

    def test_swallowed_assertion(self):
        diff = patch(["        try {", "            assertEquals(1, x);",
                      "        } catch (AssertionError e) {", "        }"])
        self.assertEqual(categories(diff), ["swallow"])

    def test_removed_assertion(self):
        self.assertEqual(categories(patch(removed=["        assertEquals(1, x);"])),
                         ["assertion_weakening"])

    def test_widened_timeout(self):
        diff = patch(added=["    @Test(timeout = 5000)"], removed=["    @Test(timeout = 100)"])
        self.assertEqual(categories(diff), ["timeout"])


class RealFixesAreNotFlagged(unittest.TestCase):
    def test_after_reset(self):
        diff = patch(["    @After", "    public void tearDown() {", "        instance.reset();", "    }"])
        self.assertEqual(categories(diff), [])

    def test_catch_that_rethrows(self):
        diff = patch(["        try {", "            doWork();", "        } catch (Exception e) {",
                      "            throw new IllegalStateException(e);", "        }"])
        self.assertEqual(categories(diff), [])

    def test_comment_mentioning_sleep(self):
        self.assertEqual(categories(patch(["        // never Thread.sleep here"])), [])


class DemoCandidates(unittest.TestCase):
    """The three planted patches the demo runs. Blade 2's scanner must see exactly one mask."""

    @classmethod
    def setUpClass(cls):
        plants = _load_plants([str(CANDIDATES / "*.diff")])
        cls.by_file = dict(zip(sorted(p.name for p in CANDIDATES.glob("*.diff")), plants))

    def test_titles_are_parsed_from_the_header(self):
        for name, plant in self.by_file.items():
            self.assertNotEqual(plant.title, Path(name).stem, f"{name} lost its # title: line")
            self.assertTrue(plant.rationale, f"{name} lost its # rationale: line")
            self.assertTrue(plant.diff.startswith("diff --git"), name)

    def test_wrong_class_restore_is_not_a_mask(self):
        self.assertEqual(scan_diff(self.by_file["01-restore-wrong-vdmparser.diff"].diff).hits, [])

    def test_ignore_on_the_polluter_is_a_mask(self):
        hit = scan_diff(self.by_file["02-ignore-polluter.diff"].diff).primary
        self.assertEqual((hit.category, hit.line_no), ("ignore", 220))

    def test_upstream_after_reset_is_not_a_mask(self):
        self.assertEqual(scan_diff(self.by_file["03-after-reset.diff"].diff).hits, [])


if __name__ == "__main__":
    unittest.main()
