"""Strands tools. Thin wrappers over the deterministic modules.

Every call is logged to the attempt's trace, so the dashboard shows what the agents actually
did rather than what the prompt asked them to do. The diagnosis tools are read-only plus two
JVM experiments (run alone, run after X). The repair tools edit the working tree and
snapshot candidates. The PR tool exists in exactly one agent and is guarded by a hook.

Examples in tool descriptions are deliberately generic. The model reads them, so they must
never name the classes, methods or fix of a real target.
"""
from strands import tool
from strands.types.tools import ToolContext

from agent import bandaid, db, harness, repo as repo_ops, session
from agent.schemas import CATEGORY_HELP

MAX_LINES = 400
CATEGORIES = ", ".join(CATEGORY_HELP)

# run_pair guards. The first agentic run spent 88 pairings sweeping classes one at a time.
RUN_PAIR_BUDGET = 12          # pairings per attempt, shared by the whole team
MAX_METHOD_SWEEP = 25         # methods pinned one by one when a class-level pairing passes


def _ctx() -> session.RunContext:
    return session.get()


def _resolve_class(ctx: session.RunContext, name: str) -> str | None:
    """Accept a simple or fully qualified test class name; return the fqcn."""
    if "." in name:
        return name
    for fqcn in repo_ops.list_test_classes(ctx.repo):
        if fqcn.rsplit(".", 1)[-1] == name:
            return fqcn
    return None


# ---- diagnosis (read-only + experiments) ----------------------------------------------------

@tool
def read_source(path: str, start: int = 1, end: int = 400) -> str:
    """Read a file from the target repository with line numbers.

    Args:
        path: Path relative to the repository root, e.g.
            src/test/java/com/example/cache/RegistryTest.java
        start: First line to return (1-based).
        end: Last line to return. At most 400 lines per call.
    """
    ctx = _ctx()
    try:
        text = repo_ops.read_file(ctx.repo, path)
    except (FileNotFoundError, ValueError, OSError) as exc:
        return f"error: {exc}"
    lines = text.splitlines()
    start = max(1, start)
    end = min(end, start + MAX_LINES - 1, len(lines))
    ctx.log("tool", "read_source", f"{path}:{start}-{end}")
    body = "\n".join(f"{i:5d}| {lines[i - 1]}" for i in range(start, end + 1))
    return f"{path} lines {start}-{end} of {len(lines)}\n{body}"


@tool
def search_code(pattern: str, where: str = "src") -> str:
    """Regex search over the project's Java sources. Returns up to 60 hits as path:line: text.

    Args:
        pattern: A regular expression, e.g. getInstance\\(\\) or clear|reset|remove
        where: Subdirectory to search: src, src/test/java or src/main/java
    """
    ctx = _ctx()
    try:
        hits = repo_ops.grep(ctx.repo, pattern, subdir=where)
    except Exception as exc:  # bad regex, missing dir
        return f"error: {exc}"
    ctx.log("tool", "search_code", f"/{pattern}/ in {where}: {len(hits)} hits")
    if not hits:
        return "no matches"
    return "\n".join(f"{p}:{n}: {t}" for p, n, t in hits)


@tool
def list_test_classes() -> str:
    """List every test class in the module as fully qualified names."""
    ctx = _ctx()
    classes = repo_ops.list_test_classes(ctx.repo)
    ctx.log("tool", "list_test_classes", f"{len(classes)} classes")
    return "\n".join(classes)


@tool
def failure_report() -> str:
    """The victim test's baseline: its pass rate under rotating test orders, and the failure
    message and stack trace from the last failing run. Read this before anything else."""
    ctx = _ctx()
    ctx.log("tool", "failure_report", "read")
    rate = (f"{ctx.baseline_passes}/{ctx.baseline_total} passes"
            if ctx.baseline_total else "baseline not measured")
    return (
        f"Victim: {ctx.test_name}\n"
        f"Source file: {repo_ops.fqcn_to_path(ctx.fqcn)}\n"
        f"Baseline: {rate} when the victim's class is run in the same JVM as other test classes of "
        f"this module under rotating Surefire orders (alphabetical, reverse, random, filesystem).\n"
        f"The victim passes when its class runs first. It fails when certain other tests run first.\n"
        f"Last failing run:\n{ctx.baseline_failure or '(no failure captured)'}"
    )


@tool
def run_victim_alone() -> str:
    """Run the victim's test class by itself in a fresh JVM and report the victim method's
    result. About 4 seconds. Use it to establish that the test passes in isolation."""
    ctx = _ctx()
    ran = harness.run_suite_once(ctx.repo, ctx.fqcn, "alphabetical", scope=None)
    result = harness.victim_result(ctx.repo, ctx.fqcn, ctx.method) if ran else None
    ctx.log("tool", "run_victim_alone", result.status if result else "did not run")
    if not result:
        return "the victim did not run (build problem?)"
    return f"{ctx.test_name} alone: {result.status.upper()} {result.message}".strip()


