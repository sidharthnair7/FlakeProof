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

/*
 * The document served by GET /api/replay, built by replay() in agent/db.py.
 * Field names are the SQLite column names. Timestamps are UTC "YYYY-MM-DD HH:MM:SS".
 */
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

const GATE_VERDICTS: readonly string[] = ["VERIFIED", "REFUSED_BANDAID", "REFUSED_UNPROVEN"];

function verdictOf(value: string | null): GateVerdict | "PENDING" {
  return value !== null && GATE_VERDICTS.includes(value) ? (value as GateVerdict) : "PENDING";
}

/** Percentage with one decimal. */
export function pct(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

function parseUtc(ts: string | null): Date | null {
  if (!ts) return null;
  const date = new Date(`${ts.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** SQLite stores UTC; show it in the viewer's local time. */
export function localTime(ts: string | null): string {
  const date = parseUtc(ts);
  if (!date) return ts ?? "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function clockTime(ts: string | null): string {
  const date = parseUtc(ts);
  return date ? date.toLocaleTimeString([], { hour12: false }) : (ts ?? "");
}

/** "net.sf.x.FooTest#testBar" becomes "FooTest#testBar". */
export function shortTestName(name: string): string {
  const [cls, method] = name.split("#");
  const simple = cls.split(".").pop() ?? cls;
  return method ? `${simple}#${method}` : simple;
}

function repoName(url: string | null): string {
  if (!url) return "unknown repository";
  return url.replace(/\/+$/, "").split("/").slice(-2).join("/");
}

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

export function agentsRan(a: RawAttempt): boolean {
  return a.events.some((e) => AGENT_KINDS.has(e.kind ?? ""));
}

function stageOf(a: RawAttempt): PipelineStage {
  if (a.status !== "RUNNING") return "verdict";
  for (let i = a.events.length - 1; i >= 0; i--) {
    const kind = a.events[i].kind ?? "";
    const agent = a.events[i].agent ?? "";
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

/** A tool_call event's detail is JSON like {"tool": "run_pair", "input": "{\"first\": \"X\"}"}. */
function describeCall(detail: string | null): string {
  if (!detail) return "";
  try {
    const call = JSON.parse(detail) as { tool?: string; path?: string; input?: unknown };
    let args = call.path ?? "";
    if (!args && typeof call.input === "string" && call.input !== "{}") {
      try {
        const parsed = JSON.parse(call.input) as Record<string, unknown>;
        args = Object.entries(parsed)
          .map(([key, value]) => `${key}=${String(value).slice(0, 80)}`)
          .join(" ");
      } catch {
        args = call.input.slice(0, 120);
      }
    }
    return `${call.tool ?? "tool"}${args ? ` ${args}` : ""}`;
  } catch {
    return detail.slice(0, 160);
  }
}

export const ORDER_NAMES: Record<string, string> = {
  alphabetical: "alphabetical",
  reversealphabetical: "reverse alphabetical",
  random: "random",
  filesystem: "filesystem",
};
const ORDER_SEQUENCE = ["alphabetical", "reversealphabetical", "random", "filesystem"];

export function tallyByOrder(runs: RawRun[]): OrderTally {
  const out: OrderTally = {};
  for (const r of runs) {
    const key = r.test_order ?? "unknown";
    out[key] ??= { passes: 0, runs: 0 };
    out[key].runs += 1;
    if (r.passed) out[key].passes += 1;
  }
  return out;
}

/** Orders in which the unfixed code failed every baseline run (strict_orders in agent/github.py). */
function strictOrdersOf(baseline: OrderTally): string[] {
  return Object.entries(baseline)
    .filter(([, t]) => t.runs > 0 && t.passes === 0)
    .map(([order]) => order);
}

export function sortOrders(orders: Iterable<string>): string[] {
  const rank = (o: string) => (ORDER_SEQUENCE.includes(o) ? ORDER_SEQUENCE.indexOf(o) : ORDER_SEQUENCE.length);
  return Array.from(new Set(orders)).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function orderLabel(orders: string[]): string {
  return orders.map((o) => ORDER_NAMES[o] ?? o).join(" and ");
}

function toCandidate(c: RawCandidate, runs: RawRun[], strict: string[]): CandidatePatch {
  const mine = runs.filter((r) => r.candidate_id === c.id);
  const passes = mine.filter((r) => r.passed).length;
  const passed = mine.length > 0 && passes === mine.length;
  const byOrder = tallyByOrder(mine);
  const strictRuns = strict.reduce((n, o) => n + (byOrder[o]?.runs ?? 0), 0);
  const strictPasses = strict.reduce((n, o) => n + (byOrder[o]?.passes ?? 0), 0);
  const failures = Array.from(
    new Set(mine.filter((r) => !r.passed && r.failing).map((r) => r.failing as string)),
  );
  const blade2Verdict = c.blade2_verdict === "CLEAN" || c.blade2_verdict === "BANDAID" ? c.blade2_verdict : null;
  return {
    id: `c${c.id}`,
    number: c.id,
    source: c.source === "agent" ? "agent" : "planted",
    title: c.title ?? `Candidate #${c.id}`,
    rationale: c.rationale ?? "",
    diff: c.diff ?? "",
    files: c.files ?? [],
    verdict: verdictOf(c.verdict),
    compileError: c.compile_error,
    blade1: {
      runs: mine.length,
      passes,
      passRate: pct(passes, mine.length),
      passed,
      strictOrders: strict,
      strictRuns,
      strictPasses,
      byOrder,
      failures,
    },
    blade2: {
      verdict: blade2Verdict,
      category: c.blade2_category ?? "",
      reason: c.blade2_reason ?? "",
      line: c.blade2_line ?? "",
      lineNo: c.blade2_line_no,
    },
  };
}

export function toTestCase(a: RawAttempt): FlakyTestCase {
  const fqcn = a.test_name.split("#")[0];
  const baselineByOrder = tallyByOrder(a.runs.filter((r) => r.candidate_id === null && r.phase === "baseline"));
  const strict = strictOrdersOf(baselineByOrder);
  const candidates = [...a.candidates]
    .sort((x, y) => x.ordinal - y.ordinal)
    .map((c) => toCandidate(c, a.runs, strict));
  const verified = candidates.findIndex((c) => c.verdict === "VERIFIED");
  const status: FlakyTestCase["status"] = a.status === "DONE" || a.status === "FAILED" ? a.status : "RUNNING";
  return {
    id: `attempt-${a.id}`,
    attemptId: a.id,
    testName: a.test_name,
    testTitle: shortTestName(a.test_name),
    repository: repoName(a.project_url),
    filePath: `src/test/java/${fqcn.replace(/\./g, "/")}.java`,
    stage: stageOf(a),
    status,
    verdict: verdictOf(a.verdict),
    agentsRan: agentsRan(a),
    victimTest: shortTestName(a.test_name),
    polluterTest: a.polluter ?? "",
    baselinePasses: a.baseline_passes,
    baselineRuns: a.baseline_runs,
    baselineFailRate: pct(a.baseline_runs - a.baseline_passes, a.baseline_runs),
    baselineFailure: a.runs.find((r) => r.candidate_id === null && !r.passed && r.failing)?.failing ?? "",
    baselineByOrder,
    strictOrders: strict,
    createdAt: localTime(a.created_at),
    category: a.category ?? "",
    rootCause: a.root_cause ?? "",
    refusalReason: a.refusal_reason ?? "",
    error: a.error ?? "",
    hypotheses: a.hypotheses.map((h) => ({
      agent: h.agent ?? "agent",
      category: h.category ?? "",
      confidence: h.confidence ?? 0,
      summary: h.summary ?? "",
    })),
    candidatePatches: candidates,
    activePatchIndex: verified >= 0 ? verified : 0,
    prUrl: a.pr_url,
    jvmRuns: a.runs.length,
  };
}

const TEAM = [
  { id: "triage", node: "triage", name: "Triage", role: "Swarm: reads the failure and routes the case" },
  { id: "order_specialist", node: "order_specialist", name: "Order specialist", role: "Swarm: test-order dependence" },
  { id: "async_specialist", node: "async_specialist", name: "Async specialist", role: "Swarm: async waits and races" },
  { id: "resource_specialist", node: "resource_specialist", name: "Resource specialist", role: "Swarm: leaks, collections and time" },
  { id: "synthesizer", node: "synthesize", name: "Synthesizer", role: "Records one diagnosis" },
  { id: "repair", node: "repair", name: "Repair", role: "Writes and compiles candidate patches" },
  { id: "pr_writer", node: "open_pr", name: "PR writer", role: "Opens the pull request for a verified fix" },
];

function runningNode(a: RawAttempt): string {
  if (a.status !== "RUNNING") return "";
  for (let i = a.events.length - 1; i >= 0; i--) {
    if (a.events[i].kind === "node") return a.events[i].detail === "done" ? "" : (a.events[i].agent ?? "");
  }
  return "";
}

/** The attempt the agents rail describes: a running agent attempt, else the latest agent attempt, else the latest. */
export function focusAttempt(attempts: RawAttempt[]): RawAttempt | undefined {
  const withAgents = attempts.filter(agentsRan).sort((x, y) => y.id - x.id);
  return withAgents.find((a) => a.status === "RUNNING") ?? withAgents[0] ?? attempts[0];
}

export function toAgents(a: RawAttempt | undefined): AIAgent[] {
  if (!a) return [];
  const active = runningNode(a);
  const team = TEAM.map((member): AIAgent => {
    const calls = a.events.filter((e) => e.kind === "tool_call" && e.agent === member.id);
    const last = calls[calls.length - 1];
    let output: AIAgent["output"];
    if (member.id === "synthesizer") {
      output = { label: "diagnoses", value: a.events.filter((e) => e.kind === "diagnosis").length };
    } else if (member.id === "repair") {
      output = { label: "candidates", value: a.candidates.filter((c) => c.source === "agent").length };
    } else if (member.id === "pr_writer") {
      output = { label: "PR calls", value: calls.filter((e) => (e.detail ?? "").includes("open_pull_request")).length };
    } else {
      output = { label: "hypotheses", value: a.hypotheses.filter((h) => h.agent === member.id).length };
    }
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      model: "Amazon Nova 2 Lite on Amazon Bedrock",
      status: active === member.node ? "running" : calls.length > 0 ? "done" : "idle",
      lastAction: last ? describeCall(last.detail) : "No activity in this attempt",
      activity: { label: "tool calls", value: calls.length },
      output,
    };
  });
  const gateEvents = a.events.filter((e) => e.agent === "gate");
  const lastGate = gateEvents[gateEvents.length - 1];
  const judged = a.candidates.filter((c) => c.verdict !== "PENDING").length;
  team.push({
    id: "gate",
    name: "Gate",
    role: "Deterministic: reruns (Blade 1) and band-aid scan (Blade 2)",
    model: "No model decides; a judge agent can only add a refusal",
    status: a.status === "RUNNING" && stageOf(a) === "gate" ? "running" : judged > 0 ? "done" : "idle",
    lastAction: lastGate?.detail ? lastGate.detail.slice(0, 160) : "No candidates judged yet",
    activity: { label: "JVM runs", value: a.runs.length },
    output: { label: "judged", value: judged },
  });
  return team;
}

// "tool" rows repeat what the hooks already log as "tool_call".
const HIDDEN_KINDS = new Set(["tool", "tool_result", "node"]);

export function toLogs(attempts: RawAttempt[], limit = 5000): AgentLog[] {
  const events = attempts.flatMap((a) => a.events).filter((e) => !HIDDEN_KINDS.has(e.kind ?? ""));
  events.sort((x, y) => y.id - x.id);
  return events.slice(0, limit).map((e): AgentLog => {
    const kind = e.kind ?? "info";
    const detail = e.detail ?? "";
    let level: AgentLog["level"] = "info";
    if (kind === "verdict") level = detail.includes("VERIFIED") ? "gate_pass" : "gate_refusal";
    else if (kind === "refusal") level = "gate_refusal";
    else if (kind === "pr") level = detail.startsWith("dry run") ? "info" : "pr_opened";
    else if (kind === "hypothesis" || kind === "diagnosis" || kind === "handoff" || kind === "candidate") level = "diagnosis";

    let message = detail;
    if (kind === "tool_call") {
      message = `calls ${describeCall(detail)}`;
    } else if (kind === "diagnosis") {
      try {
        const d = JSON.parse(detail) as { category?: string; polluter?: string };
        message = `recorded diagnosis: ${d.category ?? "unknown"}${d.polluter ? `, polluter ${d.polluter}` : ""}`;
      } catch {
        // keep the raw detail
      }
    }
    if (message.length > 240) message = `${message.slice(0, 240)}...`;
    return {
      id: `e${e.id}`,
      attemptId: e.attempt_id ?? 0,
      agentName: e.agent ?? "system",
      kind,
      message,
      timestamp: clockTime(e.ts),
      level,
      ref: `#${e.attempt_id ?? "?"} ${kind}`,
    };
  });
}

export function toMetrics(t: Tally): GateMetric[] {
  return [
    { id: "gm-verified", label: "VERIFIED", count: t.verified, percentage: pct(t.verified, t.attempted), verdictType: "VERIFIED" },
    { id: "gm-bandaid", label: "REFUSED_BANDAID", count: t.refused_bandaid, percentage: pct(t.refused_bandaid, t.attempted), verdictType: "REFUSED_BANDAID" },
    { id: "gm-unproven", label: "REFUSED_UNPROVEN", count: t.refused_unproven, percentage: pct(t.refused_unproven, t.attempted), verdictType: "REFUSED_UNPROVEN" },
  ];
}

/** The attempt that best shows the gate: most distinct verdicts, then most reruns, then newest. */
export function showcaseAttempt(cases: FlakyTestCase[]): FlakyTestCase | undefined {
  return cases
    .filter((c) => c.candidatePatches.length > 0)
    .map((c) => ({
      c,
      distinct: new Set(c.candidatePatches.map((p) => p.verdict)).size,
      reruns: Math.max(0, ...c.candidatePatches.map((p) => p.blade1.runs)),
    }))
    .sort((x, y) => y.distinct - x.distinct || y.reruns - x.reruns || y.c.attemptId - x.c.attemptId)[0]?.c;
}

export function latestAgentAttempt(cases: FlakyTestCase[]): FlakyTestCase | undefined {
  return cases.filter((c) => c.agentsRan).sort((x, y) => y.attemptId - x.attemptId)[0];
}

/**
 * What the reruns show. A confidence bound is stated only over the orders in which the unfixed code
 * failed every baseline run: in the other orders the flaky test runs first, where a leak cannot show.
 */
export function blade1Summary(p: CandidatePatch): string {
  const b = p.blade1;
  if (b.runs === 0) return p.compileError ? "Did not compile, so it was never rerun." : "No reruns recorded yet.";
  const where = orderLabel(b.strictOrders);
  if (b.passed && p.verdict === "REFUSED_BANDAID") {
    return `Passed all ${b.runs} reruns and was refused anyway: see the band-aid scan.`;
  }
  if (b.passed) {
    if (b.strictRuns === 0) {
      return `Passed all ${b.runs} reruns. No run order failed every baseline run, so no confidence bound is stated.`;
    }
    const bound =
      b.strictRuns >= 30
        ? ` Zero failures in those ${b.strictRuns} runs bounds the failure rate in that order below ${
            Math.ceil((300 / b.strictRuns) * 10) / 10
          }% at 95% confidence (rule of three).`
        : " That is too few runs in that order for a confidence bound.";
    return `Passed all ${b.runs} reruns, including ${b.strictPasses} of ${b.strictRuns} in ${where} order, where the unfixed code failed every time.${bound}`;
  }
  const inStrict = b.strictRuns > 0 ? `, including ${b.strictRuns - b.strictPasses} of ${b.strictRuns} in ${where} order` : "";
  return `${b.runs - b.passes} of ${b.runs} runs failed${inStrict}.${b.failures[0] ? ` First failure: ${b.failures[0]}` : ""}`;
}

/** The deterministic scanner's words. The model's prose after them is an opinion, not evidence. */
export function scanSummary(p: CandidatePatch): string {
  const words = p.blade2.reason.split(" Model")[0].trim();
  if (p.blade2.verdict === "CLEAN") return words || "No band-aid pattern found.";
  if (p.blade2.verdict === "BANDAID") return `Band-aid${p.blade2.category ? ` (${p.blade2.category})` : ""}: ${words}`;
  return "Not run.";
}

export function blade2Label(p: CandidatePatch): string {
  if (p.blade2.verdict === "CLEAN") return "Clean";
  if (p.blade2.verdict === "BANDAID") return p.blade2.category ? `Band-aid: ${p.blade2.category}` : "Band-aid";
  return "Not run";
}
