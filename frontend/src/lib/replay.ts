import type {
  AgentLog,
  AIAgent,
  CandidatePatch,
  FlakyTestCase,
  GateMetric,
  GateVerdict,
  OrderTally,
  PipelineStage,
  Tally,
} from "./types";

/** The document served by GET /api/replay and built by agent/db.py. */
export interface RawRun {
  seq: number;
  passed: number;
  test_order: string | null;
  phase: string | null;
  failing: string | null;
  duration_ms: number | null;
  candidate_id: number | null;
}

export interface RawCandidate {
  id: number;
  ordinal: number;
  source: string;
  title: string | null;
  rationale: string | null;
  diff: string | null;
  files: string[] | null;
  compile_error: string | null;
  blade2_verdict: string | null;
  blade2_category: string | null;
  blade2_reason: string | null;
  blade2_line: string | null;
  blade2_line_no: number | null;
  verdict: string;
}

export interface RawEvent {
  id: number;
  attempt_id: number | null;
  ts: string | null;
  kind: string | null;
  agent: string | null;
  detail: string | null;
}

export interface RawHypothesis {
  agent: string | null;
  category: string | null;
  confidence: number | null;
  summary: string | null;
}

export interface RawAttempt {
  id: number;
  test_name: string;
  project_url: string | null;
  polluter: string | null;
  category: string | null;
  root_cause: string | null;
  verdict: string;
  refusal_reason: string | null;
  pr_url: string | null;
  status: string | null;
  error: string | null;
  created_at: string | null;
  baseline_passes: number;
  baseline_runs: number;
  candidates: RawCandidate[];
  hypotheses: RawHypothesis[];
  events: RawEvent[];
  runs: RawRun[];
}

export interface ReplayData {
  tally: Tally;
  attempts: RawAttempt[];
}

const GATE_VERDICTS = new Set<GateVerdict>(["VERIFIED", "REFUSED_BANDAID", "REFUSED_UNPROVEN"]);
const AGENT_KINDS = new Set(["tool_call", "handoff", "hypothesis", "diagnosis"]);
const GATE_KINDS = new Set(["gate", "blade1", "blade2", "verdict"]);
const DIAGNOSIS_NODES = new Set([
  "diagnose",
  "triage",
  "order_specialist",
  "async_specialist",
  "resource_specialist",
  "synthesize",
  "repair",
]);

export const ORDER_NAMES: Record<string, string> = {
  alphabetical: "alphabetical",
  reversealphabetical: "reverse alphabetical",
  random: "random",
  filesystem: "filesystem",
};

const ORDER_SEQUENCE = ["alphabetical", "reversealphabetical", "random", "filesystem"];

function verdictOf(value: string | null): GateVerdict | "PENDING" {
  return value !== null && GATE_VERDICTS.has(value as GateVerdict) ? (value as GateVerdict) : "PENDING";
}

