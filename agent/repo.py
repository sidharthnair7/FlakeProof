"""Git and Maven operations on a cloned target project. No LLM in here.

Every candidate patch is judged on a clean working tree: apply, compile, measure, reset. The
reset is what makes the 200 reruns for candidate B independent of candidate A.
"""
import os
import re
import subprocess
from pathlib import Path

from agent.config import JAVA_HOME, MVN, MVN_TIMEOUT_SECONDS

TEST_ROOT = Path("src") / "test" / "java"


def _run(args, cwd, timeout=120, input_text=None) -> subprocess.CompletedProcess:
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout,
                          input=input_text, encoding="utf-8", errors="replace")


def git(repo: Path, *args: str, check: bool = True) -> str:
    p = _run(["git", *args], cwd=repo)
    if check and p.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {p.stderr.strip()}")
    return p.stdout


def git_bytes(repo: Path, *args: str) -> bytes:
    """Run git and return stdout byte for byte, with no newline translation."""
    p = subprocess.run(["git", *args], cwd=repo, capture_output=True, timeout=120)
    if p.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {p.stderr.decode('utf-8', 'replace').strip()}")
    return p.stdout


def head_sha(repo: Path) -> str:
    return git(repo, "rev-parse", "HEAD").strip()


def rev_parse(repo: Path, ref: str) -> str:
    return git(repo, "rev-parse", ref).strip()


def is_clean(repo: Path) -> bool:
    return git(repo, "status", "--porcelain").strip() == ""


def reset_worktree(repo: Path) -> None:
    """Discard every uncommitted change. Respects .gitignore, so target/ survives."""
    git(repo, "reset", "-q", "--hard")
    git(repo, "clean", "-fdq")


def diff(repo: Path) -> str:
    """Unified diff of the working tree, including new files."""
    untracked = [ln for ln in git(repo, "ls-files", "--others", "--exclude-standard").splitlines() if ln]
    if untracked:
        git(repo, "add", "-N", "--", *untracked)      # intent-to-add: shows up in diff, not staged
    return git(repo, "diff", "--no-color")


def changed_files(repo: Path) -> list[str]:
    out = git(repo, "status", "--porcelain")
    files = []
    for line in out.splitlines():
        if len(line) > 3:
            files.append(line[3:].strip().replace("\\", "/"))
    return files


def apply_diff(repo: Path, diff_text: str) -> tuple[bool, str]:
    """Apply a unified diff to the working tree. Returns (ok, message)."""
    if not diff_text.strip():
        return False, "empty diff"
    if not diff_text.endswith("\n"):
        diff_text += "\n"
    p = _run(["git", "apply", "--whitespace=nowarn", "-"], cwd=repo, input_text=diff_text)
    if p.returncode != 0:
        p2 = _run(["git", "apply", "--whitespace=nowarn", "--3way", "-"], cwd=repo, input_text=diff_text)
        if p2.returncode != 0:
            return False, (p.stderr or p2.stderr).strip()
    return True, "applied"


def _safe_path(repo: Path, rel: str) -> Path:
    path = (repo / rel).resolve()
    if repo.resolve() not in path.parents:
        raise ValueError("path escapes the repository")
    return path


def read_file(repo: Path, rel: str) -> str:
    return _safe_path(repo, rel).read_text(encoding="utf-8", errors="replace")


def write_file(repo: Path, rel: str, content: str) -> None:
    path = _safe_path(repo, rel)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def edit_file(repo: Path, rel: str, old: str, new: str) -> tuple[bool, str]:
    """Exact single-occurrence replacement, the safest edit primitive for an LLM."""
    try:
        text = read_file(repo, rel)
    except FileNotFoundError:
        return False, f"{rel} does not exist"
    n = text.count(old)
    if n == 0:
        return False, "old text not found; copy it exactly, including indentation"
    if n > 1:
        return False, f"old text occurs {n} times; include more surrounding lines to make it unique"
    write_file(repo, rel, text.replace(old, new, 1))
    return True, f"edited {rel}"


def grep(repo: Path, pattern: str, subdir: str = "src", max_hits: int = 60) -> list[tuple[str, int, str]]:
    rx = re.compile(pattern)
    hits: list[tuple[str, int, str]] = []
    base = repo / subdir
    for path in sorted(base.rglob("*.java")):
        try:
            for i, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
                if rx.search(line):
                    hits.append((str(path.relative_to(repo)).replace("\\", "/"), i, line.strip()))
                    if len(hits) >= max_hits:
                        return hits
        except OSError:
            continue
    return hits


def list_test_classes(repo: Path) -> list[str]:
    root = repo / TEST_ROOT
    out = []
    for p in root.rglob("*Test.java"):
        out.append(str(p.relative_to(root)).replace("\\", "/")[:-5].replace("/", "."))
    return sorted(out)


def fqcn_to_path(fqcn: str) -> str:
    return str(TEST_ROOT / (fqcn.replace(".", "/") + ".java")).replace("\\", "/")


# ---- Maven ----------------------------------------------------------------------------------

def mvn(repo: Path, *args: str, timeout: int = MVN_TIMEOUT_SECONDS, offline: bool = True):
    cmd = [MVN, "-B", "-q"]
    if offline:
        cmd.append("-o")
    cmd.extend(args)
    env = {**os.environ, "JAVA_HOME": JAVA_HOME}
    return subprocess.run(cmd, cwd=repo, env=env, capture_output=True, text=True,
                          timeout=timeout, encoding="utf-8", errors="replace")


def compile_tests(repo: Path) -> tuple[bool, str]:
    """Compile main + test sources offline. Returns (ok, tail of output)."""
    try:
        p = mvn(repo, "test-compile")
    except subprocess.TimeoutExpired:
        return False, "compile timed out"
    tail = "\n".join((p.stdout + p.stderr).strip().splitlines()[-25:])
    return p.returncode == 0, tail


def install_deps(repo: Path) -> tuple[bool, str]:
    """One-time online build so every later invocation can be offline."""
    try:
        p = mvn(repo, "install", "-DskipTests", offline=False, timeout=1800)
    except subprocess.TimeoutExpired:
        return False, "install timed out"
    tail = "\n".join((p.stdout + p.stderr).strip().splitlines()[-25:])
    return p.returncode == 0, tail
