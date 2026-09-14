"""Open the pull request. The PR is the product's real-world side effect.

Fork-to-fork on purpose: the demo targets are historical flakes whose upstream fixes merged
years ago, so a PR against upstream would be noise for the maintainer. On the user's fork the
PR is public, permanent and clickable, and it carries the evidence in its body.

Plain GitHub REST via httpx. No git push from the machine: the branch, the commit and the PR
are created through the API, so the only credential needed is one fine-grained token, and the
commit is attributed to that token's owner.
"""
import base64
import math
import re
import time
from pathlib import Path

import httpx

from agent import db
from agent.config import DASHBOARD_URL, DATA, GITHUB_API, GITHUB_OWNER, GITHUB_TOKEN
from agent.harness import ORDERS

PROJECT_URL = "https://github.com/sidharthnair7/FlakeProof"
ORDER_NAMES = {"alphabetical": "alphabetical", "reversealphabetical": "reverse alphabetical",
               "random": "random", "filesystem": "filesystem"}


class GitHub:
    def __init__(self, token: str, owner: str, repo: str, api: str = GITHUB_API):
        self.owner, self.repo = owner, repo
        self.client = httpx.Client(base_url=api, timeout=30, headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })

    # -- low level --
    def _req(self, method: str, path: str, ok=(200, 201), **kw) -> dict | list | None:
        r = self.client.request(method, path, **kw)
        if r.status_code == 404 and method == "GET":
            return None
        if r.status_code not in ok:
            raise RuntimeError(f"GitHub {method} {path} -> {r.status_code}: {r.text[:300]}")
        return r.json() if r.text else {}

    # -- repository --
    def repo_exists(self) -> bool:
        return self._req("GET", f"/repos/{self.owner}/{self.repo}") is not None

    def ensure_fork(self, upstream_owner: str) -> None:
        if self.repo_exists():
            return
        self._req("POST", f"/repos/{upstream_owner}/{self.repo}/forks", ok=(202,))
        for _ in range(30):                     # forks are created asynchronously
            time.sleep(2)
            if self.repo_exists():
                return
        raise RuntimeError("fork did not appear within 60s")

    def branch_sha(self, name: str) -> str | None:
        ref = self._req("GET", f"/repos/{self.owner}/{self.repo}/git/ref/heads/{name}")
        return ref["object"]["sha"] if ref else None

    def ensure_branch(self, name: str, sha: str) -> None:
        if self.branch_sha(name):
            return
        self._req("POST", f"/repos/{self.owner}/{self.repo}/git/refs",
                  json={"ref": f"refs/heads/{name}", "sha": sha})

    def commit_files(self, branch: str, base_sha: str, files: dict[str, bytes], message: str) -> str:
        """Point `branch` at one new commit on top of `base_sha` holding `files` byte for byte.

        One commit per pull request. Running it again replaces that commit instead of stacking a
        second one, so a corrected upload leaves a clean history."""
        prefix = f"/repos/{self.owner}/{self.repo}/git"
        base_commit = self._req("GET", f"{prefix}/commits/{base_sha}")
        tree = []
        for path, content in files.items():
            blob = self._req("POST", f"{prefix}/blobs",
                             json={"content": base64.b64encode(content).decode("ascii"), "encoding": "base64"})
            tree.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        new_tree = self._req("POST", f"{prefix}/trees", json={"base_tree": base_commit["tree"]["sha"], "tree": tree})
        commit = self._req("POST", f"{prefix}/commits",
                           json={"message": message, "tree": new_tree["sha"], "parents": [base_sha]})
        self._req("PATCH", f"{prefix}/refs/heads/{branch}", json={"sha": commit["sha"], "force": True})
        return commit["sha"]

    def find_pr(self, head: str, base: str) -> dict | None:
        prs = self._req("GET", f"/repos/{self.owner}/{self.repo}/pulls",
                        params={"head": f"{self.owner}:{head}", "base": base, "state": "open"})
        return prs[0] if prs else None

    def update_pr_body(self, number: int, body: str) -> None:
        self._req("PATCH", f"/repos/{self.owner}/{self.repo}/pulls/{number}", json={"body": body})

    def create_pr(self, head: str, base: str, title: str, body: str) -> str:
        """Open the PR, or refresh the evidence in the one already open for this branch."""
        existing = self.find_pr(head, base)
        if existing:
            self.update_pr_body(existing["number"], body)
            return existing["html_url"]
        pr = self._req("POST", f"/repos/{self.owner}/{self.repo}/pulls",
                       json={"title": title, "head": head, "base": base, "body": body})
        return pr["html_url"]