export function pct(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

function parseUtc(ts: string | null): Date | null {
  if (!ts) return null;
  const date = new Date(ts.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime()) ? null : date;
}

export function localTime(ts: string | null): string {
  const date = parseUtc(ts);
  return date ? date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : (ts ?? "");
}

function clockTime(ts: string | null): string {
  const date = parseUtc(ts);
  return date ? date.toLocaleTimeString([], { hour12: false }) : (ts ?? "");
}

export function shortTestName(name: string): string {
  const [className, method] = name.split("#");
  const simple = className.split(".").pop() ?? className;
  return method ? simple + "#" + method : simple;
}

function repoName(url: string | null): string {
  if (!url) return "unknown repository";
  return url.replace(/\/+$/, "").split("/").slice(-2).join("/");
}

export function agentsRan(attempt: RawAttempt): boolean {
  return attempt.events.some((event) => AGENT_KINDS.has(event.kind ?? ""));
}

function stageOf(attempt: RawAttempt): PipelineStage {
  if (attempt.status !== "RUNNING") return "verdict";
  for (let i = attempt.events.length - 1; i >= 0; i -= 1) {
    const event = attempt.events[i];
    const kind = event.kind ?? "";
    const agent = event.agent ?? "";
    if (GATE_KINDS.has(kind)) return "gate";
    if (kind === "node") {
      if (agent === "gate") return "gate";
      if (agent === "open_pr" || agent === "refuse") return "verdict";
      if (DIAGNOSIS_NODES.has(agent)) return "diagnosis";
      if (agent === "intake") return "intake";
    }
    if (AGENT_KINDS.has(kind) || kind === "candidate") return "diagnosis";
  }
  return "intake";
}

function describeCall(detail: string | null): string {
  if (!detail) return "";
  try {
    const call = JSON.parse(detail) as { tool?: string; path?: string; input?: unknown };
    let args = call.path ?? "";
    if (!args && typeof call.input === "string" && call.input !== "{}") {
      try {
        const parsed = JSON.parse(call.input) as Record<string, unknown>;
        args = Object.entries(parsed)
          .map(([key, value]) => key + "=" + String(value).slice(0, 80))
          .join(" ");
      } catch {
        args = call.input.slice(0, 120);
      }
    }
    return (call.tool ?? "tool") + (args ? " " + args : "");
  } catch {
    return detail.slice(0, 160);
  }
}

export function tallyByOrder(runs: RawRun[]): OrderTally {
  const tally: OrderTally = {};
  for (const run of runs) {
    const order = run.test_order ?? "unknown";
    tally[order] ??= { passes: 0, runs: 0 };
    tally[order].runs += 1;
    if (run.passed) tally[order].passes += 1;
  }
  return tally;
}

function strictOrdersOf(baseline: OrderTally): string[] {
  return Object.entries(baseline)
    .filter(([, tally]) => tally.runs > 0 && tally.passes === 0)
    .map(([order]) => order);
}

export function sortOrders(orders: Iterable<string>): string[] {
  const rank = (order: string) => {
    const index = ORDER_SEQUENCE.indexOf(order);
    return index === -1 ? ORDER_SEQUENCE.length : index;
  };
  return Array.from(new Set(orders)).sort((left, right) => rank(left) - rank(right) || left.localeCompare(right));
}

export function orderLabel(orders: string[]): string {
  return orders.map((order) => ORDER_NAMES[order] ?? order).join(" and ");
}

function toCandidate(candidate: RawCandidate, runs: RawRun[], strictOrders: string[]): CandidatePatch {
  const candidateRuns = runs.filter((run) => run.candidate_id === candidate.id);
  const passes = candidateRuns.filter((run) => Boolean(run.passed)).length;
  const byOrder = tallyByOrder(candidateRuns);
  const strictRuns = strictOrders.reduce((sum, order) => sum + (byOrder[order]?.runs ?? 0), 0);
  const strictPasses = strictOrders.reduce((sum, order) => sum + (byOrder[order]?.passes ?? 0), 0);
  const failures = Array.from(
    new Set(candidateRuns.filter((run) => !run.passed && run.failing).map((run) => run.failing as string)),
  );
  const scanVerdict = candidate.blade2_verdict === "CLEAN" || candidate.blade2_verdict === "BANDAID"
    ? candidate.blade2_verdict
    : null;
  return {
    id: "c" + candidate.id,
    number: candidate.id,
    source: candidate.source === "agent" ? "agent" : "planted",
    title: candidate.title ?? "Candidate #" + candidate.id,
    rationale: candidate.rationale ?? "",
    diff: candidate.diff ?? "",
    files: candidate.files ?? [],
    verdict: verdictOf(candidate.verdict),
    compileError: candidate.compile_error,
    blade1: {
      runs: candidateRuns.length,
      passes,
      passRate: pct(passes, candidateRuns.length),
      passed: candidateRuns.length > 0 && passes === candidateRuns.length,
      strictOrders,
      strictRuns,
      strictPasses,
      byOrder,
      failures,
    },
    blade2: {
      verdict: scanVerdict,
      category: candidate.blade2_category ?? "",
      reason: candidate.blade2_reason ?? "",
      line: candidate.blade2_line ?? "",
      lineNo: candidate.blade2_line_no,
    },
  };
}

export function toTestCase(attempt: RawAttempt): FlakyTestCase {
  const baselineByOrder = tallyByOrder(
    attempt.runs.filter((run) => run.candidate_id === null && run.phase === "baseline"),
  );
  const strictOrders = strictOrdersOf(baselineByOrder);
  const candidates = [...attempt.candidates]
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((candidate) => toCandidate(candidate, attempt.runs, strictOrders));
  const verified = candidates.findIndex((candidate) => candidate.verdict === "VERIFIED");
  const interrupted = attempt.status === "FAILED" && /\binterrupted\b/i.test(attempt.error ?? "");
  const status: FlakyTestCase["status"] = interrupted
    ? "INTERRUPTED"
    : attempt.status === "DONE" || attempt.status === "FAILED"
      ? attempt.status
      : "RUNNING";
  const fqcn = attempt.test_name.split("#")[0];
  return {
    id: "attempt-" + attempt.id,
    attemptId: attempt.id,
    testName: attempt.test_name,
    testTitle: shortTestName(attempt.test_name),
    repository: repoName(attempt.project_url),
    filePath: "src/test/java/" + fqcn.replace(/\./g, "/") + ".java",
    stage: stageOf(attempt),
    status,
    verdict: verdictOf(attempt.verdict),
    agentsRan: agentsRan(attempt),
    victimTest: shortTestName(attempt.test_name),
    polluterTest: attempt.polluter ?? "",
    baselinePasses: attempt.baseline_passes,
    baselineRuns: attempt.baseline_runs,
    baselineFailRate: pct(attempt.baseline_runs - attempt.baseline_passes, attempt.baseline_runs),
    baselineFailure: attempt.runs.find((run) => run.candidate_id === null && !run.passed && run.failing)?.failing ?? "",
    baselineByOrder,
    strictOrders,
    createdAt: localTime(attempt.created_at),
    category: attempt.category ?? "",
    rootCause: attempt.root_cause ?? "",
    refusalReason: attempt.refusal_reason ?? "",
    error: attempt.error ?? "",
    hypotheses: attempt.hypotheses.map((hypothesis) => ({
      agent: hypothesis.agent ?? "agent",
      category: hypothesis.category ?? "",
      confidence: hypothesis.confidence ?? 0,
      summary: hypothesis.summary ?? "",
    })),
    candidatePatches: candidates,
    activePatchIndex: verified >= 0 ? verified : 0,
    prUrl: attempt.pr_url,
    jvmRuns: attempt.runs.length,
  };
}

const TEAM = [
  { id: "triage", node: "triage", name: "Triage", role: "Swarm: reads the failure and routes the case" },
  { id: "order_specialist", node: "order_specialist", name: "Order specialist", role: "Swarm: test-order dependence" },
  { id: "async_specialist", node: "async_specialist", name: "Async specialist", role: "Swarm: async waits and races" },
  { id: "resource_specialist", node: "resource_specialist", name: "Resource specialist", role: "Swarm: leaks, collections and time" },
  { id: "synthesizer", node: "synthesize", name: "Synthesizer", role: "Records one diagnosis" },
  { id: "repair", node: "repair", name: "Repair", role: "Writes and compiles candidate patches" },
  { id: "pr_writer", node: "open_pr", name: "PR writer", role: "Opens a PR only for a verified fix" },
];

function runningNode(attempt: RawAttempt): string {
  if (attempt.status !== "RUNNING") return "";
  for (let i = attempt.events.length - 1; i >= 0; i -= 1) {
    const event = attempt.events[i];
    if (event.kind === "node") return event.detail === "done" ? "" : (event.agent ?? "");
  }
  return "";
}

export function focusAttempt(attempts: RawAttempt[]): RawAttempt | undefined {
  const withAgents = attempts.filter(agentsRan).sort((left, right) => right.id - left.id);
  return withAgents.find((attempt) => attempt.status === "RUNNING") ?? withAgents[0] ?? attempts[0];
}

export function toAgents(attempt: RawAttempt | undefined): AIAgent[] {
  if (!attempt) return [];
  const activeNode = runningNode(attempt);
  const agents = TEAM.map((member): AIAgent => {
    const calls = attempt.events.filter((event) => event.kind === "tool_call" && event.agent === member.id);
    const lastCall = calls[calls.length - 1];
    let output: AIAgent["output"];
    if (member.id === "synthesizer") {
      output = { label: "diagnoses", value: attempt.events.filter((event) => event.kind === "diagnosis").length };
    } else if (member.id === "repair") {
      output = { label: "candidates", value: attempt.candidates.filter((candidate) => candidate.source === "agent").length };
    } else if (member.id === "pr_writer") {
      output = { label: "PR calls", value: calls.filter((event) => (event.detail ?? "").includes("open_pull_request")).length };
    } else {
      output = { label: "hypotheses", value: attempt.hypotheses.filter((hypothesis) => hypothesis.agent === member.id).length };
    }
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      model: "Amazon Nova 2 Lite on Amazon Bedrock",
      status: activeNode === member.node ? "running" : calls.length > 0 ? "done" : "idle",
      lastAction: lastCall ? describeCall(lastCall.detail) : "No activity in this attempt",
      activity: { label: "tool calls", value: calls.length },
      output,
    };
  });
  const gateEvents = attempt.events.filter((event) => event.agent === "gate");
  const lastGate = gateEvents[gateEvents.length - 1];
  const judged = attempt.candidates.filter((candidate) => candidate.verdict !== "PENDING").length;
  agents.push({
    id: "gate",
    name: "Gate",
    role: "Deterministic: controlled reruns and band-aid diff scan",
    model: "A model judge can add a refusal; it cannot approve a patch",
    status: attempt.status === "RUNNING" && stageOf(attempt) === "gate" ? "running" : judged > 0 ? "done" : "idle",
    lastAction: lastGate?.detail ? lastGate.detail.slice(0, 160) : "No candidates judged yet",
    activity: { label: "JVM runs", value: attempt.runs.length },
    output: { label: "judged", value: judged },
  });
  return agents;
}

