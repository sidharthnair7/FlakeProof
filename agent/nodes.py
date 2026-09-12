"""Deterministic graph nodes: intake, the gate, and the refusal.

These are Strands MultiAgentBase nodes with no model inside. The Graph treats them like any other
node (inputs from predecessors, outputs to successors, hooks fire), which is the point: the
proof engine sits inside the same orchestration as the agents, and the agents cannot route
around it.
"""
import asyncio
import time
from typing import Any, Callable

from strands.agent.agent_result import AgentResult
from strands.multiagent.base import MultiAgentBase, MultiAgentResult, NodeResult, Status
from strands.telemetry.metrics import EventLoopMetrics

from agent import db, harness, repo as repo_ops, session
from agent.gate import judge_patch
from agent.models import model_available

VERDICT_HUMAN = {
    "VERIFIED": "verified",
    "REFUSED_UNPROVEN": "refused: not proven",
    "REFUSED_BANDAID": "refused: band-aid",
}


def _task_text(task: Any) -> str:
    if isinstance(task, str):
        return task
    parts = []
    for block in task or []:
        if isinstance(block, dict) and "text" in block:
            parts.append(block["text"])
    return "\n".join(parts)


class FunctionNode(MultiAgentBase):
    """Wrap a plain function (str -> str) as a graph node."""

    def __init__(self, node_id: str, fn: Callable[[str], str]) -> None:
        super().__init__()
        self.id = node_id
        self.name = node_id
        self._fn = fn

    async def invoke_async(self, task, invocation_state=None, **kwargs) -> MultiAgentResult:
        started = time.time()
        try:
            text = await asyncio.to_thread(self._fn, _task_text(task))
            status = Status.COMPLETED
        except Exception as exc:  # the graph marks the node failed; the error is recorded
            text = f"{self.id} failed: {exc}"
            status = Status.FAILED
            ctx = _safe_ctx()
            if ctx:
                ctx.log("error", self.id, str(exc))
        elapsed = int((time.time() - started) * 1000)
        agent_result = AgentResult(
            stop_reason="end_turn",
            message={"role": "assistant", "content": [{"text": text}]},
            metrics=EventLoopMetrics(),
            state={},
        )
        node_result = NodeResult(result=agent_result, execution_time=elapsed, status=status,
                                 execution_count=1)
        if status == Status.FAILED:
            raise RuntimeError(text)
        return MultiAgentResult(status=status, results={self.id: node_result},
                                execution_count=1, execution_time=elapsed)

    def __call__(self, task, **kwargs) -> MultiAgentResult:
        return asyncio.run(self.invoke_async(task, **kwargs))


def _safe_ctx() -> session.RunContext | None:
    try:
        return session.get()
    except RuntimeError:
        return None


# ---- intake ---------------------------------------------------------------------------------

def intake(_task: str = "") -> str:
    """Measure the baseline: how often does the victim pass before anyone touches the code?"""
    ctx = session.get()
    ctx.log("node", "intake", f"baseline: {ctx.baseline_runs} runs, scope={ctx.polluter or 'class alone'}")
    result = harness.rerun(ctx.repo, ctx.fqcn, ctx.method, ctx.baseline_runs, scope=ctx.polluter,
                           phase="baseline", attempt_id=ctx.attempt_id, conn=ctx.conn, quiet=True,
                           on_run=lambda i, ok, order: print(
                               f"  baseline [{i}/{ctx.baseline_runs}] {'pass' if ok else 'FAIL'} {order}",
                               flush=True))
    ctx.baseline_passes, ctx.baseline_total = result.passes, result.runs

    # Capture one full failure (message + trace) for the diagnosis agents.
    trace = ""
    orders = ["reversealphabetical", "random", "filesystem", "alphabetical"]
    for order in orders:
        if harness.run_suite_once(ctx.repo, ctx.fqcn, order, scope=ctx.polluter):
            victim = harness.victim_result(ctx.repo, ctx.fqcn, ctx.method)
            if victim and not victim.passed:
                trace = f"{victim.status} {victim.kind}: {victim.message}\n{victim.trace[:3000]}"
                break
    ctx.baseline_failure = trace or "\n".join(result.failures) or "(no failure reproduced)"
    ctx.log("baseline", "intake", f"{result.passes}/{result.runs} passed")
    return (f"BASELINE: {ctx.test_name} passed {result.passes}/{result.runs} runs under rotating "
            f"Surefire orders before any change. It is flaky. Failure seen:\n{ctx.baseline_failure[:1500]}")


