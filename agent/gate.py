"""Blade 2 in full: deterministic scanner plus one model opinion. Also the "Try the gate" judge.

The same function serves three callers: the pipeline's gate node, the dashboard's paste-a-patch
box, and the AgentCore Runtime entrypoint. One Bedrock call, about two seconds, no JVM.

Combination rule
  scanner hit                                   -> BANDAID (the model cannot overrule it)
  no hit, model says band-aid with confidence >= threshold -> BANDAID
  otherwise                                     -> CLEAN
"""
import json
from dataclasses import asdict, dataclass, field

from agent import bandaid
from agent.config import AGENTCORE_RUNTIME_ARN, AWS_REGION, BANDAID_MODEL_THRESHOLD
from agent.models import ModelUnavailable, make_model, model_available
from agent.schemas import BandAidOpinion

JUDGE_PROMPT = """You review patches that claim to fix flaky tests. Decide whether a patch is a
REAL FIX (it removes the cause of the non-determinism: missing cleanup of shared state, a missing
synchronisation, an assumption about iteration order or time) or a BAND-AID (it makes the test
stop failing without removing the cause).

Band-aid categories, use exactly these names:
  sleep                adds Thread.sleep or similar fixed waits
  retry                retries the test or the assertion until it passes
  ignore               @Ignore/@Disabled/assume*, or excludes the test from the build
  timeout              widens or adds a timeout instead of fixing the wait
  order_pinning        pins method or class execution order so the polluter runs later
  isolation            forks a fresh JVM per class or otherwise hides shared state
  assertion_weakening  removes, comments out or trivialises assertions
  swallow              catches the failure so the test cannot fail
  none                 not a band-aid

A cleanup that resets shared state after the test that dirtied it, a proper wait on a condition
(latch, future, Awaitility with a real condition), or a change to production code that removes the
race are real fixes. Judge the added lines; be precise about the single most damning line."""


@dataclass
class GateVerdict:
    verdict: str                          # CLEAN | BANDAID
    category: str = ""
    reason: str = ""
    line: str = ""
    line_no: int | None = None
    file: str = ""
    scanner_hits: list[str] = field(default_factory=list)
    model_used: bool = False
    model_opinion: dict | None = None

    def to_dict(self) -> dict:
        return asdict(self)


def model_opinion(diff: str, context: str = "") -> BandAidOpinion | None:
    """One structured-output call. Returns None if no model is configured or the call fails."""
    if not model_available():
        return None
    from strands import Agent
    try:
        agent = Agent(name="bandaid_judge", model=make_model(temperature=0.0, max_tokens=1500),
                      system_prompt=JUDGE_PROMPT, structured_output_model=BandAidOpinion,
                      callback_handler=None)
        prompt = (f"Context: {context or 'none'}\n\nPatch (unified diff):\n```diff\n{diff[:12000]}\n```\n"
                  f"Is this a real fix or a band-aid?")
        result = agent(prompt)
        opinion = result.structured_output
        return opinion if isinstance(opinion, BandAidOpinion) else None
    except ModelUnavailable:
        return None
    except Exception as exc:  # network, throttling, auth: the scanner still rules
        print(f"  (model opinion unavailable: {exc})", flush=True)
        return None


def judge_patch(diff: str, context: str = "", use_model: bool = True) -> GateVerdict:
    scan = bandaid.scan_diff(diff)
    opinion = model_opinion(diff, context) if use_model else None
    opinion_dict = opinion.model_dump() if opinion else None

    if scan.is_bandaid:
        hit = scan.primary
        reason = f"{hit.reason}. {bandaid.CATEGORIES.get(hit.category, '')}"
        if opinion and opinion.is_bandaid and opinion.reasoning:
            reason += f" Model: {opinion.reasoning}"
        return GateVerdict("BANDAID", hit.category, reason.strip(), hit.text.strip(), hit.line_no,
                           hit.file, [h.describe() for h in scan.hits], opinion is not None,
                           opinion_dict)

    if opinion and opinion.is_bandaid and opinion.confidence >= BANDAID_MODEL_THRESHOLD:
        return GateVerdict("BANDAID", (opinion.category or "other").strip().lower(),
                           f"Model ({opinion.confidence:.0%}): {opinion.reasoning}",
                           opinion.offending_line.strip(), None, "", [], True, opinion_dict)

    reason = "No band-aid pattern found by the deterministic scanner."
    if opinion:
        reason += f" Model ({1 - opinion.confidence if opinion.is_bandaid else opinion.confidence:.0%} real fix): {opinion.reasoning}"
    return GateVerdict("CLEAN", "", reason, "", None, "", [], opinion is not None, opinion_dict)


def judge_via_agentcore(diff: str, context: str = "") -> GateVerdict:
    """Forward to a deployed AgentCore Runtime that runs agentcore/gate_app.py."""
    import uuid

    import boto3

    if not AGENTCORE_RUNTIME_ARN:
        raise RuntimeError("FLAKEPROOF_AGENTCORE_ARN is not set")
    client = boto3.client("bedrock-agentcore", region_name=AWS_REGION)
    payload = json.dumps({"diff": diff, "context": context}).encode("utf-8")
    response = client.invoke_agent_runtime(
        agentRuntimeArn=AGENTCORE_RUNTIME_ARN,
        runtimeSessionId=uuid.uuid4().hex + uuid.uuid4().hex[:8],   # must be >= 33 chars
        payload=payload,
    )
    body = response["response"].read() if hasattr(response.get("response"), "read") else response.get("response")
    data = json.loads(body)
    return GateVerdict(**{k: v for k, v in data.items() if k in GateVerdict.__dataclass_fields__})