const HIDDEN_KINDS = new Set(["tool", "tool_result", "node"]);

export function toLogs(attempts: RawAttempt[], limit = 5000): AgentLog[] {
  const events = attempts.flatMap((attempt) => attempt.events).filter((event) => !HIDDEN_KINDS.has(event.kind ?? ""));
  events.sort((left, right) => right.id - left.id);
  return events.slice(0, limit).map((event) => {
    const kind = event.kind ?? "info";
    const detail = event.detail ?? "";
    let level: AgentLog["level"] = "info";
    if (kind === "verdict" || kind === "gate") level = detail.includes("VERIFIED") ? "gate_pass" : "gate_refusal";
    else if (kind === "refusal") level = "gate_refusal";
    else if (kind === "pr") level = detail.startsWith("dry run") ? "info" : "pr_opened";
    else if (kind === "hypothesis" || kind === "diagnosis" || kind === "handoff" || kind === "candidate") level = "diagnosis";
    return {
      id: "event-" + event.id,
      attemptId: event.attempt_id ?? 0,
      agentName: event.agent ?? "system",
      kind,
      message: kind === "tool_call" ? "calls " + describeCall(detail) : detail,
      timestamp: clockTime(event.ts),
      level,
      ref: "event #" + event.id,
    };
  });
}