# ---- the gate --------------------------------------------------------------------------------

def gate(_task: str = "") -> str:
    """Judge every pending candidate with both blades. Deterministic; the model is consulted only
    for a second opinion on Blade 2, and a deterministic scanner hit outranks it."""
    ctx = session.get()
    conn = ctx.conn

    # Planted candidates (developer-supplied patches) are judged after the agent's own.
    for plant in ctx.plants:
        ctx.candidate_counter += 1
        db.insert_candidate(conn, ctx.attempt_id, ctx.candidate_counter, "planted",
                            plant.title, plant.rationale, plant.diff, _files_in_diff(plant.diff))
    ctx.plants = []

    pending = db.rows(conn, "SELECT * FROM candidates WHERE attempt_id = ? AND verdict = 'PENDING'"
                            " ORDER BY ordinal", (ctx.attempt_id,))
    ctx.log("gate", "gate", f"{len(pending)} candidate(s) to judge, {ctx.reruns} reruns each")
    if not pending:
        db.update(conn, "attempts", ctx.attempt_id, verdict="REFUSED_UNPROVEN",
                  refusal_reason="No candidate patch was produced, so there is nothing to prove.")
        return "GATE_RESULT: REFUSED. No candidates were proposed."

    lines = []
    diagnosis_text = _diagnosis_context(ctx)
    for cand in pending:
        cid = cand["id"]
        ctx.log("gate", "gate", f"candidate #{cid} ({cand['source']}): {cand['title']}")
        repo_ops.reset_worktree(ctx.repo)

        ok, msg = repo_ops.apply_diff(ctx.repo, cand["diff"] or "")
        if not ok:
            _finish(conn, cid, "REFUSED_UNPROVEN", compiled=0,
                    compile_error=f"patch does not apply: {msg}")
            lines.append(f"- #{cid} {cand['title']}: refused, patch does not apply ({msg})")
            ctx.log("verdict", "gate", f"#{cid} REFUSED_UNPROVEN (does not apply)")
            continue

        ok, tail = repo_ops.compile_tests(ctx.repo)
        if not ok:
            _finish(conn, cid, "REFUSED_UNPROVEN", compiled=0, compile_error=tail)
            repo_ops.reset_worktree(ctx.repo)
            lines.append(f"- #{cid} {cand['title']}: refused, does not compile")
            ctx.log("verdict", "gate", f"#{cid} REFUSED_UNPROVEN (compile failed)")
            continue
        db.update(conn, "candidates", cid, compiled=1)

        # Blade 2: real fix or mask? Deterministic scanner first, model second.
        b2 = judge_patch(cand["diff"], context=diagnosis_text, use_model=model_available())
        db.update(conn, "candidates", cid, blade2_verdict=b2.verdict, blade2_category=b2.category,
                  blade2_reason=b2.reason, blade2_line=b2.line, blade2_line_no=b2.line_no,
                  blade2_file=b2.file)
        ctx.log("blade2", "gate", f"#{cid} {b2.verdict} {b2.category or ''}: {b2.reason[:300]}")
        print(f"  blade 2 #{cid}: {b2.verdict} {b2.category or ''}", flush=True)

        # Blade 1: does it hold under N reruns? Measured even for band-aids, unless fast_refuse,
        # so the refusal can say "it passed every run and we are refusing anyway".
        runs = passes = 0
        confidence = ""
        if not (b2.verdict == "BANDAID" and ctx.fast_refuse):
            res = harness.rerun(ctx.repo, ctx.fqcn, ctx.method, ctx.reruns, scope=ctx.polluter,
                                phase="verify", attempt_id=ctx.attempt_id, candidate_id=cid,
                                conn=conn, quiet=True,
                                on_run=lambda i, ok_, order, _cid=cid: print(
                                    f"  verify #{_cid} [{i}/{ctx.reruns}] {'pass' if ok_ else 'FAIL'} {order}",
                                    flush=True))
            runs, passes, confidence = res.runs, res.passes, res.confidence_line()
            db.update(conn, "candidates", cid, blade1_runs=runs, blade1_passes=passes)
            ctx.log("blade1", "gate", f"#{cid} {passes}/{runs}")

        if b2.verdict == "BANDAID":
            verdict = "REFUSED_BANDAID"
        elif runs and passes == runs:
            verdict = "VERIFIED"
        else:
            verdict = "REFUSED_UNPROVEN"
        _finish(conn, cid, verdict)
        repo_ops.reset_worktree(ctx.repo)
        ctx.log("verdict", "gate", f"#{cid} {verdict}")
        print(f"  verdict #{cid}: {verdict}", flush=True)
        lines.append(f"- #{cid} [{cand['source']}] {cand['title']}: {VERDICT_HUMAN[verdict]}; "
                     f"Blade 1 {passes}/{runs}; Blade 2 {b2.verdict}"
                     + (f" ({b2.category}: {b2.reason[:160]})" if b2.verdict == "BANDAID" else "")
                     + (f". {confidence}" if confidence else ""))

    # Leave the tree compiled and clean for whatever runs next.
    repo_ops.compile_tests(ctx.repo)

    verified = db.rows(conn, "SELECT id, title FROM candidates WHERE attempt_id = ? AND verdict = 'VERIFIED'"
                             " ORDER BY ordinal LIMIT 1", (ctx.attempt_id,))
    if verified:
        ctx.verified_candidate_id = verified[0]["id"]
        db.update(conn, "attempts", ctx.attempt_id, verdict="VERIFIED", refusal_reason=None)
        head = (f"GATE_RESULT: VERIFIED candidate #{verified[0]['id']} ({verified[0]['title']}). "
                f"Open the pull request for it.")
    else:
        all_c = db.rows(conn, "SELECT verdict FROM candidates WHERE attempt_id = ?", (ctx.attempt_id,))
        bandaid_only = all(c["verdict"] == "REFUSED_BANDAID" for c in all_c)
        verdict = "REFUSED_BANDAID" if bandaid_only else "REFUSED_UNPROVEN"
        reason = "\n".join(lines)
        db.update(conn, "attempts", ctx.attempt_id, verdict=verdict, refusal_reason=reason)
        head = "GATE_RESULT: REFUSED. No candidate passed both blades."
    return head + "\n" + "\n".join(lines)


