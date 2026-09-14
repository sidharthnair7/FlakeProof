import React from "react";
import type { AIAgent } from "../../lib/types";

interface AgentsPanelProps {
  agents: AIAgent[];
  attemptId: number | null;
  onOpen: (attemptId: number) => void;
}

/** Only the agents that did something in the run, so nothing on screen is decoration. */
export const AgentsPanel: React.FC<AgentsPanelProps> = ({ agents, attemptId, onOpen }) => {
  if (attemptId === null || agents.length === 0) return null;
  const acted = agents.filter((a) => a.status === "running" || a.activity.value > 0);
  const idle = agents.filter((a) => !acted.includes(a));

  return (
    <section aria-labelledby="agents-heading">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="agents-heading" className="text-base font-semibold text-foreground">
          Who acted in run #{attemptId}
        </h2>
        <button
          type="button"
          onClick={() => onOpen(attemptId)}
          className="text-sm text-navy underline-offset-2 hover:underline"
        >
          Open run #{attemptId}
        </button>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        The latest run with agents. They run on Amazon Nova 2 Lite through Strands Agents. The gate is plain code, and no
        model decides its verdict.
      </p>

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
        {acted.map((a) => (
          <li key={a.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:gap-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {a.name}
                {a.status === "running" && <span className="ml-2 text-xs font-normal text-status-teal">working now</span>}
              </p>
              <p className="text-sm text-foreground/60">{a.role.replace(/^Swarm: /, "")}</p>
            </div>
            <div className="text-sm text-foreground/70 sm:text-right">
              <p>
                {a.activity.value} {a.activity.label}, {a.output.value} {a.output.label}
              </p>
              <p className="max-w-[20rem] truncate font-mono text-xs text-foreground/50" title={a.lastAction}>
                Last: {a.id === "gate" ? a.lastAction : a.lastAction.split(" ")[0]}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {idle.length > 0 && (
        <p className="mt-2 text-sm text-foreground/50">Did not act in this run: {idle.map((a) => a.name).join(", ")}.</p>
      )}
    </section>
  );
};
