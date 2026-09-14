"""Flakeproof CLI.

    python -m agent initdb
    python -m agent status
    python -m agent prepare --target marine-api
    python -m agent run --target marine-api [--victim Class#method] [--reruns 200] [--baseline 20]
                        [--plant demo/candidates/*.diff] [--no-agent] [--fast-refuse] [--no-pr]
    python -m agent pr --attempt N [--dry-run]  # open the PR for an already VERIFIED attempt
    python -m agent gate PATCH.diff            # judge one patch, no JVM
    python -m agent verify <repo> <fqcn#method> [--times N] [--scope Class#method]
    python -m agent findpolluter <repo> <fqcn#method>
    python -m agent export [--out data/replay.json]
"""
import argparse
import glob
import json
import sys
from pathlib import Path

from agent import db


def _load_plants(patterns: list[str]):
    """A planted patch is a .diff file with optional leading `# title:` / `# rationale:` lines."""
    from agent.session import PlantedPatch
    plants = []
    for pattern in patterns:
        for path in sorted(glob.glob(pattern)):
            text = Path(path).read_text(encoding="utf-8")
            title, rationale, body = Path(path).stem, "", []
            for line in text.splitlines(keepends=True):
                if not body and line.startswith("# title:"):
                    title = line.split(":", 1)[1].strip()
                elif not body and line.startswith("# rationale:"):
                    rationale = line.split(":", 1)[1].strip()
                elif not body and line.startswith("#"):
                    continue
                else:
                    body.append(line)
            plants.append(PlantedPatch(title=title, rationale=rationale, diff="".join(body)))
    return plants


def cmd_status(_args) -> None:
    conn = db.connect()
    t = db.tally(conn)
    print(f"{t['attempted']} candidates judged: {t['verified']} verified, {t['refused']} refused "
          f"({t['refused_unproven']} unproven, {t['refused_bandaid']} band-aid), {t['pending']} pending. "
          f"{t['attempts']} attempts, {t['prs']} PRs, {t['runs']} JVM runs.")
    for a in db.list_attempts(conn):
        base = f"{a['baseline_passes']}/{a['baseline_runs']}" if a["baseline_runs"] else "-"
        print(f"  #{a['id']:<3} {a['status']:<7} {a['verdict']:<16} baseline {base:>7}  "
              f"{a['n_candidates']} cand  {a['test_name']}  {a['pr_url'] or ''}")


def cmd_prepare(args) -> None:
    import subprocess

    from agent import repo as repo_ops
    from agent.config import WORKDIR
    from agent.pipeline import resolve_target

    target, repo = resolve_target(args.target)
    WORKDIR.mkdir(exist_ok=True)
    if not (repo / ".git").exists():
        print(f"cloning {target.repo_url} -> {repo}")
        subprocess.run(["git", "clone", "-q", target.repo_url, str(repo)], check=True)
    parent = repo_ops.rev_parse(repo, target.fix_commit + "^")
    if repo_ops.head_sha(repo) != parent:
        print(f"checking out {parent[:10]} (parent of the upstream fix)")
        repo_ops.reset_worktree(repo)
        repo_ops.git(repo, "checkout", "-q", parent)
    print("resolving dependencies (online, once)...")
    ok, tail = repo_ops.install_deps(repo)
    if not ok:
        print(tail)
        sys.exit("dependency install failed")
    ok, tail = repo_ops.compile_tests(repo)
    if not ok:
        print(tail)
        sys.exit("test-compile failed")
    print(f"ready: {repo} at {parent[:10]}")


def cmd_run(args) -> None:
    from agent import pipeline
    plants = _load_plants(args.plant or [])
    attempt_id = pipeline.run(args.target, victim=args.victim, reruns=args.reruns,
                              baseline_runs=args.baseline, plants=plants,
                              use_agent=not args.no_agent, fast_refuse=args.fast_refuse,
                              open_prs=not args.no_pr)
    conn = db.connect()
    a = db.get_attempt(conn, attempt_id)
    print(f"\nattempt #{attempt_id} {a['status']}: {a['verdict']}")
    for c in a["candidates"]:
        print(f"  #{c['id']} [{c['source']}] {c['title']}: {c['verdict']}  "
              f"blade1 {c['blade1_passes']}/{c['blade1_runs']}  blade2 {c['blade2_verdict']} {c['blade2_category'] or ''}")
    if a["pr_url"]:
        print(f"  PR: {a['pr_url']}")
    if a["error"]:
        print(f"  note: {a['error']}")


def cmd_pr(args) -> None:
    """Open the pull request for an attempt the gate already verified, without rerunning anything."""
    from agent import github
    from agent.pipeline import context_for_attempt

    db.init()
    conn = db.connect()
    try:
        ctx = context_for_attempt(conn, args.attempt, open_prs=not args.dry_run)
        cand = db.rows(conn, "SELECT title, rationale FROM candidates WHERE id = ?",
                       (ctx.verified_candidate_id,))[0]
        url, body_path = github.open_pr_for_attempt(ctx, cand["title"], cand["rationale"] or cand["title"])
        if url:
            db.update(conn, "attempts", args.attempt, error=None)
            print(f"PR opened: {url}")
        elif args.dry_run:
            print(f"dry run: PR body saved to {body_path}")
        else:
            print(f"GITHUB_TOKEN is not set, so nothing was sent to GitHub. PR body saved to {body_path}")
    finally:
        conn.close()


