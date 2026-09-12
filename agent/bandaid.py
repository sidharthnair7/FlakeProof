"""Blade 2, deterministic half: is this patch a real fix or a mask?

A Thread.sleep(500) passes a 200-rerun harness and is exactly the fix developers reject. The
literature's reason roughly half of automated flaky-test fixes are rejected is that the standard
fix is a mask: sleeps, retries, @Ignore, widened timeouts, weakened assertions, pinned order,
fork isolation. This scanner finds those in a unified diff with no model involved, so the
refusal cannot depend on the model's mood on demo day. The model's opinion (agent/gate.py) is a
second, independent reader; the scanner alone is sufficient to refuse.

Only ADDED lines are judged, except for two accounting rules that compare removed to added:
assertions that vanish, and timeouts that grow.
"""
import re
from dataclasses import dataclass, field

CATEGORIES = {
    "sleep": "Sleeping hides a missing synchronisation or ordering guarantee. It passes until the machine is slower.",
    "retry": "Retrying masks a real failure and turns every regression into a coin flip.",
    "ignore": "Skipping the test removes the signal instead of the fault.",
    "timeout": "Widening a timeout treats a symptom; the wait it hides is still unbounded.",
    "order_pinning": "Pinning execution order preserves the shared-state bug and forbids anyone from ever reordering.",
    "isolation": "Forking per class hides the shared-state bug behind a fresh JVM and charges every test for it.",
    "assertion_weakening": "Removing or trivialising assertions makes the test pass by making it check less.",
    "swallow": "Catching the failure so the test cannot fail is the same as deleting the assertion.",
}

# (category, regex on an added line, human reason)
RULES: list[tuple[str, re.Pattern, str]] = [
    ("sleep", re.compile(r"\bThread\s*\.\s*sleep\s*\(|\bTimeUnit\s*\.\s*\w+\s*\.\s*sleep\s*\(|\bSystemClock\.sleep\(|\bObject\.wait\s*\(\s*\d+"),
     "adds a sleep"),
    ("retry", re.compile(r"@Retry\w*|\bRetryAnalyzer\b|rerunFailingTestsCount|@RepeatedTest|@Flaky\w*|\bRetryRule\b|\bretryOnFailure\b|\bFlakyTestRetry\b|<rerunFailingTestsCount>"),
     "adds a retry mechanism"),
    ("ignore", re.compile(r"@Ignore\b|@Disabled\b|@Skip\b|\bAssume\s*\.\s*assume\w*\s*\(|\bassumeTrue\s*\(|\bassumeFalse\s*\(|\bassumeThat\s*\(|<excludes>|<exclude>.*Test"),
     "skips or excludes the test"),
    ("order_pinning", re.compile(r"@FixMethodOrder|@TestMethodOrder|@Order\s*\(|\bMethodSorters\b|<runOrder>|surefire\.runOrder|\bdependsOnMethods\b|\bdependsOnGroups\b"),
     "pins the execution order"),
    ("isolation", re.compile(r"<reuseForks>\s*false|<forkCount>|<forkMode>|@DirtiesContext|reuseForks\s*=\s*false|forkCount\s*="),
     "isolates the test in its own JVM"),
    ("assertion_weakening", re.compile(r"assert(True|That)\s*\(\s*true\s*\)|assertFalse\s*\(\s*false\s*\)|assertEquals\s*\(\s*(\w+)\s*,\s*\2\s*\)|^\s*//\s*(assert|fail)\w*\s*\("),
     "trivialises an assertion"),
    ("swallow", re.compile(r"catch\s*\(\s*(final\s+)?(Throwable|AssertionError|Error|AssertionFailedError|Exception|RuntimeException)\b"),
     "catches the failure"),
]

_ASSERT_RX = re.compile(r"\b(assert\w*|fail)\s*\(")
_TIMEOUT_RX = re.compile(r"\btimeout\s*=\s*(\d+)|\.timeout\s*\(\s*(\d+)|atMost\s*\(\s*(\d+)|\bawait\s*\(\s*(\d+)")
_SWALLOW_RETHROW_RX = re.compile(r"\bthrow\b|\bfail\s*\(|\bassert\w*\s*\(|\brethrow\b|\bpropagate\b")


@dataclass
class Hit:
    category: str
    file: str
    line_no: int | None          # in the patched file, when derivable
    text: str
    reason: str

    def describe(self) -> str:
        where = f"{self.file}:{self.line_no}" if self.line_no else self.file
        return f"[{self.category}] {where}: {self.reason} -> {self.text.strip()}"


