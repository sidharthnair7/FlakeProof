import React, { useState } from "react";
import { useReplay } from "../hooks/useReplay";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { AgentRail } from "../components/dashboard/AgentRail";
import { KanbanBoard } from "../components/dashboard/KanbanBoard";
import { MetricsAndActivityRail } from "../components/dashboard/MetricsAndActivityRail";
import { CardDetailModal } from "../components/dashboard/CardDetailModal";

export const DashboardPage: React.FC = () => {
  const { testCases, agents, agentsAttemptId, logs, metrics, tally, loading, error, lastUpdated, refresh } =
    useReplay();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedTest = testCases.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <DashboardHeader tally={tally} lastUpdated={lastUpdated} error={error} loading={loading} onRefresh={refresh} />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <AgentRail agents={agents} attemptId={agentsAttemptId} />
        <KanbanBoard testCases={testCases} loading={loading} error={error} onSelectTest={(t) => setSelectedId(t.id)} />
        <MetricsAndActivityRail metrics={metrics} tally={tally} logs={logs} />
      </div>

      <CardDetailModal test={selectedTest} onClose={() => setSelectedId(null)} />
    </div>
  );
};