# ---- evidence ---------------------------------------------------------------------------------

def _by_order(runs: list[dict]) -> dict[str, list[int]]:
    """{test order: [passes, runs]}."""
    out: dict[str, list[int]] = {}
    for r in runs:
        tally = out.setdefault(r["test_order"], [0, 0])
        tally[0] += int(bool(r["passed"]))
        tally[1] += 1
    return out


def strict_orders(baseline_runs: list[dict]) -> list[str]:
    """Orders in which the unfixed code failed every baseline run.

    The polluting test ran first in those orders, so only runs in them can show whether a patch
    removed the leak. Runs in the other orders pass whether or not the leak is still there."""
    return [o for o, (passes, n) in _by_order(baseline_runs).items() if n and passes == 0]


def bound_percent(n: int) -> str:
    """Rule of three, 3/n, rounded up so the stated bound is never tighter than the truth."""
    return f"{math.ceil(300 / n * 10) / 10:g}%"


def _scanner_words(reason: str) -> str:
    """The deterministic scanner's reason. The model's prose that follows it is an opinion, not evidence."""
    return (reason or "").split(" Model", 1)[0].strip()


def _no_mentions(text: str) -> str:
    """GitHub links @After or @Ignore to a user with that name and notifies them. Code spans are never linked."""
    return re.sub(r"(?<![`\w])@([A-Za-z]\w*)", r"`@\1`", text)


def _order_label(orders: list[str]) -> str:
    return " and ".join(ORDER_NAMES.get(o, o) for o in orders)


def _bound_statement(strict: list[str], before: dict, after: dict) -> str:
    if not strict:
        return ("No run order failed every baseline run, so no confidence bound is stated: a bound "
                "needs runs in which the unfixed code is known to fail.")
    b_n = sum(before[o][1] for o in strict)
    a_p = sum(after.get(o, [0, 0])[0] for o in strict)
    a_n = sum(after.get(o, [0, 0])[1] for o in strict)
    text = (f"Only runs where the polluting test executes first can catch this leak. In "
            f"{_order_label(strict)} order the unfixed code failed all {b_n} baseline runs; after the "
            f"patch, {a_p} of {a_n} passed.")
    if a_n and a_p == a_n:
        if a_n >= 30:
            text += (f" By the rule of three, 0 failures in {a_n} runs bounds the failure rate in that "
                     f"order below {bound_percent(a_n)} at 95% confidence.")
        else:
            text += f" {a_n} runs in that order are too few for a confidence bound."
    if "random" in after and "random" not in strict:
        text += (" Random-order runs are not counted in the bound, because the class order of each "
                 "random run is not recorded.")
    return text


def _refusal_line(cand: dict, runs: list[dict], strict: list[str]) -> str:
    passes, total = sum(int(bool(r["passed"])) for r in runs), len(runs)
    origin = "written by the repair agent" if cand.get("source") == "agent" else "planted by hand"
    head = f"{cand['title']} ({origin})"
    if cand["verdict"] == "REFUSED_BANDAID":
        where = f", line {cand['blade2_line_no']}" if cand.get("blade2_line_no") else ""
        scan = _scanner_words(cand.get("blade2_reason") or "")
        return (f"{head}: **refused as a band-aid** ({cand.get('blade2_category') or 'band-aid'}{where}). "
                f"It passed {passes} of {total} reruns." + (f" Scanner: {scan}" if scan else ""))
    text = f"{head}: **refused, not proven.** {passes} of {total} reruns passed."
    strict_runs = [r for r in runs if r["test_order"] in strict]
    if strict_runs:
        failed = sum(1 for r in strict_runs if not r["passed"])
        text += f" It failed {failed} of {len(strict_runs)} runs in the order where the unfixed code always failed."
    return text


