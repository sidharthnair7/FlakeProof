"""The rerun harness. This is the proof engine: everything else decorates it.

No LLM in this file, on purpose. If the harness lies, everything built on it is decoration,
and a harness that lies is the exact failure this project exists to prevent. Three rules:

  1. The Maven exit code is not the signal. mvn returns non-zero if ANY test in the class
     failed, which says nothing about the victim. The Surefire XML report is read instead.
  2. A stale report is deleted before every run, so an old file can never pose as a result.
  3. Skipped is not passed. @Ignore is the oldest band-aid there is; the harness counts it
     as a failure so the second blade cannot be dodged by the first.
"""
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from agent import db, repo as repo_ops
from agent.config import MVN_TIMEOUT_SECONDS

# Surefire's built-in run orders. For a pair of classes, alphabetical and reversealphabetical
# are the two deterministic orders; random and filesystem add the variation a real CI shows.
ORDERS = ["alphabetical", "reversealphabetical", "random", "filesystem"]

# What may reach -Dtest=: a test class (simple or fully qualified), optionally with #method.
# Selectors can come from an agent's tool call, and on Windows mvn.cmd runs through cmd.exe,
# where &, |, <, > and ^ would start or redirect a second command.
SELECTOR = re.compile(r"[\w.$]+(#[\w$]+)?")


def valid_selector(text: str) -> bool:
    return bool(SELECTOR.fullmatch(text))


@dataclass
class CaseResult:
    name: str
    status: str                 # pass | fail | error | skipped
    message: str = ""
    kind: str = ""              # exception type, if any
    trace: str = ""

    @property
    def passed(self) -> bool:
        return self.status == "pass"


@dataclass
class RerunResult:
    test_name: str
    runs: int
    passes: int
    attempt_id: int
    candidate_id: int | None = None
    failures: list[str] = field(default_factory=list)   # distinct failure messages seen

    @property
    def all_passed(self) -> bool:
        return self.runs > 0 and self.passes == self.runs

    @property
    def rate(self) -> float:
        return self.passes / self.runs if self.runs else 0.0

    def confidence_line(self) -> str:
        """What the runs show, without overreach.

        The rule of three (0 failures in N trials bounds the failure rate below 3/N at 95%) only
        counts trials that could have failed. Under rotating orders some runs put the victim's
        class first, where a leak cannot show, so no bound is stated over all N here. The pull
        request states one over the orders in which the unfixed code failed every baseline run."""
        if not self.runs:
            return "no runs"
        if self.all_passed:
            return (f"0 failures in {self.runs} runs under rotating orders. Only runs where the "
                    f"polluting test runs first can catch the leak, so a confidence bound belongs "
                    f"to those runs, not to all {self.runs}.")
        return (f"{self.runs - self.passes} failure(s) in {self.runs} runs "
                f"({self.rate:.1%} pass). Not proven.")

    def __str__(self) -> str:
        return f"{self.passes}/{self.runs} ({self.rate:.1%}) {self.test_name}"


def report_path(repo: Path, fqcn: str) -> Path:
    return repo / "target" / "surefire-reports" / f"TEST-{fqcn}.xml"


def read_report(repo: Path, fqcn: str) -> dict[str, CaseResult] | None:
    """Parse one Surefire XML. None if the report does not exist."""
    path = report_path(repo, fqcn)
    if not path.exists():
        return None
    return parse_report_xml(path.read_text(encoding="utf-8", errors="replace"))


def parse_report_xml(xml_text: str) -> dict[str, CaseResult]:
    out: dict[str, CaseResult] = {}
    for case in ET.fromstring(xml_text).iter("testcase"):
        name = case.get("name", "")
        status, message, kind, trace = "pass", "", "", ""
        for child in case:
            if child.tag in ("failure", "error"):
                status = "fail" if child.tag == "failure" else "error"
                message = child.get("message", "") or ""
                kind = child.get("type", "") or ""
                trace = (child.text or "").strip()
                break
            if child.tag == "skipped":
                status = "skipped"
                message = child.get("message", "") or "skipped"
                break
        out[name] = CaseResult(name, status, message, kind, trace)
    return out


def run_suite_once(repo: Path, fqcn: str, order: str, scope: str | None = None,
                   timeout: int = MVN_TIMEOUT_SECONDS, goal: str = "surefire:test") -> bool:
    """Run the victim's class (plus `scope`, e.g. the pinned polluter) in one JVM under `order`.

    Returns whether a report was produced. Uses `surefire:test` so the (already compiled)
    classes run without a compile phase; call repo.compile_tests() after changing sources.
    """
    simple = fqcn.rsplit(".", 1)[-1]
    selector = f"{scope},{simple}" if scope else simple
    unsafe = [part for part in selector.split(",") if not valid_selector(part)]
    if unsafe:
        raise ValueError(f"unsafe test selector {unsafe[0]!r}: only Class or Class#method may reach Maven")

    report = report_path(repo, fqcn)
    if report.exists():
        report.unlink()          # a stale report is the easiest way to fool yourself
    try:
        repo_ops.mvn(repo, goal, f"-Dtest={selector}", f"-Dsurefire.runOrder={order}",
                     "-Dmaven.test.failure.ignore=true", "-DfailIfNoSpecifiedTests=false",
                     timeout=timeout)
    except subprocess.TimeoutExpired:
        return False
    return report.exists()


def victim_result(repo: Path, fqcn: str, method: str) -> CaseResult | None:
    """The victim's result from the last run; None if it did not run at all."""
    cases = read_report(repo, fqcn)
    if not cases:
        return None
    return cases.get(method)


def rerun(repo: Path, fqcn: str, method: str, times: int, scope: str | None = None,
          phase: str = "baseline", attempt_id: int | None = None,
          candidate_id: int | None = None, quiet: bool = False,
          on_run: Callable[[int, bool, str], None] | None = None,
          conn=None) -> RerunResult:
    """Run the class `times` times under rotating orders; count how often the victim passed.

    Every run is written to SQLite as it happens, so the dashboard fills its grid live and a
    crash at run 137 still leaves 136 rows of evidence.
    """
    own_conn = conn is None
    conn = conn or db.connect()
    if attempt_id is None:
        attempt_id = db.insert_attempt(conn, f"{fqcn}#{method}", repo_path=str(repo),
                                       polluter=scope)

    passes = 0
    failures: list[str] = []
    for i in range(times):
        order = ORDERS[i % len(ORDERS)]
        t0 = time.time()
        ran = run_suite_once(repo, fqcn, order, scope)
        ms = int((time.time() - t0) * 1000)
        result = victim_result(repo, fqcn, method) if ran else None
        ok = bool(result and result.passed)
        passes += ok
        if not ran:
            failing = "DID_NOT_RUN (maven timeout or no report)"
        elif result is None:
            failing = "victim method not present in report"
        elif ok:
            failing = None
        else:
            failing = f"{result.status}: {result.message}"[:500]
            if failing not in failures:
                failures.append(failing)
        db.insert_run(conn, attempt_id, i + 1, ok, order if ran else "DID_NOT_RUN", phase,
                      candidate_id=candidate_id, failing=failing, duration_ms=ms)
        if on_run:
            on_run(i + 1, ok, order)
        if not quiet:
            print(f"  [{i + 1}/{times}] {'pass' if ok else 'FAIL'}  order={order:<20} "
                  f"running={passes}/{i + 1}  {ms}ms", flush=True)

    if own_conn:
        conn.close()
    return RerunResult(f"{fqcn}#{method}", times, passes, attempt_id, candidate_id, failures)
