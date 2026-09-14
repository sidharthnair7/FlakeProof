"""The repair pipeline as a Strands Graph.

    intake ──> diagnose (Swarm) ──> synthesize ──> repair ──> gate ──┬──> open_pr
      det.       4 agents           agent          agent      det.   └──> refuse (det.)

Deterministic nodes measure and judge; agents hypothesise, diagnose and write. The edge out of
the gate is conditional on the gate's own verdict, and the PR tool exists only inside open_pr,
so the agents cannot reach the side effect without passing the proof engine. A hook re-checks
the verdict at the moment of the call. Topology and hook are two independent locks.

With --no-agent, or without a model (FLAKEPROOF_PROVIDER=none), the same deterministic nodes run
in sequence on planted candidates. That path exists so the proof engine can be exercised and
demonstrated with no agents at all, and the run says so in its mode line.
"""
from pathlib import Path

from agent import db, github, repo as repo_ops, session
from agent.config import BASELINE_RUNS, DEFAULT_RERUNS, WORKDIR
from agent.models import describe_model, make_model, model_available
from agent.targets import TARGETS, Target

SYNTH_PROMPT = """You are the synthesizer. You receive the diagnosis team's findings for one flaky
test. Weigh the recorded hypotheses by their evidence, resolve disagreements, and call
record_diagnosis exactly once with the final category, root cause, polluter (Class#method for
order-dependent tests, else empty), mechanism and fix strategy. If you need one more look at a
source file to be precise, use read_source. Then reply with a short plain-text diagnosis for the
repair agent: category, mechanism, the exact file and method where the fix belongs, and why a
sleep, retry, skip, order pin or fork isolation would be a mask rather than a fix."""

REPAIR_PROMPT = """You are the repair agent. You receive a diagnosis of one flaky test and you
write the fix. Work in the repository with read_source, search_code and edit_file, run
compile_check, then call propose_candidate to hand the patch to the gate. Propose your best fix
first. If there is a second, genuinely different real fix (for example fixing the polluter's
cleanup versus making the victim robust), propose it as a second candidate. At most three.

The gate refuses masks: Thread.sleep, retries, @Ignore/@Disabled/assume*, widened timeouts,
pinned execution order, fork isolation, weakened or swallowed assertions. It refuses them even
when they pass every rerun. Fix the cause: for order-dependent tests that usually means the test
that dirties shared state must restore it (an @After that resets), or the victim must not depend
on it. Keep the change minimal and idiomatic for the project's JUnit version. Do not modify
production code unless the diagnosis says the race is there.

You do not verify the fix yourself; the gate reruns it 200 times and judges it. When you have
proposed your candidate(s), reply with one line per candidate: the title and why it is a real
fix."""

PR_PROMPT = """You write the pull request for a fix that the gate has VERIFIED. You receive the
gate's report. Write a title (imperative, under 70 characters) and a summary of two to four
sentences for the maintainer: what the shared state or race was, which test left it dirty, and
why this change removes the cause. Then call open_pull_request exactly once with them. The
evidence table is attached automatically; do not restate the numbers."""


def resolve_target(name: str) -> tuple[Target, Path]:
    if name not in TARGETS:
        raise SystemExit(f"unknown target {name!r}; known: {', '.join(TARGETS)}")
    target = TARGETS[name]
    return target, WORKDIR / target.dirname


def check_repo_ready(target: Target, repo: Path) -> str:
    if not (repo / ".git").exists():
        raise SystemExit(f"{repo} is not cloned. Run: python -m agent prepare --target {target.name}")
    head = repo_ops.head_sha(repo)
    expected = repo_ops.rev_parse(repo, target.fix_commit + "^")
    if head != expected:
        raise SystemExit(f"{repo} is at {head[:10]}, expected {expected[:10]} (fix commit's parent). "
                         f"Run: python -m agent prepare --target {target.name}")
    return head


def mode_label(use_agent: bool) -> str:
    """How a run works, stated precisely: a no-agent run can still ask a model for Blade 2's opinion."""
    if use_agent and model_available():
        return f"agents ({describe_model()})"
    if model_available():
        return f"no agents; planted candidates only; band-aid judge on {describe_model()}"
    return "no agents and no model; planted candidates only"


def build_graph(ctx: session.RunContext):
    from strands import Agent
    from strands.multiagent import GraphBuilder

    from agent.hooks import RefusalGuard, TraceHooks
    from agent.nodes import FunctionNode, gate, intake, refuse
    from agent.swarm import build_diagnosis_swarm
    from agent.tools import (compile_check, edit_file, failure_report, open_pull_request,
                             propose_candidate, read_source, record_diagnosis, search_code)

    model = make_model()
    trace = TraceHooks()
    diagnose = build_diagnosis_swarm(model, hooks=[trace])
    synthesize = Agent(name="synthesizer", description="Merges the team's hypotheses into one diagnosis",
                       model=model, system_prompt=SYNTH_PROMPT,
                       tools=[record_diagnosis, read_source], hooks=[trace], callback_handler=None)
    repair = Agent(name="repair", description="Writes candidate patches for the gate to judge",
                   model=model, system_prompt=REPAIR_PROMPT,
                   tools=[read_source, search_code, failure_report, edit_file, compile_check,
                          propose_candidate],
                   hooks=[trace], callback_handler=None)
    pr_writer = Agent(name="pr_writer", description="Opens the PR for a verified fix",
                      model=model, system_prompt=PR_PROMPT, tools=[open_pull_request],
                      hooks=[trace, RefusalGuard()], callback_handler=None)

    b = GraphBuilder()
    b.add_node(FunctionNode("intake", intake), "intake")
    b.add_node(diagnose, "diagnose")
    b.add_node(synthesize, "synthesize")
    b.add_node(repair, "repair")
    b.add_node(FunctionNode("gate", gate), "gate")
    b.add_node(pr_writer, "open_pr")
    b.add_node(FunctionNode("refuse", refuse), "refuse")
    b.add_edge("intake", "diagnose")
    b.add_edge("diagnose", "synthesize")
    b.add_edge("synthesize", "repair")
    b.add_edge("repair", "gate")
    b.add_edge("gate", "open_pr", condition=lambda state: session.get().verified_candidate_id is not None)
    b.add_edge("gate", "refuse", condition=lambda state: session.get().verified_candidate_id is None)
    b.set_entry_point("intake")
    b.set_execution_timeout(8 * 3600)
    b.set_node_timeout(6 * 3600)
    b.set_hook_providers([trace])
    return b.build()