def render_pr_body(attempt: dict, candidate: dict, summary: str, runs: list[dict], refused: list[dict],
                   category: str = "", root_cause: str = "", hypotheses: list[dict] | None = None,
                   dashboard_url: str = "") -> str:
    """The evidence, from recorded runs only: every number is a count of rows in runs.db."""
    baseline = [r for r in runs if r["phase"] == "baseline"]
    mine = [r for r in runs if r["candidate_id"] == candidate["id"]]
    before, after = _by_order(baseline), _by_order(mine)
    strict = strict_orders(baseline)

    lines = [summary.strip(), "", "## Evidence (generated by Flakeproof)", "",
             f"**Flaky test:** `{attempt['test_name']}`  "]
    if category:
        lines.append(f"**Category:** {category}  ")
    if root_cause:
        lines.append(f"**Root cause:** {root_cause}  ")
    if attempt.get("polluter"):
        lines.append(f"**Polluting test, run in the same JVM for every rerun:** `{attempt['polluter']}`  ")

    lines += ["", "| Surefire run order | Before the patch | After the patch |", "|---|---|---|"]
    seen = [o for o in ORDERS if o in before or o in after]
    seen += sorted((set(before) | set(after)) - set(seen))
    for order in seen:
        b, a = before.get(order, [0, 0]), after.get(order, [0, 0])
        note = " (the unfixed code failed every run)" if order in strict else ""
        lines.append(f"| {ORDER_NAMES.get(order, order)}{note} | {b[0]} / {b[1]} | {a[0]} / {a[1]} |")
    lines.append(f"| **Total** | **{sum(b[0] for b in before.values())} / {len(baseline)}** | "
                 f"**{sum(a[0] for a in after.values())} / {len(mine)}** |")
    lines += ["", _bound_statement(strict, before, after), ""]

    verdict = (candidate.get("blade2_verdict") or "not run").lower()
    lines += [f"**Band-aid scan:** {verdict}. {_scanner_words(candidate.get('blade2_reason') or '')}".rstrip(), ""]

    if hypotheses:
        lines += ["### Diagnosis trail", ""]
        for h in hypotheses:
            lines.append(f"- **{h['agent']}** ({h['category']}, {h['confidence']:.0%}): {h['summary']}")
        lines.append("")
    if refused:
        lines += ["### Patches the gate refused for this test", ""]
        for r in refused:
            lines.append("- " + _refusal_line(r, [x for x in runs if x["candidate_id"] == r["id"]], strict))
        lines.append("")
    if dashboard_url:
        lines += [f"Every rerun and the agent trace: {dashboard_url.rstrip('/')}/dashboard?run={attempt['id']}", ""]
    lines.append("_Flakeproof opens a pull request only for a fix that passed every rerun and the band-aid "
                 f"scan. Project: {PROJECT_URL}_")
    return _no_mentions("\n".join(lines))


def evidence_body(conn, attempt: dict, cand: dict, summary: str) -> str:
    """The PR body for a verified candidate, built from runs.db.

    The agents' diagnosis goes in only when the agents wrote the verified patch: a planted fix
    must not carry a root cause the agents recorded while chasing something else."""
    runs = db.runs_for(conn, attempt["id"])
    refused = db.rows(conn, "SELECT * FROM candidates WHERE attempt_id = ? AND verdict LIKE 'REFUSED%'"
                            " ORDER BY ordinal", (attempt["id"],))
    agent_written = cand["source"] == "agent"
    if agent_written:
        category, root_cause = attempt.get("category") or "", attempt.get("root_cause") or ""
        hypotheses = db.rows(conn, "SELECT * FROM hypotheses WHERE attempt_id = ? ORDER BY id", (attempt["id"],))
    else:
        category = "order-dependent (a test leaves shared state behind)" if attempt.get("polluter") else ""
        root_cause, hypotheses = "", []
    return render_pr_body(attempt, cand, summary, runs, refused, category=category, root_cause=root_cause,
                          hypotheses=hypotheses, dashboard_url=DASHBOARD_URL)


