"""The rerun harness. This is the product: everything else decorates it.

No LLM in this file, on purpose. If the harness lies, everything built on it is decoration.
"""
import os
import subprocess
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

from agent import db
from agent.config import JAVA_HOME, MVN, MVN_TIMEOUT_SECONDS

ORDERS = ["alphabetical", "reversealphabetical", "random", "filesystem"]


@dataclass
class RerunResult:
    test_name: str
    runs: int
    passes: int
    attempt_id: int

    @property
    def all_passed(self) -> bool:
        return self.runs > 0 and self.passes == self.runs

    @property
    def rate(self) -> float:
        return self.passes / self.runs if self.runs else 0.0

    def __str__(self) -> str:
        return f"{self.passes}/{self.runs} ({self.rate:.1%}) {self.test_name}"


def run_suite_once(repo: Path, fqcn: str, order: str, scope: str | None = None) -> bool:
    """Run the victim's class (plus `scope` if given) in one JVM under `order`.

    Returns whether mvn actually completed. The exit code is deliberately NOT the signal:
    mvn returns non-zero if ANY test in the class failed, which says nothing about our
    victim specifically. Read the Surefire report instead.
    """
    report = repo / "target" / "surefire-reports" / f"TEST-{fqcn}.xml"
    if report.exists():
        report.unlink()          # a stale report is the easiest way to fool yourself

    simple = fqcn.rsplit(".", 1)[-1]
    selector = f"{scope},{simple}" if scope else simple
    try:
        subprocess.run(
            [MVN, "-B", "test", f"-Dtest={selector}", f"-Dsurefire.runOrder={order}",
             "-Dmaven.test.failure.ignore=true", "-DfailIfNoSpecifiedTests=false"],
            cwd=repo,
            env={**os.environ, "JAVA_HOME": JAVA_HOME},
            capture_output=True, text=True, timeout=MVN_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return False
    return report.exists()


def victim_passed(repo: Path, fqcn: str, method: str) -> bool | None:
    """True/False if the method ran; None if it did not run at all."""
    report = repo / "target" / "surefire-reports" / f"TEST-{fqcn}.xml"
    if not report.exists():
        return None
    for case in ET.parse(report).getroot().iter("testcase"):
        if case.get("name") == method:
            return not any(c.tag in ("failure", "error") for c in case)
    return None


def rerun(repo: Path, fqcn: str, method: str, times: int,
          scope: str | None = None, phase: str = "before",
          attempt_id: int | None = None, quiet: bool = False) -> RerunResult:
    """Run the class `times` times under varied orders; count how often the victim passed."""
    conn = db.connect()
    if attempt_id is None:
        cur = conn.execute(
            "INSERT INTO attempts (test_name, verdict) VALUES (?, 'PENDING')",
            (f"{fqcn}#{method}",),
        )
        attempt_id = cur.lastrowid
        conn.commit()

    passes = 0
    for i in range(times):
        order = ORDERS[i % len(ORDERS)]
        ran = run_suite_once(repo, fqcn, order, scope)
        result = victim_passed(repo, fqcn, method) if ran else None
        ok = bool(result)
        passes += ok
        conn.execute(
            "INSERT INTO runs (attempt_id, seq, passed, test_order, phase) VALUES (?,?,?,?,?)",
            (attempt_id, i + 1, int(ok), order if ran else "DID_NOT_RUN", phase),
        )
        conn.commit()
        if not quiet:
            print(f"  [{i+1}/{times}] {'pass' if ok else 'FAIL'}  order={order}  "
                  f"running={passes}/{i+1}", flush=True)

    conn.close()
    return RerunResult(f"{fqcn}#{method}", times, passes, attempt_id)