@dataclass
class Scan:
    hits: list[Hit] = field(default_factory=list)

    @property
    def is_bandaid(self) -> bool:
        return bool(self.hits)

    @property
    def primary(self) -> Hit | None:
        return self.hits[0] if self.hits else None

    def categories(self) -> list[str]:
        seen: list[str] = []
        for h in self.hits:
            if h.category not in seen:
                seen.append(h.category)
        return seen


def _parse_hunks(diff: str):
    """Yield (file, new_line_no|None, kind, text) for every diff line. kind is +, - or space."""
    file = ""
    new_no = None
    for raw in diff.splitlines():
        if raw.startswith("+++ "):
            file = raw[4:].strip()
            file = file[2:] if file.startswith("b/") else file
            continue
        if raw.startswith("--- ") or raw.startswith("diff ") or raw.startswith("index "):
            continue
        m = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", raw)
        if m:
            new_no = int(m.group(1))
            continue
        if not raw:
            continue
        kind, text = raw[0], raw[1:]
        if kind == "+":
            yield file, new_no, "+", text
            if new_no is not None:
                new_no += 1
        elif kind == "-":
            yield file, None, "-", text
        elif kind == " ":
            yield file, new_no, " ", text
            if new_no is not None:
                new_no += 1
        elif kind == "\\":
            continue


def scan_diff(diff: str) -> Scan:
    scan = Scan()
    lines = list(_parse_hunks(diff))
    added = [(f, n, t) for f, n, k, t in lines if k == "+"]
    removed = [(f, t) for f, _, k, t in lines if k == "-"]

    # Rule hits on added lines.
    for i, (file, no, text) in enumerate(added):
        stripped = text.strip()
        if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
            if not _ASSERT_RX.search(stripped):
                continue        # comments do not execute; commented-out asserts are handled below
        for category, rx, reason in RULES:
            if not rx.search(text):
                continue
            if category == "swallow" and _catch_rethrows(added, i):
                continue        # a catch that fails or rethrows is not a swallow
            if category == "assertion_weakening" and stripped.startswith("//"):
                reason = "comments out an assertion"
            scan.hits.append(Hit(category, file, no, text, reason))
            break

    # Accounting rule: assertions that vanish.
    for file in {f for f, _, _ in added} | {f for f, _ in removed}:
        n_removed = sum(1 for f, t in removed if f == file and _ASSERT_RX.search(t)
                        and not t.strip().startswith("//"))
        n_added = sum(1 for f, _, t in added if f == file and _ASSERT_RX.search(t)
                      and not t.strip().startswith("//"))
        if n_removed > n_added and not any(h.file == file and h.category == "assertion_weakening" for h in scan.hits):
            gone = next(t for f, t in removed if f == file and _ASSERT_RX.search(t))
            scan.hits.append(Hit("assertion_weakening", file, None, gone,
                                 f"removes {n_removed - n_added} assertion(s) without replacement"))

    # Accounting rule: timeouts that grow.
    old_timeouts = [int(next(g for g in m.groups() if g)) for _, t in removed for m in _TIMEOUT_RX.finditer(t)]
    for file, no, text in added:
        for m in _TIMEOUT_RX.finditer(text):
            new_val = int(next(g for g in m.groups() if g))
            if old_timeouts and new_val > min(old_timeouts):
                if not any(h.category == "timeout" for h in scan.hits):
                    scan.hits.append(Hit("timeout", file, no, text,
                                         f"widens a timeout from {min(old_timeouts)} to {new_val}"))
            elif not old_timeouts and new_val >= 1000 and "@Test" in text:
                scan.hits.append(Hit("timeout", file, no, text, "adds a timeout instead of a fix"))
    return scan


def _catch_rethrows(added, index: int, window: int = 4) -> bool:
    """True if the lines right after an added `catch` fail, assert or rethrow."""
    for _, _, text in added[index + 1: index + 1 + window]:
        if _SWALLOW_RETHROW_RX.search(text):
            return True
        if text.strip() == "}":
            return False
    return False


def explain(scan: Scan) -> str:
    if not scan.hits:
        return "No band-aid pattern found by the deterministic scanner."
    lines = [f"{len(scan.hits)} band-aid pattern(s) found:"]
    for h in scan.hits:
        lines.append("  " + h.describe())
        lines.append("      " + CATEGORIES.get(h.category, ""))
    return "\n".join(lines)
