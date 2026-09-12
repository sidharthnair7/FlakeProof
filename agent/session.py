"""The run context shared by tools, nodes and hooks during one pipeline run.

Strands tools receive only their declared arguments, so the repository path, the attempt id
and the database connection live here, set once by pipeline.run() before any agent starts.
One pipeline run per process; that is the CLI's contract.
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from agent import db


@dataclass
class PlantedPatch:
    title: str
    rationale: str
    diff: str


@dataclass
class RunContext:
    attempt_id: int
    repo: Path
    fqcn: str
    method: str
    polluter: str | None                 # Surefire selector pinned into every run, e.g. Class#method
    conn: Any
    project_url: str = ""
    reruns: int = 200
    baseline_runs: int = 20
    plants: list[PlantedPatch] = field(default_factory=list)
    fast_refuse: bool = False            # skip Blade 1 when Blade 2 already refused
    open_prs: bool = True                # False = never call GitHub (dry run)
    baseline_passes: int = 0
    baseline_total: int = 0
    baseline_failure: str = ""           # message + trace of the last failing baseline run
    candidate_counter: int = 0
    verified_candidate_id: int | None = None
    diagnosis: dict | None = None

    @property
    def test_name(self) -> str:
        return f"{self.fqcn}#{self.method}"

    @property
    def victim_simple(self) -> str:
        return self.fqcn.rsplit(".", 1)[-1]

    def log(self, kind: str, agent: str, detail: Any) -> None:
        db.log_event(self.conn, self.attempt_id, kind, agent, detail)


_current: RunContext | None = None


def start(ctx: RunContext) -> RunContext:
    global _current
    _current = ctx
    return ctx


def get() -> RunContext:
    if _current is None:
        raise RuntimeError("no pipeline run in progress")
    return _current


def clear() -> None:
    global _current
    _current = None
