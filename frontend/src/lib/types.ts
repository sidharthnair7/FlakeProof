export type GateVerdict = "VERIFIED" | "REFUSED_BANDAID" | "REFUSED_UNPROVEN";

export type PipelineStage = "intake" | "diagnosis" | "gate" | "verdict";

export interface CandidatePatch {
  id: string;
  label: string;
  approach: string;
  diffSnippet: string;
  verdict: GateVerdict;
  blade1Runs: {
    passedRuns: number;
    totalRuns: number; // e.g. 200 or 30
    passRate: number; // e.g. 100% or 43%
    passed: boolean;
    failureDetail?: string;
  };
  blade2Scan: {
    passed: boolean;
    detectedBandAid?: "@Ignore" | "sleep" | "retry" | "pinned_order" | "weakened_assertion";
    offendingLine?: string;
    explanation?: string;
  };
  prUrl?: string;
}

export interface FlakyTestCase {
  id: string;
  testTitle: string;
  repository: string; // e.g. "marine-api"
  filePath: string;
  stage: PipelineStage;
  victimTest: string;
  polluterTest: string;
  flakinessRate: number; // e.g. 56% under random order
  baselineRuns: number;
  detectedAt: string;
  orderSequence: {
    failingOrder: string[];
    passingOrder: string[];
  };
  rootCause: {
    description: string;
    singletonClass: string;
    leakExplanation: string;
  };
  candidatePatches: CandidatePatch[];
  activePatchIndex: number;
  sqliteAuditId: string;
}

export type AgentRole =
  | "Triage Specialist"
  | "Order Specialist"
  | "Async Specialist"
  | "Resource Specialist"
  | "Synthesizer Agent"
  | "Repair Agent (Nova 2 Lite)"
  | "Two-Blade Deterministic Gate"
  | "PR Evidence Agent";

export interface AIAgent {
  id: string;
  name: string;
  specialty: AgentRole;
  model: string; // "Amazon Nova 2 Lite via Bedrock" | "Deterministic AST/Replay (No AI)" | "Strands Core"
  status: "active" | "analyzing" | "evaluating" | "idle";
  currentTask: string;
  runsEvaluated: number;
  patchesProcessed: number;
}

export interface AgentLog {
  id: string;
  agentId: string;
  agentName: string;
  message: string;
  timestamp: string;
  level: "info" | "diagnosis" | "gate_pass" | "gate_refusal" | "pr_opened";
  sqliteHash: string;
  testId?: string;
}

export interface GateMetric {
  id: string;
  label: string;
  count: number;
  percentage: number;
  verdictType: GateVerdict;
}
