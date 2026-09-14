"""Blade 1's reading of results: the Surefire XML parser and the confidence statement."""
import unittest

from agent.harness import ORDERS, RerunResult, parse_report_xml

SUREFIRE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="net.sf.marineapi.ais.parser.AISMessageFactoryTest" tests="4" failures="1" errors="1" skipped="1">
  <testcase name="testCreate" classname="net.sf.marineapi.ais.parser.AISMessageFactoryTest" time="0.012"/>
  <testcase name="testCreateWithTwo" classname="net.sf.marineapi.ais.parser.AISMessageFactoryTest" time="0.003">
    <failure message="expected:&lt;5&gt; but was:&lt;1&gt;" type="java.lang.AssertionError">java.lang.AssertionError</failure>
  </testcase>
  <testcase name="testCreateWithIncorrectOrder" classname="net.sf.marineapi.ais.parser.AISMessageFactoryTest" time="0">
    <error message="Parser for type 'VDM' not found" type="net.sf.marineapi.nmea.parser.UnsupportedSentenceException">at SentenceFactory.createParserImpl(SentenceFactory.java:243)</error>
  </testcase>
  <testcase name="testSkipped" classname="net.sf.marineapi.ais.parser.AISMessageFactoryTest" time="0">
    <skipped message="quarantined"/>
  </testcase>
</testsuite>
"""


class SurefireReport(unittest.TestCase):
    def setUp(self):
        self.cases = parse_report_xml(SUREFIRE_XML)

    def test_statuses(self):
        self.assertEqual({n: c.status for n, c in self.cases.items()}, {
            "testCreate": "pass", "testCreateWithTwo": "fail",
            "testCreateWithIncorrectOrder": "error", "testSkipped": "skipped"})

    def test_skipped_is_not_a_pass(self):
        self.assertFalse(self.cases["testSkipped"].passed)

    def test_error_keeps_type_and_message(self):
        err = self.cases["testCreateWithIncorrectOrder"]
        self.assertEqual(err.kind, "net.sf.marineapi.nmea.parser.UnsupportedSentenceException")
        self.assertEqual(err.message, "Parser for type 'VDM' not found")


class ConfidenceStatement(unittest.TestCase):
    def test_all_passed_states_no_bound_over_runs_that_could_not_fail(self):
        line = RerunResult("T#m", runs=200, passes=200, attempt_id=1).confidence_line()
        self.assertIn("0 failures in 200 runs", line)
        self.assertNotIn("1.5%", line)
        self.assertIn("polluting test runs first", line)

    def test_any_failure_is_not_proven(self):
        line = RerunResult("T#m", runs=200, passes=197, attempt_id=1).confidence_line()
        self.assertIn("3 failure(s) in 200 runs", line)
        self.assertIn("Not proven", line)

    def test_orders_include_both_deterministic_directions(self):
        self.assertIn("alphabetical", ORDERS)
        self.assertIn("reversealphabetical", ORDERS)


if __name__ == "__main__":
    unittest.main()
