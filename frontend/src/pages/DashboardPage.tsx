import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useReplay } from "../hooks/useReplay";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { NeedsYou } from "../components/dashboard/NeedsYou";
import { RunsList } from "../components/dashboard/RunsList";
import { AgentsPanel } from "../components/dashboard/AgentsPanel";
import { RunDetail } from "../components/dashboard/RunDetail";

export const DashboardPage: React.FC = () => {
  const { testCases, agents, agentsAttemptId, logs, tally, loading, error, lastUpdated } = useReplay();
  const [params, setParams] = useSearchParams();
  const selected = testCases.find((t) => String(t.attemptId) === params.get("run")) ?? null;
  const open = useCallback((attemptId: number) => setParams({ run: String(attemptId) }), [setParams]);
  const close = useCallback(() => setParams({}), [setParams]);
  const running = testCases.some((t) => t.status === "RUNNING");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader tally={tally} lastUpdated={lastUpdated} error={error} running={running} />

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            The data API is not reachable ({error}). Start it with{" "}
            <code className="font-mono text-xs">python -m uvicorn dashboard.app:app --port 8000</code>.
          </p>
        ) : loading ? (
          <p className="text-sm text-foreground/60">Loading recorded runs</p>
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
  );
};
