"""Find which other test makes a victim test fail.

An order-dependent "victim" passes alone and fails when some "polluter" runs first and
leaves shared state dirty. IDoFT tells us the victim but NOT the polluter, so we find it
empirically: run [candidate, victim] and see whether the victim survives.

Controlling order in Surefire is the fiddly part. Surefire has no "run these in this exact
order" flag, but it does have alphabetical / reversealphabetical -- and for any PAIR of
classes, one of those two puts the candidate first. That is deterministic and enough.
"""
import subprocess
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

from agent.config import JAVA_HOME, MVN


@dataclass
class Victim:
    fqcn: str        # com.j256.ormlite.dao.RuntimeExceptionDaoTest
    method: str      # testCloseLastIteratorThrow

    @property
    def simple(self) -> str:
        return self.fqcn.rsplit(".", 1)[-1]


def test_classes(repo: Path) -> list[str]:
    """Every test class in the module, as fully-qualified names."""
    root = repo / "src" / "test" / "java"
    out = []
    for p in root.rglob("*Test.java"):
        out.append(str(p.relative_to(root)).replace("\\", "/")[:-5].replace("/", "."))
    return sorted(out)


def run_pair(repo: Path, candidate: str, victim: Victim, timeout: int = 300):
    """Run candidate then victim in one JVM. Returns (victim_passed, ran_at_all)."""
    # pick the ordering that puts the candidate FIRST
    order = "alphabetical" if candidate < victim.fqcn else "reversealphabetical"
    cand_simple = candidate.rsplit(".", 1)[-1]

    report = repo / "target" / "surefire-reports" / f"TEST-{victim.fqcn}.xml"
    if report.exists():
        report.unlink()          # never trust a stale report

    try:
        subprocess.run(
            [MVN, "-B", "test",
             f"-Dtest={cand_simple},{victim.simple}",
             f"-Dsurefire.runOrder={order}",
             "-Dmaven.test.failure.ignore=true",
             "-DfailIfNoSpecifiedTests=false"],
            cwd=repo,
            env={**__import__("os").environ, "JAVA_HOME": JAVA_HOME},
            capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return False, False

    if not report.exists():
        return False, False

    for case in ET.parse(report).getroot().iter("testcase"):
        if case.get("name") == victim.method:
            failed = any(c.tag in ("failure", "error") for c in case)
            return (not failed), True
    return False, False


def find(repo: Path, victim: Victim, candidates: list[str]) -> list[str]:
    """Return every candidate that makes the victim fail."""
    found, skipped = [], 0
    for i, cand in enumerate(candidates, 1):
        if cand == victim.fqcn:
            continue
        passed, ran = run_pair(repo, cand, victim)
        if not ran:
            skipped += 1
            status = "skip"
        elif passed:
            status = "ok"
        else:
            status = "*** POLLUTER ***"
            found.append(cand)
        print(f"[{i}/{len(candidates)}] {status:16} {cand}", flush=True)
    print(f"\ndone. polluters={len(found)} skipped={skipped}")
    return found


if __name__ == "__main__":
    repo = Path(sys.argv[1])
    victim = Victim(fqcn=sys.argv[2], method=sys.argv[3])
    cands = test_classes(repo)
    print(f"{len(cands)} candidate test classes\n")
    find(repo, victim, cands)
