import React, { useState } from "react";
import type { FlakyTestCase, PipelineStage } from "../../lib/types";
import { VerdictTag } from "./verdict";
import { GitBranchView } from "./GitBranchView";
import { GitBranch, Table } from "lucide-react";

interface RunsListProps {
  testCases: FlakyTestCase[];
  onOpen: (attemptId: number) => void;
}

const STAGE_TEXT: Record<PipelineStage, string> = {
  intake: "measuring the baseline",
  diagnosis: "agents are diagnosing",
  gate: "the gate is rerunning patches",
  verdict: "finishing",
};

function author(t: FlakyTestCase): string {
  const byAgents = t.candidatePatches.filter((p) => p.source === "agent").length;
  const planted = t.candidatePatches.length - byAgents;
  if (!t.agentsRan) return "Planted";
  return planted ? `Agents (${byAgents}), planted (${planted})` : `Agents (${byAgents})`;
}

function Outcome({ test }: { test: FlakyTestCase }) {
  if (test.status === "RUNNING") return <span className="text-status-teal">In progress: {STAGE_TEXT[test.stage]}</span>;
  if (test.status === "FAILED") return <span className="text-foreground/60">Stopped before finishing</span>;
  if (test.prUrl) {
    return (
      <a
        href={test.prUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-navy underline-offset-2 hover:underline"
      >
        Pull request #{test.prUrl.split("/").pop()}
      </a>
    );
  }
  if (test.verdict === "VERIFIED") return <span className="text-foreground/70">Verified, no pull request (dry run)</span>;
  if (test.candidatePatches.length === 0) return <span className="text-foreground/60">No patches judged</span>;
  return <span className="text-foreground/70">All refused, nothing proposed</span>;
}

export const RunsList: React.FC<RunsListProps> = ({ testCases, onOpen }) => {
  const [viewMode, setViewMode] = useState<"branch" | "table">("branch");
  const rows = [...testCases].sort((a, b) => b.attemptId - a.attemptId);

  return (
    <section aria-labelledby="runs-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="runs-heading" className="text-base font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-navy" />
            <span>Runs &amp; Repair Branches</span>
          </h2>
          <p className="text-xs text-foreground/60 mt-0.5">
            Visual Git branch tree of flaky test baselines, candidate patches, and proven pull request merges
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("branch")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "branch"
                ? "bg-navy text-white shadow-xs"
                : "text-foreground/70 hover:text-foreground hover:bg-surface-subtle"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Git Branch View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "table"
                ? "bg-navy text-white shadow-xs"
                : "text-foreground/70 hover:text-foreground hover:bg-surface-subtle"
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-6 text-sm text-foreground/60">
          No runs recorded yet. Start one with{" "}
          <code className="font-mono text-xs">python -m agent run --target marine-api</code>.
        </p>
      ) : viewMode === "branch" ? (
        <div className="mt-5">
          <GitBranchView testCases={testCases} onOpen={onOpen} />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-surface-subtle text-foreground/60">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Run</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Patches written by</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Before any fix</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Gate verdicts (reruns passed)</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((t) => (
                <tr
                  key={t.id}
                  tabIndex={0}
                  onClick={() => onOpen(t.attemptId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(t.attemptId);
                    }
                  }}
                  className="cursor-pointer align-top transition-colors hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">#{t.attemptId}</div>
                    <div className="whitespace-nowrap text-xs text-foreground/50">{t.createdAt}</div>
                  </td>
                  <td className="px-4 py-3 text-foreground/80">{author(t)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground/80">
                    {t.baselineRuns ? `${t.baselinePasses} of ${t.baselineRuns} passed` : "Not measured"}
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1">
                      {t.candidatePatches.map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                          <VerdictTag verdict={p.verdict} />
                          <span className="whitespace-nowrap text-xs text-foreground/50">
                            {p.blade1.runs ? `${p.blade1.passes}/${p.blade1.runs}` : "no reruns"}
                            {p.source === "agent" ? ", agent's patch" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">
                    <Outcome test={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