def cmd_gate(args) -> None:
    from agent.gate import judge_patch
    text = sys.stdin.read() if args.patch == "-" else Path(args.patch).read_text(encoding="utf-8")
    verdict = judge_patch(text, context=args.context or "", use_model=not args.no_model)
    conn = db.connect()
    db.init()
    db.insert_gate_check(conn, "cli", text, verdict.verdict, verdict.category, verdict.reason,
                         verdict.line, verdict.model_used)
    print(json.dumps(verdict.to_dict(), indent=2))
    sys.exit(0 if verdict.verdict == "CLEAN" else 2)


def cmd_verify(args) -> None:
    from agent import harness
    fqcn, method = args.test.split("#", 1)
    db.init()
    result = harness.rerun(Path(args.repo), fqcn, method, times=args.times, scope=args.scope)
    print(f"\n{result}\n{result.confidence_line()}")


def cmd_findpolluter(args) -> None:
    from agent.polluter import Victim, find, test_classes
    fqcn, method = args.test.split("#", 1)
    repo = Path(args.repo)
    find(repo, Victim(fqcn, method), test_classes(repo))


def cmd_export(args) -> None:
    """Dump everything the dashboard needs, for a deployment box with no Maven or Java."""
    conn = db.connect()
    out = db.replay(conn)
    conn.close()
    Path(args.out).write_text(json.dumps(out, indent=1, default=str), encoding="utf-8")
    print(f"wrote {args.out}: {len(out['attempts'])} attempts, {out['tally']['runs']} runs")


def main() -> None:
    p = argparse.ArgumentParser(prog="flakeproof")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("initdb", help="create the sqlite schema").set_defaults(fn=lambda a: (db.init(), print("db ready")))
    sub.add_parser("status", help="show what is recorded so far").set_defaults(fn=cmd_status)

    s = sub.add_parser("prepare", help="clone a target at the fix commit's parent and build it")
    s.add_argument("--target", required=True)
    s.set_defaults(fn=cmd_prepare)

    s = sub.add_parser("run", help="diagnose, repair, prove, and open a PR or refuse")
    s.add_argument("--target", required=True)
    s.add_argument("--victim", default=None, help="Class#method among the target's recorded victims")
    s.add_argument("--reruns", type=int, default=None, help="Blade 1 sample size (default from config)")
    s.add_argument("--baseline", type=int, default=None, help="baseline runs before any patch")
    s.add_argument("--plant", action="append", help="glob of .diff files to judge as planted candidates")
    s.add_argument("--no-agent", action="store_true", help="skip the model; judge planted candidates only")
    s.add_argument("--fast-refuse", action="store_true", help="skip Blade 1 when Blade 2 already refused")
    s.add_argument("--no-pr", action="store_true", help="never call GitHub; save the PR body instead")
    s.set_defaults(fn=cmd_run)

    s = sub.add_parser("pr", help="open the pull request for an attempt that is already VERIFIED, without rerunning")
    s.add_argument("--attempt", type=int, required=True, help="attempt number, as shown by `status`")
    s.add_argument("--dry-run", action="store_true", help="save the PR body instead of calling GitHub")
    s.set_defaults(fn=cmd_pr)

    s = sub.add_parser("gate", help="judge one patch: real fix or band-aid (no JVM)")
    s.add_argument("patch", help="path to a unified diff, or - for stdin")
    s.add_argument("--context", default="")
    s.add_argument("--no-model", action="store_true")
    s.set_defaults(fn=cmd_gate)

    s = sub.add_parser("verify", help="rerun a test N times and report the pass rate")
    s.add_argument("repo")
    s.add_argument("test", help="fully.qualified.ClassName#methodName")
    s.add_argument("--times", type=int, default=20)
    s.add_argument("--scope", default=None, help="Class or Class#method to run alongside")
    s.set_defaults(fn=cmd_verify)

    s = sub.add_parser("findpolluter", help="sweep every test class to find which breaks this one")
    s.add_argument("repo")
    s.add_argument("test")
    s.set_defaults(fn=cmd_findpolluter)

    s = sub.add_parser("export", help="dump runs.db to JSON for a replay-only deployment")
    s.add_argument("--out", default="data/replay.json")
    s.set_defaults(fn=cmd_export)

    args = p.parse_args()
    if args.command == "run":
        from agent.config import BASELINE_RUNS, DEFAULT_RERUNS
        args.reruns = args.reruns or DEFAULT_RERUNS
        args.baseline = args.baseline or BASELINE_RUNS
    args.fn(args)


if __name__ == "__main__":
    main()