def _pair_once(ctx: session.RunContext, fqcn: str, selector: str, order: str):
    """One JVM: `selector` first, then the victim's class. Returns (victim result, first class's cases)."""
    stale = harness.report_path(ctx.repo, fqcn)
    if stale.exists():
        stale.unlink()                       # the first class's report must come from this run
    ran = harness.run_suite_once(ctx.repo, ctx.fqcn, order, scope=selector)
    victim = harness.victim_result(ctx.repo, ctx.fqcn, ctx.method) if ran else None
    first_ran = harness.read_report(ctx.repo, fqcn) if ran else None
    ctx.log("tool", "run_pair", f"{selector} before {ctx.victim_simple}: "
                                f"victim {victim.status if victim else 'did not run'}")
    return victim, first_ran


@tool
def run_pair(first: str) -> str:
    """Run one JVM in which `first` executes BEFORE the victim's class, then report the victim
    method's result. This confirms or refutes a polluter hypothesis with evidence: if the victim
    passes alone but fails after `first`, then `first` is the polluter. About 4 seconds per run.

    If `first` is a whole class and the victim still passes, the tool then pins each of that
    class's test methods first, one at a time (up to a minute). A class that resets shared state
    before each test leaves it dirty only after its last method, so a class-level pairing can
    hide the polluting method.

    The whole team has 12 pairings per attempt. Form a hypothesis from the failure and the source
    before spending one.

    Args:
        first: A test class (simple or fully qualified) or a Class#method selector, e.g.
            RegistryTest or RegistryTest#testRegisterCustomHandler
    """
    ctx = _ctx()
    if ctx.run_pair_calls >= RUN_PAIR_BUDGET:
        ctx.log("tool", "run_pair", f"refused: budget of {RUN_PAIR_BUDGET} pairings spent")
        return (f"refused: the team's {RUN_PAIR_BUDGET} pairings are spent. Reason from the evidence "
                f"you already have, record your hypothesis, then hand off or finish.")
    ctx.run_pair_calls += 1
    cls, _, meth = first.partition("#")
    fqcn = _resolve_class(ctx, cls.strip())
    if not fqcn:
        return f"error: no test class named {cls!r}"
    if fqcn == ctx.fqcn:
        return "error: that is the victim's own class"
    order = "alphabetical" if fqcn < ctx.fqcn else "reversealphabetical"
    simple = fqcn.rsplit(".", 1)[-1]
    meth = meth.strip()
    selector = f"{simple}#{meth}" if meth else simple

    victim, first_ran = _pair_once(ctx, fqcn, selector, order)
    if victim is None:
        return f"the victim did not run in this pairing (selector {selector!r}); check the class name"
    if not first_ran:
        return (f"{selector} produced no report, so it did not run first; the victim was "
                f"{victim.status.upper()} but that proves nothing about {selector}")
    result = (f"Ran {selector} ({len(first_ran)} test(s)) before {ctx.victim_simple} under {order} "
              f"order. Victim {ctx.method}: {victim.status.upper()} {victim.message}".strip())
    if meth or not victim.passed:
        return result

    # The class as a whole did not break the victim. Pin each method first in turn.
    methods = sorted(first_ran)[:MAX_METHOD_SWEEP]
    for name in methods:
        pinned, _ = _pair_once(ctx, fqcn, f"{simple}#{name}", order)
        if pinned is not None and not pinned.passed:
            return (f"{result}\nThe class as a whole did not break the victim, so its methods were "
                    f"pinned first one at a time. {simple}#{name} run first makes {ctx.method} "
                    f"{pinned.status.upper()}: {pinned.message}".strip())
    return (f"{result}\nNo single method of {simple} breaks the victim either "
            f"({len(methods)} pinned one at a time).")


@tool(context=True)
def record_hypothesis(category: str, confidence: float, summary: str, evidence: str,
                      tool_context: ToolContext) -> str:
    """Record a root-cause hypothesis together with the evidence for it. Call this once you have
    evidence, before handing off or finishing. Several agents may each record one.

    Args:
        category: one of order-dependent, async-wait, concurrency, unordered-collection, time,
            resource-leak, other
        confidence: 0 to 1
        summary: one or two sentences naming the cause
        evidence: the tool results and code lines that support it
    """
    ctx = _ctx()
    agent_name = getattr(getattr(tool_context, "agent", None), "name", "agent")
    category = category.strip().lower()
    if category not in CATEGORY_HELP:
        return f"error: category must be one of {CATEGORIES}"
    confidence = max(0.0, min(1.0, float(confidence)))
    hid = db.insert_hypothesis(ctx.conn, ctx.attempt_id, agent_name, category, confidence,
                               summary.strip(), evidence.strip())
    ctx.log("hypothesis", agent_name, f"[{category} {confidence:.2f}] {summary.strip()}")
    return f"hypothesis #{hid} recorded for {agent_name}"


