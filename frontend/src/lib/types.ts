// UI types. Every value is derived from GET /api/replay (see ./replay.ts); nothing is invented.

export type GateVerdict = "VERIFIED" | "REFUSED_BANDAID" | "REFUSED_UNPROVEN";

export type PipelineStage = "intake" | "diagnosis" | "gate" | "verdict";

export type OrderTally = Record<string, { passes: number; runs: number }>;

export interface CandidatePatch {
  id: string;
  number: number; // candidates.id in runs.db
  source: "agent" | "planted";
  title: string;
  rationale: string;
  diff: string;
  files: string[];
  verdict: GateVerdict | "PENDING";
  compileError: string | null;
  blade1: {
    runs: number;
    passes: number;
    passRate: number; // 0 to 100, one decimal
    passed: boolean; // every rerun passed
    strictOrders: string[]; // orders in which the unfixed code failed every baseline run
    strictRuns: number; // this patch's reruns in those orders: the only runs that can catch the leak
    strictPasses: number;
    byOrder: OrderTally;
    failures: string[]; // distinct failure messages
  };
  blade2: {
    verdict: "CLEAN" | "BANDAID" | null;
    category: string;
    reason: string;
    line: string; // offending line, verbatim
    lineNo: number | null;
  };
}

export interface Hypothesis {
  agent: string;
  category: string;
  confidence: number;
  summary: string;
}

export interface FlakyTestCase {
  id: string;
  attemptId: number;
  testName: string; // fully qualified Class#method
  testTitle: string; // SimpleClass#method
  repository: string;
  filePath: string;
  stage: PipelineStage;
  status: "RUNNING" | "DONE" | "FAILED" | "INTERRUPTED";
  verdict: GateVerdict | "PENDING";
  agentsRan: boolean;
  victimTest: string;
  polluterTest: string; // "" when unknown
  baselinePasses: number;
  baselineRuns: number;
  baselineFailRate: number; // 0 to 100
  baselineFailure: string; // first baseline failure message
  baselineByOrder: OrderTally;
  strictOrders: string[]; // orders in which the unfixed code failed every baseline run
  createdAt: string;
  category: string;
  rootCause: string;
  refusalReason: string;
  error: string;
  hypotheses: Hypothesis[];
  candidatePatches: CandidatePatch[];
  activePatchIndex: number;
  prUrl: string | null;
  jvmRuns: number;
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: "running" | "done" | "idle";
  lastAction: string;
  activity: { label: string; value: number };
  output: { label: string; value: number };
}

export interface AgentLog {
  id: string;
  attemptId: number;
  agentName: string;
  kind: string;
  message: string;
  timestamp: string;
  level: "info" | "diagnosis" | "gate_pass" | "gate_refusal" | "pr_opened";
  ref: string;
}

export interface GateMetric {
  id: string;
  label: string;
  count: number;
  percentage: number;
  verdictType: GateVerdict;
}

export interface Tally {
  attempted: number;
  verified: number;
  refused: number;
  refused_unproven: number;
  refused_bandaid: number;
  pending: number;
  attempts: number;
  prs: number;
  runs: number;
}
