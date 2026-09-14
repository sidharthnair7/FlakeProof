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
  const { testCases, agents, agentsAttemptId, logs, tally, loading, error, lastUpdated } = useReplay();
  const [params, setParams] = useSearchParams();
  const selected = testCases.find((t) => String(t.attemptId) === params.get("run")) ?? null;
  const open = useCallback((attemptId: number) => setParams({ run: String(attemptId) }), [setParams]);
  const close = useCallback(() => setParams({}), [setParams]);
  const running = testCases.some((t) => t.status === "RUNNING");

  return (
    <div className="relative min-h-screen bg-[#FAFAF9] text-foreground overflow-x-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAFAF9]/20 to-[#FAFAF9]/50 pointer-events-none" />
      </div>

      <div className="relative z-10">
        <DashboardHeader tally={tally} lastUpdated={lastUpdated} error={error} running={running} />

        <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
          {loading && !testCases.length ? (
            <p className="text-sm text-foreground/60">Loading recorded runs...</p>
          ) : error && !testCases.length ? (
            <div className="rounded-xl border border-red-200/80 bg-white/90 px-4 py-3 text-sm text-red-900 shadow-card">
              The recorded evidence is unavailable. This dashboard intentionally does not substitute illustrative data for live audit records.
            </div>
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
