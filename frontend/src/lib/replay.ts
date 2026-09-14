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

export const FALLBACK_REPLAY_DATA: ReplayData = {
  tally: {
    attempted: 4,
    verified: 3,
    refused: 1,
    refused_unproven: 0,
    refused_bandaid: 1,
    pending: 0,
    attempts: 4,
    prs: 3,
    runs: 940,
  },
  attempts: [
    {
      id: 1,
      test_name: "net.sf.marineapi.provider.PositionProviderTest#testGLLSentence",
      project_url: "https://github.com/openbase/marine-api",
      polluter: "net.sf.marineapi.parser.SentenceFactoryTest#testDeleteParser",
      category: "order-dependent",
      root_cause:
        "SentenceFactoryTest.testDeleteParser() deletes the GLL parser from the SentenceFactory singleton and never resets it. When PositionProviderTest runs afterward in the same JVM, it cannot parse GPS coordinates.",
      verdict: "VERIFIED",
      refusal_reason: null,
      pr_url: "https://github.com/openbase/marine-api/pull/142",
      status: "DONE",
      error: null,
      created_at: "2026-09-14 10:28:44",
      baseline_passes: 13,
      baseline_runs: 30,
      candidates: [
        {
          id: 101,
          ordinal: 1,
          source: "agent",
          title: "Incomplete Parser Restore",
          rationale: "Attempts replacement registration, but instantiates wrong class GGASentenceParser.",
          diff: `--- a/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
+++ b/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
@@ -42,3 +42,6 @@ public class SentenceFactoryTest {
   factory.deleteParser("GLL");
+  // BUGGY RESTORE: Registers GGA parser instead of GLL parser
+  factory.registerParser("GLL", GGASentenceParser.class);
 }`,
          files: ["src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java"],
          compile_error: null,
          blade2_verdict: "CLEAN",
          blade2_category: null,
          blade2_reason: "Clean AST. No band-aids detected, but rejected by Blade 1.",
          blade2_line: null,
          blade2_line_no: null,
          verdict: "REFUSED_UNPROVEN",
        },
        {
          id: 102,
          ordinal: 2,
          source: "planted",
          title: "@Ignore on Polluter Test",
          rationale: "Annotates polluter test with @Ignore to suppress the failure.",
          diff: `--- a/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
+++ b/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
@@ -38,4 +38,5 @@ public class SentenceFactoryTest {
+  @Ignore("Temporarily disabled due to order-dependent flake")
   @Test
   public void testDeleteParser() {`,
          files: ["src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java"],
          compile_error: null,
          blade2_verdict: "BANDAID",
          blade2_category: "@Ignore",
          blade2_reason: "Refused by Blade 2 AST scan: test ignored rather than repaired.",
          blade2_line: '@Ignore("Temporarily disabled due to order-dependent flake")',
          blade2_line_no: 38,
          verdict: "REFUSED_BANDAID",
        },
        {
          id: 103,
          ordinal: 3,
          source: "agent",
          title: "Maintainer Teardown Reset",
          rationale: "Adds @After teardown hook resetting SentenceFactory default parser registry after every test.",
          diff: `--- a/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
+++ b/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
@@ -24,4 +24,8 @@ public class SentenceFactoryTest {
+  @After
+  public void tearDown() {
+    SentenceFactory.reset(); // Restores clean singleton parser registry
+  }
+
   @Test
   public void testDeleteParser() {`,
          files: ["src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java"],
          compile_error: null,
          blade2_verdict: "CLEAN",
          blade2_category: null,
          blade2_reason: "Clean AST. Zero sleeps, retries, @Ignore, or pinned orders.",
          blade2_line: null,
          blade2_line_no: null,
          verdict: "VERIFIED",
        },
      ],
      hypotheses: [
        {
          agent: "Triage Specialist",
          category: "order-dependent",
          confidence: 0.95,
          summary: "PositionProviderTest fails intermittently under random order permutations (56.7% failure rate).",
        },
        {
          agent: "Order Specialist",
          category: "polluter-victim",
          confidence: 0.98,
          summary: "SentenceFactoryTest.testDeleteParser() identified as polluter. PositionProviderTest crashes with IllegalArgumentException only when run afterward.",
        },
        {
          agent: "Resource Specialist",
          category: "singleton-leak",
          confidence: 0.96,
          summary: "SentenceFactory.getInstance() global parser map is modified during test execution without teardown cleanup.",
        },
      ],
      events: [
        { id: 1, attempt_id: 1, ts: "10:20:02", kind: "info", agent: "Triage Specialist", detail: "Executed 30 baseline runs. Flakiness: 56.7%. Classified: ORDER-DEPENDENT." },
        { id: 2, attempt_id: 1, ts: "10:21:18", kind: "diagnosis", agent: "Order Specialist", detail: "Pinpointed minimal polluter-victim pair: SentenceFactoryTest.testDeleteParser() -> PositionProviderTest." },
        { id: 3, attempt_id: 1, ts: "10:22:30", kind: "diagnosis", agent: "Repair Agent", detail: "Synthesized 3 candidate patches for singleton state isolation." },
        { id: 4, attempt_id: 1, ts: "10:24:05", kind: "gate", agent: "Two-Blade Gate", detail: "Candidate 1 (Incomplete Restore) failed 17/30 random order replays -> REFUSED_UNPROVEN." },
        { id: 5, attempt_id: 1, ts: "10:26:12", kind: "refusal", agent: "Two-Blade Gate", detail: "Candidate 2 (@Ignore) passed 200/200 runs, but Blade 2 AST scan detected @Ignore -> REFUSED_BANDAID." },
        { id: 6, attempt_id: 1, ts: "10:28:44", kind: "pr", agent: "Two-Blade Gate", detail: "Candidate 3 passed Blade 1 (200/200 runs) and Blade 2 (Clean AST) -> VERIFIED. PR #142 opened with SQLite proof." },
      ],
      runs: [
        ...Array.from({ length: 13 }, (_, i) => ({
          seq: i + 1,
          passed: 1,
          test_order: "reversealphabetical",
          phase: "baseline",
          failing: null,
          duration_ms: 240,
          candidate_id: null,
        })),
        ...Array.from({ length: 17 }, (_, i) => ({
          seq: 14 + i,
          passed: 0,
          test_order: "alphabetical",
          phase: "baseline",
          failing: "IllegalArgumentException: Unknown sentence 'GLL'",
          duration_ms: 220,
          candidate_id: null,
        })),
        ...Array.from({ length: 200 }, (_, i) => ({
          seq: i + 1,
          passed: 1,
          test_order: i % 2 === 0 ? "alphabetical" : "reversealphabetical",
          phase: "verify",
          failing: null,
          duration_ms: 180,
          candidate_id: 103,
        })),
      ],
    },
    {
      id: 2,
      test_name: "org.springframework.security.oauth.SecurityContextHolderTest#testAnonymousAccess",
      project_url: "https://github.com/spring-projects/spring-security",
      polluter: "org.springframework.security.oauth.AdminAuthTest#testAdminAuthenticationToken",
      category: "threadlocal-leak",
      root_cause:
        "ThreadLocal SecurityContext retains previous user principal across runner iterations. Missing SecurityContextHolder.clearContext() in teardown hook.",
      verdict: "VERIFIED",
      refusal_reason: null,
      pr_url: "https://github.com/spring-projects/spring-security/pull/8921",
      status: "DONE",
      error: null,
      created_at: "2026-09-14 09:42:15",
      baseline_passes: 20,
      baseline_runs: 40,
      candidates: [
        {
          id: 201,
          ordinal: 1,
          source: "agent",
          title: "Clear SecurityContext in @AfterEach",
          rationale: "Calls SecurityContextHolder.clearContext() in @AfterEach teardown.",
          diff: `--- a/SecurityContextHolderTest.java\n+++ b/SecurityContextHolderTest.java\n@@ -15,3 +15,5 @@\n+  @AfterEach\n+  void clear() { SecurityContextHolder.clearContext(); }`,
          files: ["src/test/java/org/springframework/security/oauth/SecurityContextHolderTest.java"],
          compile_error: null,
          blade2_verdict: "CLEAN",
          blade2_category: null,
          blade2_reason: "Clean AST. Zero band-aids.",
          blade2_line: null,
          blade2_line_no: null,
          verdict: "VERIFIED",
        },
      ],
      hypotheses: [
        {
          agent: "Order Specialist",
          category: "threadlocal-leak",
          confidence: 0.94,
          summary: "AdminAuthTest pollutes threadlocal context.",
        },
      ],
      events: [
        { id: 10, attempt_id: 2, ts: "09:40:00", kind: "gate", agent: "Two-Blade Gate", detail: "Candidate 1 passed 200/200 runs and clean AST. VERIFIED." },
      ],
      runs: [
        ...Array.from({ length: 20 }, (_, i) => ({
          seq: i + 1,
          passed: 1,
          test_order: "alphabetical",
          phase: "baseline",
          failing: null,
          duration_ms: 310,
          candidate_id: null,
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          seq: 21 + i,
          passed: 0,
          test_order: "reversealphabetical",
          phase: "baseline",
          failing: "AssertionError: expected anonymous but found ADMIN",
          duration_ms: 290,
          candidate_id: null,
        })),
        ...Array.from({ length: 200 }, (_, i) => ({
          seq: i + 1,
          passed: 1,
          test_order: i % 2 === 0 ? "alphabetical" : "reversealphabetical",
          phase: "verify",
          failing: null,
          duration_ms: 250,
          candidate_id: 201,
        })),
      ],
    },
    {
      id: 3,
      test_name: "com.zaxxer.hikari.ConnectionPoolLeakTest#testBorrowTimeout",
      project_url: "https://github.com/brettwooldridge/HikariCP",
      polluter: "com.zaxxer.hikari.ConnectionPoolLeakTest#testUnclosedResultSet",
      category: "resource-leak",
      root_cause: "Active JDBC connection unclosed in previous test exhausts mock connection pool.",
      verdict: "REFUSED_BANDAID",
      refusal_reason: "Blade 2 AST scan detected Thread.sleep(500) band-aid mask.",
      pr_url: null,
      status: "DONE",
      error: null,
      created_at: "2026-09-14 09:15:02",
      baseline_passes: 16,
      baseline_runs: 25,
      candidates: [
        {
          id: 301,
          ordinal: 1,
          source: "planted",
          title: "Add Thread.sleep(500) wait",
          rationale: "Adds Thread.sleep(500) to wait for pool eviction.",
          diff: `--- a/ConnectionPoolLeakTest.java\n+++ b/ConnectionPoolLeakTest.java\n@@ -31,3 +31,4 @@\n+  Thread.sleep(500); // Wait for connection cleanup`,
          files: ["src/test/java/com/zaxxer/hikari/ConnectionPoolLeakTest.java"],
          compile_error: null,
          blade2_verdict: "BANDAID",
          blade2_category: "sleep",
          blade2_reason: "Blade 2 refused: Thread.sleep is a timing mask, not an invariant proof.",
          blade2_line: "Thread.sleep(500); // Wait for connection cleanup",
          blade2_line_no: 31,
          verdict: "REFUSED_BANDAID",
        },
      ],
      hypotheses: [
        {
          agent: "Async Specialist",
          category: "resource-leak",
          confidence: 0.91,
          summary: "Connection leak in mock pool.",
        },
      ],
      events: [
        { id: 20, attempt_id: 3, ts: "09:14:00", kind: "refusal", agent: "Two-Blade Gate", detail: "Candidate 1 passed 200 runs but refused by AST scan (Thread.sleep detected)." },
      ],
      runs: [
        ...Array.from({ length: 16 }, (_, i) => ({
          seq: i + 1,
          passed: 1,
          test_order: "alphabetical",
          phase: "baseline",
          failing: null,
          duration_ms: 450,
          candidate_id: null,
        })),
        ...Array.from({ length: 9 }, (_, i) => ({
          seq: 17 + i,
          passed: 0,
          test_order: "reversealphabetical",
          phase: "baseline",
          failing: "SQLException: Connection pool exhausted (timeout 500ms)",
          duration_ms: 510,
          candidate_id: null,
        })),
        ...Array.from({ length: 200 }, (_, i) => ({
          seq: i + 1,
          passed: 1,
          test_order: i % 2 === 0 ? "alphabetical" : "reversealphabetical",
          phase: "verify",
          failing: null,
          duration_ms: 520,
          candidate_id: 301,
        })),
      ],
    },
    {
      id: 4,
      test_name: "com.j256.ormlite.dao.RuntimeExceptionDaoTest#testAssignEmptyForeignCollectionThrow",
      project_url: "https://github.com/j256/ormlite-core",
      polluter: "com.j256.ormlite.dao.RuntimeExceptionDaoTest#testCloseLastIteratorThrow",
      category: "order-dependent",
      root_cause: "Dangling table lock held by unclosed iterator prevents schema mutation in subsequent test.",
      verdict: "VERIFIED",
      refusal_reason: null,
      pr_url: "https://github.com/j256/ormlite-core/pull/310",
      status: "DONE",
      error: null,
      created_at: "2026-09-14 08:50:33",
      baseline_passes: 15,
      baseline_runs: 30,
      candidates: [
        {
          id: 401,
          ordinal: 1,
          source: "agent",
          title: "Close iterator in finally block",
          rationale: "Ensures iterator is explicitly closed in finally block to release connection lock.",
          diff: `--- a/RuntimeExceptionDaoTest.java\n+++ b/RuntimeExceptionDaoTest.java\n@@ -88,3 +88,6 @@\n   iterator.close();\n+  // Release table lock\n+  connection.release();`,
          files: ["src/test/java/com/j256/ormlite/dao/RuntimeExceptionDaoTest.java"],
          compile_error: null,
          blade2_verdict: "CLEAN",
          blade2_category: null,
          blade2_reason: "Clean AST. Zero band-aids.",
          blade2_line: null,
          blade2_line_no: null,
          verdict: "VERIFIED",
        },
      ],
      hypotheses: [
        {
          agent: "Resource Specialist",
          category: "resource-leak",
          confidence: 0.95,
          summary: "Table lock retained across tests.",
        },
      ],
      events: [
        { id: 30, attempt_id: 4, ts: "08:50:00", kind: "gate", agent: "Two-Blade Gate", detail: "Candidate 1 passed 200/200 runs with clean AST. VERIFIED." },
      ],
      runs: [
        ...Array.from({ length: 15 }, (_, i) => ({
          seq: i + 1,
          passed: 1,
          test_order: "alphabetical",
          phase: "baseline",
          failing: null,
          duration_ms: 180,
          candidate_id: null,
        })),
        ...Array.from({ length: 15 }, (_, i) => ({
          seq: 16 + i,
          passed: 0,
          test_order: "reversealphabetical",
          phase: "baseline",
          failing: "SQLException: Database locked by dangling iterator",
          duration_ms: 190,
          candidate_id: null,
        })),
        ...Array.from({ length: 200 }, (_, i) => ({
          seq: i + 1,
          passed: 1,
          test_order: i % 2 === 0 ? "alphabetical" : "reversealphabetical",
          phase: "verify",
          failing: null,
          duration_ms: 175,
          candidate_id: 401,
        })),
      ],
    },
  ],
};
