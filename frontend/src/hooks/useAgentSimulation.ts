import { useState, useEffect, useCallback } from "react";
import type { FlakyTestCase, AIAgent, AgentLog, PipelineStage } from "../lib/types";
import {
  INITIAL_FLAKEPROOF_TESTS,
  FLAKEPROOF_AGENTS,
  FLAKEPROOF_SQLITE_LOGS,
} from "../lib/mockData";
import { formatTime } from "../lib/utils";

export function useAgentSimulation() {
  const [testCases, setTestCases] = useState<FlakyTestCase[]>(INITIAL_FLAKEPROOF_TESTS);
  const [agents, setAgents] = useState<AIAgent[]>(FLAKEPROOF_AGENTS);
  const [logs, setLogs] = useState<AgentLog[]>(FLAKEPROOF_SQLITE_LOGS);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [activeSeed, setActiveSeed] = useState<number>(849204);
  const [activeBranch, setActiveBranch] = useState<string>("main");
  const [selectedTest, setSelectedTest] = useState<FlakyTestCase | null>(null);

  // Advance single card through FlakeProof pipeline stages:
  // intake -> diagnosis -> gate -> verdict
  const advanceNextCard = useCallback(() => {
    setTestCases((prev) => {
      const priorityOrder: PipelineStage[] = ["gate", "diagnosis", "intake"];

      for (const currentStage of priorityOrder) {
        const candidateIndex = prev.findIndex((t) => t.stage === currentStage);
        if (candidateIndex !== -1) {
          const candidate = prev[candidateIndex];
          const nextStageMap: Record<PipelineStage, PipelineStage> = {
            intake: "diagnosis",
            diagnosis: "gate",
            gate: "verdict",
            verdict: "verdict",
          };

          const nextStage = nextStageMap[currentStage];
          const updated = [...prev];
          updated[candidateIndex] = {
            ...candidate,
            stage: nextStage,
            baselineRuns: candidate.baselineRuns + 15,
          };

          const timestamp = formatTime();
          const randomHash = `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`;
          let logMessage = "";
          let logLevel: AgentLog["level"] = "info";
          let agentId = "agent-triage";
          let agentName = "Triage Specialist";

          if (nextStage === "diagnosis") {
            agentId = "agent-order";
            agentName = "Order Specialist (Nova 2 Lite)";
            logLevel = "diagnosis";
            logMessage = `[Swarm Handoff] Order Specialist bisecting suite permutations for "${candidate.testTitle}"`;
          } else if (nextStage === "gate") {
            agentId = "agent-gate";
            agentName = "Deterministic Two-Blade Gate";
            logLevel = "info";
            logMessage = `[Two-Blade Gate] Running 200 random order runs (Blade 1) & AST scanner (Blade 2) on candidate patches`;
          } else if (nextStage === "verdict") {
            agentId = "agent-gate";
            agentName = "Deterministic Two-Blade Gate";
            logLevel = "gate_pass";
            logMessage = `[VERDICT: VERIFIED] Proven invariant across 200 order permutations with 0 band-aids. Dispatched PR.`;
          }

          setLogs((prevLogs) => [
            {
              id: `log-${Date.now()}-${Math.random()}`,
              agentId,
              agentName,
              message: logMessage,
              timestamp,
              level: logLevel,
              sqliteHash: randomHash,
              testId: candidate.id,
            },
            ...prevLogs.slice(0, 49),
          ]);

          return updated;
        }
      }

      return prev;
    });

    setActiveSeed((s) => s + Math.floor(Math.random() * 7) + 1);
  }, []);

  // Trigger new test run
  const triggerNewFlake = useCallback(() => {
    const newId = `marine-api-${Date.now()}`;
    const newTest: FlakyTestCase = {
      id: newId,
      testTitle: "SentenceParserTest.testCustomSentenceRegistration()",
      repository: "marine-api",
      filePath: "src/test/java/net/sf/marineapi/parser/SentenceParserTest.java",
      stage: "intake",
      victimTest: "testCustomSentenceRegistration()",
      polluterTest: "testClearParsersSingleton()",
      flakinessRate: 44,
      baselineRuns: 20,
      detectedAt: formatTime(),
      sqliteAuditId: `sqlite_run_0x${Math.random().toString(16).slice(2, 10)}`,
      orderSequence: {
        failingOrder: ["testClearParsersSingleton()", "testCustomSentenceRegistration()"],
        passingOrder: ["testCustomSentenceRegistration()", "testClearParsersSingleton()"],
      },
      rootCause: {
        description: "Shared SentenceFactory singleton purged by previous test without @AfterEach restore.",
        singletonClass: "SentenceFactory.getInstance()",
        leakExplanation: "Unregistered default parser map across test execution boundaries in JVM.",
      },
      activePatchIndex: 0,
      candidatePatches: [
        {
          id: `patch-verified-${Date.now()}`,
          label: "Maintainer Teardown Reset",
          approach: "Adds @After teardown restoring singleton state.",
          verdict: "VERIFIED",
          blade1Runs: { passedRuns: 200, totalRuns: 200, passRate: 100, passed: true },
          blade2Scan: { passed: true, explanation: "Clean AST. Zero band-aids." },
          diffSnippet: `@@ -20,3 +20,4 @@\n+ @After public void tearDown() { SentenceFactory.reset(); }`,
        },
      ],
    };

    setTestCases((prev) => [newTest, ...prev]);

    setLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        agentId: "agent-triage",
        agentName: "Triage Specialist",
        message: `[Intake] New order-dependent test detected in ${newTest.repository}: ${newTest.testTitle}`,
        timestamp: formatTime(),
        level: "info",
        sqliteHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        testId: newId,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Cycle active candidate patch for marine-api
  const selectPatch = useCallback((testId: string, patchIndex: number) => {
    setTestCases((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, activePatchIndex: patchIndex } : t))
    );
  }, []);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTestCases(INITIAL_FLAKEPROOF_TESTS);
    setAgents(FLAKEPROOF_AGENTS);
    setLogs(FLAKEPROOF_SQLITE_LOGS);
    setActiveSeed(849204);
  }, []);

  // Simulation timer
  useEffect(() => {
    if (!isRunning) return;

    const baseInterval = 4500;
    const intervalMs = Math.max(800, Math.floor(baseInterval / speedMultiplier));

    const timer = setInterval(() => {
      advanceNextCard();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, speedMultiplier, advanceNextCard]);

  return {
    testCases,
    agents,
    logs,
    isRunning,
    speedMultiplier,
    activeSeed,
    activeBranch,
    selectedTest,
    setActiveBranch,
    setSelectedTest,
    togglePause: () => setIsRunning((r) => !r),
    setSpeed: setSpeedMultiplier,
    stepNext: advanceNextCard,
    triggerNewFlake,
    selectPatch,
    resetSimulation,
  };
}