export function toMetrics(tally: Tally): GateMetric[] {
  const total = tally.verified + tally.refused;
  return [
    { id: "verified", label: "Verified", count: tally.verified, percentage: pct(tally.verified, total), verdictType: "VERIFIED" },
    { id: "bandaid", label: "Band-aids refused", count: tally.refused_bandaid, percentage: pct(tally.refused_bandaid, total), verdictType: "REFUSED_BANDAID" },
    { id: "unproven", label: "Unproven refused", count: tally.refused_unproven, percentage: pct(tally.refused_unproven, total), verdictType: "REFUSED_UNPROVEN" },
  ];
}

export function blade1Summary(patch: CandidatePatch): string {
  if (!patch.blade1.runs) return "No reruns were recorded for this patch.";
  const strict = patch.blade1.strictRuns
    ? " This includes " + patch.blade1.strictPasses + " of " + patch.blade1.strictRuns + " runs in orders where the unfixed code always failed."
    : "";
  return "Passed " + patch.blade1.passes + " of " + patch.blade1.runs + " controlled reruns." + strict;
}

export function scanSummary(patch: CandidatePatch): string {
  if (patch.blade2.verdict === "CLEAN") return "The deterministic diff scan found no band-aid pattern.";
  if (patch.blade2.verdict === "BANDAID") return patch.blade2.reason || "The deterministic diff scan refused a band-aid pattern.";
  return "No band-aid scan result was recorded.";
}
