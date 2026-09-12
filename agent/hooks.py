"""Strands hooks: the trace recorder and the refusal guard.

TraceHooks writes every tool call, handoff and node transition to the attempt's event log, so the
dashboard's agent trace is a record of what happened, not a narration.

RefusalGuard is the second lock on the pull request. The first lock is topology: only the
`open_pr` graph node has the PR tool, and that node is reachable only through the edge whose
condition is "the gate verified a candidate". This hook re-checks the database verdict at the
moment of the call and cancels the tool if it disagrees. Two independent mechanisms, one rule:
the agent cannot propose a fix it has not proven.
"""
import json
from typing import Any

from strands.hooks import (AfterNodeCallEvent, AfterToolCallEvent, BeforeNodeCallEvent,
                           BeforeToolCallEvent, HookProvider, HookRegistry)

from agent import db, session


def _short(value: Any, limit: int = 300) -> str:
    text = value if isinstance(value, str) else json.dumps(value, default=str)
    return text if len(text) <= limit else text[:limit] + "..."


def _safe_ctx() -> session.RunContext | None:
    try:
        return session.get()
    except RuntimeError:
        return None


class TraceHooks(HookProvider):
    """Record tool calls, handoffs and node transitions to the events table."""

    def register_hooks(self, registry: HookRegistry, **kwargs: Any) -> None:
        registry.add_callback(BeforeToolCallEvent, self._before_tool)
        registry.add_callback(AfterToolCallEvent, self._after_tool)
        registry.add_callback(BeforeNodeCallEvent, self._before_node)
        registry.add_callback(AfterNodeCallEvent, self._after_node)

    def _before_tool(self, event: BeforeToolCallEvent) -> None:
        ctx = _safe_ctx()
        if not ctx:
            return
        name = event.tool_use.get("name", "?")
        agent = getattr(event.agent, "name", "agent")
        inputs = event.tool_use.get("input", {}) or {}
        if name == "handoff_to_agent":
            ctx.log("handoff", agent, {"to": inputs.get("agent_name"),
                                       "message": _short(inputs.get("message", ""), 600)})
        elif name in ("edit_file", "read_source"):
            ctx.log("tool_call", agent, {"tool": name, "path": inputs.get("path")})
        else:
            ctx.log("tool_call", agent, {"tool": name, "input": _short(inputs, 400)})

    def _after_tool(self, event: AfterToolCallEvent) -> None:
        ctx = _safe_ctx()
        if not ctx:
            return
        name = event.tool_use.get("name", "?")
        agent = getattr(event.agent, "name", "agent")
        result = getattr(event, "result", None) or {}
        text = ""
        for block in result.get("content", []) or []:
            if isinstance(block, dict) and "text" in block:
                text = block["text"]
                break
        ctx.log("tool_result", agent, {"tool": name, "status": result.get("status"),
                                       "result": _short(text, 300)})

    def _before_node(self, event: BeforeNodeCallEvent) -> None:
        ctx = _safe_ctx()
        if ctx:
            ctx.log("node", event.node_id, "start")

    def _after_node(self, event: AfterNodeCallEvent) -> None:
        ctx = _safe_ctx()
        if ctx:
            ctx.log("node", event.node_id, "done")


class RefusalGuard(HookProvider):
    """Cancel open_pull_request unless the gate has verified a candidate."""

    def register_hooks(self, registry: HookRegistry, **kwargs: Any) -> None:
        registry.add_callback(BeforeToolCallEvent, self._check)

    def _check(self, event: BeforeToolCallEvent) -> None:
        if event.tool_use.get("name") != "open_pull_request":
            return
        ctx = _safe_ctx()
        verdict = None
        if ctx and ctx.verified_candidate_id is not None:
            row = ctx.conn.execute("SELECT verdict FROM candidates WHERE id = ?",
                                   (ctx.verified_candidate_id,)).fetchone()
            verdict = row["verdict"] if row else None
        if verdict != "VERIFIED":
            event.cancel_tool = ("Refused by the gate: no candidate has passed both blades. "
                                 "Flakeproof does not open pull requests for unproven fixes.")
            if ctx:
                ctx.log("refusal", "guard", "blocked open_pull_request: no VERIFIED candidate")