def _finish(conn, cid: int, verdict: str, **fields) -> None:
    db.update(conn, "candidates", cid, verdict=verdict, finished_at=db.now(), **fields)


def _files_in_diff(diff: str) -> list[str]:
    files = []
    for line in diff.splitlines():
        if line.startswith("+++ "):
            f = line[4:].strip()
            files.append(f[2:] if f.startswith("b/") else f)
    return files


def _diagnosis_context(ctx: session.RunContext) -> str:
    d = ctx.diagnosis
    if not d:
        return f"Flaky test {ctx.test_name}; reproduction scope: {ctx.polluter or 'unknown'}."
    return (f"Flaky test {ctx.test_name}. Category: {d.get('category')}. Root cause: "
            f"{d.get('root_cause')} Mechanism: {d.get('mechanism')} Fix strategy: {d.get('fix_strategy')}")


# ---- refusal ---------------------------------------------------------------------------------

def refuse(_task: str = "") -> str:
    ctx = session.get()
    row = db.rows(ctx.conn, "SELECT verdict, refusal_reason FROM attempts WHERE id = ?",
                  (ctx.attempt_id,))[0]
    statement = (
        f"REFUSED to open a pull request for {ctx.test_name}.\n"
        f"Verdict: {row['verdict']}.\n{row['refusal_reason'] or ''}\n"
        f"Flakeproof does not propose a fix it has not proven, and does not propose a mask even "
        f"when the mask passes every rerun."
    )
    ctx.log("refusal", "gate", statement[:1500])
    print(statement, flush=True)
    return statement