def context_for_attempt(conn, attempt_id: int, open_prs: bool = True) -> session.RunContext:
    """Rebuild the run context of a finished attempt, to open its pull request without rerunning."""
    found = db.rows(conn, "SELECT * FROM attempts WHERE id = ?", (attempt_id,))
    if not found:
        raise SystemExit(f"no attempt #{attempt_id} in the database")
    attempt = found[0]
    verified = db.rows(conn, "SELECT id FROM candidates WHERE attempt_id = ? AND verdict = 'VERIFIED'"
                             " ORDER BY ordinal LIMIT 1", (attempt_id,))
    if not verified:
        raise SystemExit(f"attempt #{attempt_id} has no VERIFIED candidate. "
                         f"Flakeproof opens pull requests only for fixes the gate verified.")

    fqcn, _, method = attempt["test_name"].partition("#")
    ctx = session.RunContext(attempt_id=attempt_id, repo=Path(attempt["repo_path"] or ""), fqcn=fqcn,
                             method=method, polluter=attempt["polluter"], conn=conn,
                             project_url=attempt["project_url"] or "", open_prs=open_prs)
    baseline = db.runs_for(conn, attempt_id, phase="baseline")
    ctx.baseline_total = len(baseline)
    ctx.baseline_passes = sum(r["passed"] for r in baseline)
    ctx.verified_candidate_id = verified[0]["id"]

    if open_prs:   # the pull request's base is the target's HEAD, so it must still be the fix's parent
        target = next((t for t in TARGETS.values()
                       if t.repo_url.rstrip("/") == ctx.project_url.rstrip("/")), None)
        if target:
            check_repo_ready(target, ctx.repo)
    return ctx


def run(target_name: str, victim: str | None = None, reruns: int = DEFAULT_RERUNS,
        baseline_runs: int = BASELINE_RUNS, plants=None, use_agent: bool = True,
        fast_refuse: bool = False, open_prs: bool = True) -> int:
    """Run the whole pipeline for one target. Returns the attempt id."""
    target, repo = resolve_target(target_name)
    sha = check_repo_ready(target, repo)
    if not repo_ops.is_clean(repo):
        print("  working tree was dirty; resetting", flush=True)
        repo_ops.reset_worktree(repo)
    ok, tail = repo_ops.compile_tests(repo)
    if not ok:
        raise SystemExit(f"target does not compile:\n{tail}")

    fqcn, method = target.victim(victim)
    db.init()
    conn = db.connect()
    attempt_id = db.insert_attempt(conn, f"{fqcn}#{method}", project_url=target.repo_url,
                                   repo_path=str(repo), sha=sha, polluter=target.polluter)
    ctx = session.start(session.RunContext(
        attempt_id=attempt_id, repo=repo, fqcn=fqcn, method=method, polluter=target.polluter,
        conn=conn, project_url=target.repo_url, reruns=reruns, baseline_runs=baseline_runs,
        plants=list(plants or []), fast_refuse=fast_refuse, open_prs=open_prs))

    agentic = use_agent and model_available()
    mode = mode_label(use_agent)
    ctx.log("info", "pipeline", f"start attempt #{attempt_id} {ctx.test_name} mode={mode} "
                                f"reruns={reruns} baseline={baseline_runs} plants={len(ctx.plants)}")
    print(f"attempt #{attempt_id}: {ctx.test_name}\n  mode: {mode}", flush=True)

    try:
        if agentic:
            graph = build_graph(ctx)
            result = graph(f"Diagnose and repair the flaky test {ctx.test_name} in "
                           f"{target.repo_url} at commit {sha[:10]}.")
            order = " -> ".join(n.node_id for n in result.execution_order)
            ctx.log("info", "pipeline", f"graph finished {result.status.value}: {order}")
        else:
            from agent.nodes import gate, intake, refuse
            intake("")
            gate("")
            if ctx.verified_candidate_id is not None:
                cand = db.rows(conn, "SELECT title, rationale FROM candidates WHERE id = ?",
                               (ctx.verified_candidate_id,))[0]
                try:
                    github.open_pr_for_attempt(ctx, cand["title"], cand["rationale"] or cand["title"])
                except Exception as exc:  # the verdicts are already recorded; only the side effect failed
                    message = f"pull request not opened: {exc}"[:2000]
                    ctx.log("error", "github", message)
                    db.update(conn, "attempts", attempt_id, error=message)
                    print(f"  {message}\n  retry without rerunning: python -m agent pr --attempt {attempt_id}",
                          flush=True)
            else:
                refuse("")
        db.update(conn, "attempts", attempt_id, status="DONE", finished_at=db.now())
    except BaseException as exc:
        db.update(conn, "attempts", attempt_id, status="FAILED", error=str(exc)[:2000],
                  finished_at=db.now())
        ctx.log("error", "pipeline", str(exc)[:2000])
        raise
    finally:
        try:
            repo_ops.reset_worktree(repo)
        except Exception:
            pass
        session.clear()
        conn.close()
    return attempt_id