def _committable_bytes(repo: Path, rel_paths: list[str]) -> dict[str, bytes]:
    """Each file exactly as `git commit` would store it: staged, then read back from the index.

    Reading the working tree in Python text mode would turn CRLF into LF, and the pull request
    would then rewrite every line of a CRLF file instead of changing only the patched lines."""
    from agent import repo as repo_ops
    files = {}
    for rel in rel_paths:
        repo_ops.git(repo, "add", "--", rel)
        files[rel] = repo_ops.git_bytes(repo, "show", f":{rel}")
    return files


def _patched_files(ctx, diff_text: str) -> dict[str, bytes]:
    """Apply the diff on a clean tree, capture the changed files byte for byte, reset."""
    from agent import repo as repo_ops
    repo_ops.reset_worktree(ctx.repo)
    ok, msg = repo_ops.apply_diff(ctx.repo, diff_text)
    if not ok:
        raise RuntimeError(f"verified patch no longer applies: {msg}")
    try:
        return _committable_bytes(ctx.repo, repo_ops.changed_files(ctx.repo))
    finally:
        repo_ops.reset_worktree(ctx.repo)


def open_pr_for_attempt(ctx, title: str, summary: str) -> tuple[str | None, Path]:
    """Create branch + commit + PR on the fork for the verified candidate. Returns (url, body_path)."""
    from agent import repo as repo_ops

    conn = ctx.conn
    attempt = db.rows(conn, "SELECT * FROM attempts WHERE id = ?", (ctx.attempt_id,))[0]
    cand = db.rows(conn, "SELECT * FROM candidates WHERE id = ?", (ctx.verified_candidate_id,))[0]
    if cand["verdict"] != "VERIFIED":
        raise RuntimeError("refusing: candidate is not VERIFIED")
    body = evidence_body(conn, attempt, cand, summary)

    out_dir = DATA / "pr-bodies"
    out_dir.mkdir(parents=True, exist_ok=True)
    body_path = out_dir / f"attempt-{ctx.attempt_id}.md"
    body_path.write_text(f"# {title}\n\n{body}\n", encoding="utf-8")

    if not ctx.open_prs or not GITHUB_TOKEN:
        ctx.log("pr", "github", f"dry run: PR body saved to data/pr-bodies/{body_path.name}")
        return None, body_path

    project_url = (ctx.project_url or "").rstrip("/")
    upstream_owner, repo_name = project_url.rsplit("/", 2)[-2:]
    gh = GitHub(GITHUB_TOKEN, GITHUB_OWNER, repo_name)
    gh.ensure_fork(upstream_owner)

    base_sha = repo_ops.head_sha(ctx.repo)
    base_branch = f"flakeproof/base-{base_sha[:10]}"
    head_branch = f"flakeproof/fix-{ctx.attempt_id}-{base_sha[:7]}"
    gh.ensure_branch(base_branch, base_sha)
    gh.ensure_branch(head_branch, base_sha)
    gh.commit_files(head_branch, base_sha, _patched_files(ctx, cand["diff"]),
                    f"{title}\n\nProposed by Flakeproof for {attempt['test_name']}")
    url = gh.create_pr(head_branch, base_branch, title, body)

    db.update(conn, "attempts", ctx.attempt_id, pr_url=url)
    ctx.log("pr", "github", url)
    print(f"  PR opened: {url}", flush=True)
    return url, body_path
