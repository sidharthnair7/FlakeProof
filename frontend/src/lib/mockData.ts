import type { GateVerdict, PipelineStage } from "./types";

export interface MockCandidatePatch {
  id: string;
  label: string;
  approach: string;
  diffSnippet: string;
  verdict: GateVerdict;
  blade1Runs: {
    passedRuns: number;
    totalRuns: number;
    passRate: number;
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

export interface MockFlakyTestCase {
  id: string;
  testTitle: string;
  repository: string;
  filePath: string;
  stage: PipelineStage;
  victimTest: string;
  polluterTest: string;
  flakinessRate: number;
  baselineRuns: number;
  detectedAt: string;
  sqliteAuditId: string;
  orderSequence: {
    failingOrder: string[];
    passingOrder: string[];
  };
  rootCause: {
    description: string;
    singletonClass: string;
    leakExplanation: string;
  };
  activePatchIndex: number;
  candidatePatches: MockCandidatePatch[];
}

export interface MockAIAgent {
  id: string;
  name: string;
  specialty: string;
  model: string;
  status: "active" | "analyzing" | "evaluating" | "idle";
  currentTask: string;
  runsEvaluated: number;
  patchesProcessed: number;
}

export interface MockAgentLog {
  id: string;
  agentId: string;
  agentName: string;
  message: string;
  timestamp: string;
  level: "info" | "diagnosis" | "gate_pass" | "gate_refusal" | "pr_opened";
  sqliteHash: string;
  testId?: string;
}

export interface MockGateMetric {
  id: string;
  label: string;
  count: number;
  percentage: number;
  verdictType: GateVerdict;
}

export const FLAKEPROOF_AGENTS: MockAIAgent[] = [
  {
    id: "agent-triage",
    name: "Triage Specialist",
    specialty: "Triage Specialist",
    model: "Amazon Nova 2 Lite (Bedrock)",
    status: "active",
    currentTask: "Analyzing test runner baseline and stack trace signatures on marine-api",
    runsEvaluated: 142,
    patchesProcessed: 89,
  },
  {
    id: "agent-order",
    name: "Order Specialist",
    specialty: "Order Specialist",
    model: "Amazon Nova 2 Lite (Bedrock)",
    status: "analyzing",
    currentTask: "Pinpointing polluter-victim pair: SentenceFactoryTest.testDeleteParser() → PositionProviderTest",
    runsEvaluated: 218,
    patchesProcessed: 104,
  },
  {
    id: "agent-async",
    name: "Async Specialist",
    specialty: "Async Specialist",
    model: "Amazon Nova 2 Lite (Bedrock)",
    status: "idle",
    currentTask: "Standby: Verified no unhandled threads or countdown latches in marine-api",
    runsEvaluated: 76,
    patchesProcessed: 42,
  },
  {
    id: "agent-resource",
    name: "Resource Specialist",
    specialty: "Resource Specialist",
    model: "Amazon Nova 2 Lite (Bedrock)",
    status: "analyzing",
    currentTask: "Inspecting SentenceFactory.getInstance() shared singleton state between test boundaries",
    runsEvaluated: 185,
    patchesProcessed: 97,
  },
  {
    id: "agent-repair",
    name: "Repair Agent",
    specialty: "Repair Agent (Nova 2 Lite)",
    model: "Amazon Nova 2 Lite (Bedrock)",
    status: "active",
    currentTask: "Synthesizing hermetic @AfterEach singleton reset candidate patches",
    runsEvaluated: 320,
    patchesProcessed: 156,
  },
  {
    id: "agent-gate",
    name: "Deterministic Two-Blade Gate",
    specialty: "Two-Blade Deterministic Gate",
    model: "Deterministic Java Runner + AST Scanner (Zero AI)",
    status: "evaluating",
    currentTask: "Executing 200 random order permutations (Blade 1) & scanning AST for band-aids (Blade 2)",
    runsEvaluated: 8420,
    patchesProcessed: 284,
  },
];

export const MARINE_API_TEST_CASE: MockFlakyTestCase = {
  id: "marine-api-01",
  testTitle: "PositionProviderTest.testGLLSentence()",
  repository: "marine-api (open-source Java NMEA library)",
  filePath: "src/test/java/net/sf/marineapi/provider/PositionProviderTest.java",
  stage: "verdict",
  victimTest: "PositionProviderTest.testGLLSentence()",
  polluterTest: "SentenceFactoryTest.testDeleteParser()",
  flakinessRate: 56,
  baselineRuns: 30,
  detectedAt: "AWS Hackathon Demo Suite",
  sqliteAuditId: "sqlite_run_0x8f2a9d41",
  orderSequence: {
    failingOrder: [
      "net.sf.marineapi.parser.SentenceFactoryTest.testDeleteParser()",
      "net.sf.marineapi.provider.PositionProviderTest.testGLLSentence()",
    ],
    passingOrder: [
      "net.sf.marineapi.provider.PositionProviderTest.testGLLSentence()",
      "net.sf.marineapi.parser.SentenceFactoryTest.testDeleteParser()",
    ],
  },
  rootCause: {
    description:
      "SentenceFactoryTest.testDeleteParser() deletes the GLL sentence parser from the shared SentenceFactory singleton and never resets it. When PositionProviderTest executes after that test, it cannot parse NMEA GPS coordinates and crashes with an IllegalArgumentException.",
    singletonClass: "net.sf.marineapi.parser.SentenceFactory.getInstance()",
    leakExplanation:
      "Global singleton state persists across JUnit test executions in the same JVM process without @AfterEach teardown.",
  },
  activePatchIndex: 2, // Default to the verified maintainer fix
  candidatePatches: [
    {
      id: "patch-unproven",
      label: "Candidate 1: Incomplete Parser Restore",
      approach: "Attempts to register a replacement parser, but instantiates the wrong parser class.",
      verdict: "REFUSED_UNPROVEN",
      blade1Runs: {
        passedRuns: 13,
        totalRuns: 30,
        passRate: 43.3,
        passed: false,
        failureDetail: "Failed 17/30 random order permutations. Unproven invariance.",
      },
      blade2Scan: {
        passed: true,
        explanation: "No band-aids detected in AST. But rejected by Blade 1 because 17 runs failed.",
      },
      diffSnippet: `--- a/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
+++ b/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
@@ -42,3 +42,6 @@ public class SentenceFactoryTest {
   factory.deleteParser("GLL");
+  // BUGGY RESTORE: Registers GGA parser instead of GLL parser
+  factory.registerParser("GLL", GGASentenceParser.class);
 }`,
    },
    {
      id: "patch-bandaid",
      label: "Candidate 2: @Ignore on Polluter Test",
      approach: "Annotates SentenceFactoryTest.testDeleteParser() with @Ignore to hide the damage.",
      verdict: "REFUSED_BANDAID",
      blade1Runs: {
        passedRuns: 200,
        totalRuns: 200,
        passRate: 100,
        passed: true,
        failureDetail: "Passed 200/200 permutation runs. (Passed Blade 1)",
      },
      blade2Scan: {
        passed: false,
        detectedBandAid: "@Ignore",
        offendingLine: "@Ignore(\"Temporarily disabled due to order-dependent flake\")",
        explanation:
          "Blade 2 scanned the patch AST and detected an explicit band-aid mask: @Ignore. REFUSED even though every run passed!",
      },
      diffSnippet: `--- a/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
+++ b/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
@@ -38,4 +38,5 @@ public class SentenceFactoryTest {
+  @Ignore("Temporarily disabled due to order-dependent flake")
   @Test
   public void testDeleteParser() {`,
    },
    {
      id: "patch-verified",
      label: "Candidate 3: Maintainer Fix (Teardown Reset)",
      approach: "Adds @AfterEach / tearDown() method to reset the SentenceFactory singleton to default parsers after every test.",
      verdict: "VERIFIED",
      blade1Runs: {
        passedRuns: 200,
        totalRuns: 200,
        passRate: 100,
        passed: true,
        failureDetail: "Passed 200/200 randomized order permutation replays. 0 flakes observed.",
      },
      blade2Scan: {
        passed: true,
        explanation: "Blade 2 AST scan: Clean. Zero sleeps, retries, @Ignore, or pinned orders. Pure hermetic fix.",
      },
      prUrl: "https://github.com/openbase/marine-api/pull/142",
      diffSnippet: `--- a/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
+++ b/src/test/java/net/sf/marineapi/parser/SentenceFactoryTest.java
@@ -24,4 +24,8 @@ public class SentenceFactoryTest {
+  @After
+  public void tearDown() {
+    SentenceFactory.reset(); // Restores clean singleton parser registry
+  }
+
   @Test
   public void testDeleteParser() {`,
    },
  ],
};

export const INITIAL_FLAKEPROOF_TESTS: MockFlakyTestCase[] = [
  MARINE_API_TEST_CASE,
  {
    id: "test-rbac-java",
    testTitle: "SecurityContextHolderTest.testAnonymousAccess()",
    repository: "spring-security-oauth",
    filePath: "src/test/java/org/springframework/security/oauth/SecurityContextHolderTest.java",
    stage: "gate",
    victimTest: "testAnonymousAccess()",
    polluterTest: "testAdminAuthenticationToken()",
    flakinessRate: 48,
    baselineRuns: 40,
    detectedAt: "10:14:02",
    sqliteAuditId: "sqlite_run_0x44b912ee",
    orderSequence: {
      failingOrder: ["AdminAuthTest", "SecurityContextHolderTest"],
      passingOrder: ["SecurityContextHolderTest", "AdminAuthTest"],
    },
    rootCause: {
      description: "ThreadLocal SecurityContext retains previous user principal across runner iterations.",
      singletonClass: "SecurityContextHolder.getContext()",
      leakExplanation: "Missing SecurityContextHolder.clearContext() in teardown hook.",
    },
    activePatchIndex: 0,
    candidatePatches: [
      {
        id: "rbac-patch-1",
        label: "Candidate: SecurityContextHolder.clearContext()",
        approach: "Adds @AfterEach teardown to clear ThreadLocal context.",
        verdict: "VERIFIED",
        blade1Runs: {
          passedRuns: 200,
          totalRuns: 200,
          passRate: 100,
          passed: true,
        },
        blade2Scan: {
          passed: true,
          explanation: "Clean AST. Zero band-aids.",
        },
        prUrl: "https://github.com/spring-projects/spring-security/pull/8921",
        diffSnippet: `@@ -15,3 +15,5 @@
+  @AfterEach
+  void clear() { SecurityContextHolder.clearContext(); }`,
      },
    ],
  },
  {
    id: "test-hikari-pool",
    testTitle: "ConnectionPoolLeakTest.testBorrowTimeout()",
    repository: "HikariCP-benchmark",
    filePath: "src/test/java/com/zaxxer/hikari/ConnectionPoolLeakTest.java",
    stage: "intake",
    victimTest: "testBorrowTimeout()",
    polluterTest: "testUnclosedResultSet()",
    flakinessRate: 35,
    baselineRuns: 25,
    detectedAt: "10:22:15",
    sqliteAuditId: "sqlite_run_0x91cc22a1",
    orderSequence: {
      failingOrder: ["testUnclosedResultSet", "testBorrowTimeout"],
      passingOrder: ["testBorrowTimeout", "testUnclosedResultSet"],
    },
    rootCause: {
      description: "Active JDBC connection unclosed in previous test exhausts mock connection pool.",
      singletonClass: "HikariDataSource.getConnection()",
      leakExplanation: "Pool size of 5 exhausted by unclosed connection in previous suite.",
    },
    activePatchIndex: 0,
    candidatePatches: [
      {
        id: "hikari-patch-sleep",
        label: "Candidate: Thread.sleep(500)",
        approach: "Adds sleep(500) to wait for pool eviction.",
        verdict: "REFUSED_BANDAID",
        blade1Runs: {
          passedRuns: 200,
          totalRuns: 200,
          passRate: 100,
          passed: true,
        },
        blade2Scan: {
          passed: false,
          detectedBandAid: "sleep",
          offendingLine: "Thread.sleep(500); // Wait for connection cleanup",
          explanation: "Blade 2 refused: Thread.sleep is a mask, not a proof. REFUSED_BANDAID.",
        },
        diffSnippet: `@@ -31,3 +31,4 @@
+  Thread.sleep(500); // Wait for connection cleanup`,
      },
    ],
  },
];

export const FLAKEPROOF_SQLITE_LOGS: MockAgentLog[] = [
  {
    id: "sql-log-1",
    agentId: "agent-gate",
    agentName: "Two-Blade Deterministic Gate",
    message:
      "[VERDICT: VERIFIED] marine-api Candidate 3 passed Blade 1 (200/200 permutation runs) & Blade 2 (0 band-aids). Dispatched to PR Agent.",
    timestamp: "10:28:44",
    level: "gate_pass",
    sqliteHash: "0x3f7a...9d21",
    testId: "marine-api-01",
  },
  {
    id: "sql-log-2",
    agentId: "agent-gate",
    agentName: "Two-Blade Deterministic Gate",
    message:
      "[VERDICT: REFUSED_BANDAID] marine-api Candidate 2 passed all 200 runs, but Blade 2 detected '@Ignore'. REFUSED with offending line.",
    timestamp: "10:26:12",
    level: "gate_refusal",
    sqliteHash: "0x88c1...e45a",
    testId: "marine-api-01",
  },
  {
    id: "sql-log-3",
    agentId: "agent-gate",
    agentName: "Two-Blade Deterministic Gate",
    message:
      "[VERDICT: REFUSED_UNPROVEN] marine-api Candidate 1 failed 17/30 random order runs (wrong parser class GGASentenceParser). REFUSED.",
    timestamp: "10:24:05",
    level: "gate_refusal",
    sqliteHash: "0x12bb...76ca",
    testId: "marine-api-01",
  },
  {
    id: "sql-log-4",
    agentId: "agent-repair",
    agentName: "Repair Agent",
    message:
      "[Nova 2 Lite] Synthesized 3 candidate patches for marine-api singleton pollution (teardown reset, ignore mask, class restore).",
    timestamp: "10:22:30",
    level: "diagnosis",
    sqliteHash: "0x54ee...21dd",
    testId: "marine-api-01",
  },
  {
    id: "sql-log-5",
    agentId: "agent-order",
    agentName: "Order Specialist",
    message:
      "[Swarm Handoff] Pinpointed minimal polluter-victim pair: SentenceFactoryTest.testDeleteParser() → PositionProviderTest.",
    timestamp: "10:21:18",
    level: "diagnosis",
    sqliteHash: "0x99aa...3341",
    testId: "marine-api-01",
  },
  {
    id: "sql-log-6",
    agentId: "agent-triage",
    agentName: "Triage Specialist",
    message:
      "[Intake Baseline] Executed 30 baseline runs of PositionProviderTest. Flakiness rate: 56.7%. Classified: ORDER-DEPENDENT.",
    timestamp: "10:20:02",
    level: "info",
    sqliteHash: "0x00ff...8899",
    testId: "marine-api-01",
  },
];

export const GATE_VERDICT_METRICS: MockGateMetric[] = [
  {
    id: "gm-verified",
    label: "VERIFIED (Proven & Merged)",
    count: 148,
    percentage: 61.2,
    verdictType: "VERIFIED",
  },
  {
    id: "gm-bandaid",
    label: "REFUSED_BANDAID (Sleep / Retry / @Ignore)",
    count: 64,
    percentage: 26.4,
    verdictType: "REFUSED_BANDAID",
  },
  {
    id: "gm-unproven",
    label: "REFUSED_UNPROVEN (Failed 200 Replays)",
    count: 30,
    percentage: 12.4,
    verdictType: "REFUSED_UNPROVEN",
  },
];
