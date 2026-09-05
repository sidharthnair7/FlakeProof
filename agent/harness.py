"""The rerun harness. This is the product: everything else decorates it.

Day 1 rule: no LLM in this file. If the harness lies, everything built on it is decoration.
"""
import subprocess
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

from agent.config import JAVA_HOME, MVN_TIMEOUT_SECONDS


@dataclass
class RerunResult:
    test_name: str
    runs: int
    passes: int

    @property
    def all_passed(self) -> bool:
        return self.passes == self.runs

    @property
    def rate(self) -> float:
        return self.passes / self.runs if self.runs else 0.0


def run_class_once(repo: Path, fqcn: str, seed: int) -> None:
    """Run one whole test class in a shuffled order.

    Deliberately ignores the exit code: mvn returns non-zero if ANY test in the class failed,
    which does not tell us about our victim specifically. Read the Surefire report instead.

    TODO: build the mvn arg list, set cwd=repo, env JAVA_HOME, capture_output, text, timeout.
    TODO: catch subprocess.TimeoutExpired and let it count as a failure upstream.
    """
    raise NotImplementedError


def victim_passed(repo: Path, fqcn: str, method: str) -> bool:
    """Look up one method's result in target/surefire-reports/TEST-<fqcn>.xml."""
    xml_path = repo / "target" / "surefire-reports" / f"TEST-{fqcn}.xml"
    if not xml_path.exists():
        return False
    for case in ET.parse(xml_path).iter("testcase"):
        if case.get("name") == method:
            return not any(child.tag in ("failure", "error") for child in case)
    return False


def rerun(repo: Path, fqcn: str, method: str, times: int) -> RerunResult:
    """Run the class `times` times in varied orders; count how often the victim passed.

    TODO: loop, call run_class_once then victim_passed, tally, write each run to db.
    """
    raise NotImplementedError
