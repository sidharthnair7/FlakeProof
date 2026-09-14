import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useReplay } from "../hooks/useReplay";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { NeedsYou } from "../components/dashboard/NeedsYou";
import { RunsList } from "../components/dashboard/RunsList";
import { AgentsPanel } from "../components/dashboard/AgentsPanel";
import { RunDetail } from "../components/dashboard/RunDetail";
import { ColorBends } from "../components/ui/ColorBends";

export const DashboardPage: React.FC = () => {
  const { testCases, agents, agentsAttemptId, logs, tally, loading, error, isDemoMode, lastUpdated } = useReplay();
  const [params, setParams] = useSearchParams();
  const selected = testCases.find((t) => String(t.attemptId) === params.get("run")) ?? null;
  const open = useCallback((attemptId: number) => setParams({ run: String(attemptId) }), [setParams]);
  const close = useCallback(() => setParams({}), [setParams]);
  const running = testCases.some((t) => t.status === "RUNNING");

  return (
    <div className="relative min-h-screen bg-[#FAFAF9] text-foreground overflow-x-hidden">
      {/* Prismatic WebGL Wave Background matching the Landing Page Prism */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
        <ColorBends
          colors={["#0D9488", "#06B6D4", "#3B82F6", "#6366F1", "#A855F7", "#EC4899", "#F59E0B", "#10B981"]}
          rotation={45}
          speed={0.12}
          scale={1.1}
          frequency={0.85}
          warpStrength={0.7}
          mouseInfluence={0.4}
          parallax={0.25}
          noise={0.03}
          iterations={1}
          intensity={1.15}
          bandWidth={5.5}
          transparent={true}
        />
        {/* Soft, calming ambient wash ensuring cards and metrics remain the focal point */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAFAF9]/20 to-[#FAFAF9]/50 pointer-events-none" />
      </div>

      <div className="relative z-10">
        <DashboardHeader tally={tally} lastUpdated={lastUpdated} error={error} running={running} />

        <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
          {isDemoMode && (
            <div className="rounded-xl border border-amber-200/80 bg-white/90 backdrop-blur-md px-4 py-3 text-xs text-amber-900 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-status-amber animate-pulse" />
                  <span className="font-bold font-mono uppercase tracking-wide text-amber-950">
                    Recorded Replay (Demo Mode)
                  </span>
                </div>
                <p className="text-amber-800">
                  Live backend is offline. Showing persisted SQLite audit runs and 4-agent swarm evidence. To run live:{" "}
                  <code className="font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 text-slate-900">
                    python -m uvicorn dashboard.app:app --port 8000
                  </code>
                </p>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-100 text-status-amber font-mono font-bold text-[11px] self-start sm:self-center border border-amber-200">
                All Features Interactive
              </span>
            </div>
          )}

          {loading && !testCases.length ? (
            <p className="text-sm text-foreground/60">Loading recorded runs...</p>
          ) : (
            <>
              <NeedsYou testCases={testCases} onOpen={open} />
              <RunsList testCases={testCases} onOpen={open} />
              <AgentsPanel agents={agents} attemptId={agentsAttemptId} onOpen={open} />
            </>
          )}
        </main>

        <RunDetail test={selected} logs={logs} onClose={close} />
      </div>
    </div>
  );
};
