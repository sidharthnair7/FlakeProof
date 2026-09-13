import React from "react";
import { useAgentSimulation } from "../hooks/useAgentSimulation";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { AgentRail } from "../components/dashboard/AgentRail";
import { KanbanBoard } from "../components/dashboard/KanbanBoard";
import { MetricsAndActivityRail } from "../components/dashboard/MetricsAndActivityRail";
import { CardDetailModal } from "../components/dashboard/CardDetailModal";

export const DashboardPage: React.FC = () => {
  const {
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
    togglePause,
    setSpeed,
    stepNext,
    triggerNewFlake,
    selectPatch,
    resetSimulation,
  } = useAgentSimulation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Header */}
      <DashboardHeader
        isRunning={isRunning}
        speedMultiplier={speedMultiplier}
        activeSeed={activeSeed}
        activeBranch={activeBranch}
        onTogglePause={togglePause}
        onSetSpeed={setSpeed}
        onStepNext={stepNext}
        onTriggerFlake={triggerNewFlake}
        onReset={resetSimulation}
        onBranchChange={setActiveBranch}
      />

      {/* Main 3-Pane Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Swarm & Gate Agent Rail */}
        <AgentRail agents={agents} />

        {/* Center: 4-Column Pipeline Kanban Board */}
        <KanbanBoard
          testCases={testCases}
          onSelectTest={setSelectedTest}
        />

        {/* Right: Gate Verdict Metrics & SQLite Audit Trail */}
        <MetricsAndActivityRail logs={logs} />
      </div>

      {/* Card Detail / Two-Blade Gate Modal */}
      <CardDetailModal
        test={selectedTest}
        onClose={() => setSelectedTest(null)}
        onSelectPatch={selectPatch}
      />
    </div>
  );
};