@tool
def record_diagnosis(category: str, root_cause: str, polluter: str, mechanism: str,
                     fix_strategy: str, confidence: float) -> str:
    """Record the final diagnosis for this flaky test. Call exactly once.

    Args:
        category: one of order-dependent, async-wait, concurrency, unordered-collection, time,
            resource-leak, other
        root_cause: two to four sentences naming the shared state or race and who dirties it
        polluter: for order-dependent tests, the Surefire selector Class#method of the test that
            leaves the state dirty; otherwise an empty string
        mechanism: the exact chain: what runs first, what it leaves behind, what the victim reads
        fix_strategy: where the real fix belongs (polluter cleanup, victim setup, production
            code) and why a sleep, retry, skip or order pin would not be a fix
        confidence: 0 to 1
    """
    ctx = _ctx()
    category = category.strip().lower()
    if category not in CATEGORY_HELP:
        return f"error: category must be one of {CATEGORIES}"
    ctx.diagnosis = {
        "category": category, "root_cause": root_cause.strip(), "polluter": polluter.strip(),
        "mechanism": mechanism.strip(), "fix_strategy": fix_strategy.strip(),
        "confidence": max(0.0, min(1.0, float(confidence))),
    }
    fields = {"category": category, "root_cause": root_cause.strip()}
    if polluter.strip() and not ctx.polluter:
        ctx.polluter = polluter.strip()          # no recorded recipe: trust the diagnosis
        fields["polluter"] = ctx.polluter
    db.update(ctx.conn, "attempts", ctx.attempt_id, **fields)
    ctx.log("diagnosis", "synthesizer", ctx.diagnosis)
    return "diagnosis recorded"


# ---- repair ---------------------------------------------------------------------------------

@tool
def edit_file(path: str, old: str, new: str) -> str:
    """Replace one exact occurrence of `old` with `new` in a repository file.

    `old` must match exactly once, whitespace included; include enough surrounding lines to make
    it unique. To insert code, put the anchor lines in both `old` and `new`.

    Args:
        path: Path relative to the repository root.
        old: The exact text to replace.
        new: The replacement text.
    """
    ctx = _ctx()
    try:
        ok, msg = repo_ops.edit_file(ctx.repo, path, old, new)
    except ValueError as exc:
        return f"error: {exc}"
    ctx.log("tool", "edit_file", f"{path}: {msg}")
    return msg if ok else f"error: {msg}"


@tool
def compile_check() -> str:
    """Compile the project's main and test sources after editing. Returns ok, or the compiler's
    error tail. About 10 seconds."""
    ctx = _ctx()
    ok, tail = repo_ops.compile_tests(ctx.repo)
    ctx.log("tool", "compile_check", "ok" if ok else "FAILED")
    return "compiled ok" if ok else f"compile FAILED:\n{tail}"


@tool
def propose_candidate(title: str, rationale: str) -> str:
    """Snapshot the current working-tree changes as one candidate patch for the gate to judge,
    then reset the tree so the next candidate starts from the original code.

    Call once per distinct fix idea, after compile_check passes. The gate applies the patch,
    reruns the test 200 times under varied orders (Blade 1) and checks it is a real fix rather
    than a mask (Blade 2). You do not verify it yourself.

    Args:
        title: short imperative title, e.g. "Clear the shared cache after each CacheTest"
        rationale: why this removes the root cause rather than hiding the symptom
    """
    ctx = _ctx()
    patch = repo_ops.diff(ctx.repo)
    if not patch.strip():
        return "error: the working tree has no changes to snapshot"
    files = repo_ops.changed_files(ctx.repo)
    ctx.candidate_counter += 1
    cid = db.insert_candidate(ctx.conn, ctx.attempt_id, ctx.candidate_counter, "agent",
                              title.strip(), rationale.strip(), patch, files)
    scan = bandaid.scan_diff(patch)
    repo_ops.reset_worktree(ctx.repo)
    ctx.log("candidate", "repair", f"#{cid} {title.strip()} ({len(files)} file(s))")
    warning = ""
    if scan.is_bandaid:
        warning = (f"\nWarning: the deterministic scanner flags this as a band-aid: "
                   f"{scan.primary.describe()}. The gate will refuse it even if it passes every "
                   f"rerun. If you have a real fix, propose that as another candidate.")
    return f"candidate #{cid} recorded: {title.strip()} ({len(files)} file(s)). Working tree reset.{warning}"


# ---- the side effect --------------------------------------------------------------------------

@tool
def open_pull_request(title: str, summary: str) -> str:
    """Open the pull request for the candidate the gate VERIFIED. The evidence (baseline rate,
    both blades, rerun counts, confidence statement) is attached to the body automatically.

    Args:
        title: PR title, imperative, under 70 characters
        summary: two to four sentences for the maintainer: the root cause and why this fix is real
    """
    from agent import github   # late import: httpx only needed here

    ctx = _ctx()
    if ctx.verified_candidate_id is None:
        ctx.log("refusal", "gate", "open_pull_request called with no verified candidate")
        return "refused: no candidate has passed both blades, so there is nothing to propose"
    url, body_path = github.open_pr_for_attempt(ctx, title.strip(), summary.strip())
    if url:
        return f"pull request opened: {url}"
    return (f"pull request NOT opened (dry run or no GITHUB_TOKEN). The body was saved to "
            f"{body_path}.")
