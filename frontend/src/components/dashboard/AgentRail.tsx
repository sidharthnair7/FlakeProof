import React from "react";
import type { AIAgent } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { motion } from "motion/react";
import { Bot, ShieldCheck, CheckCircle2, Layers } from "lucide-react";

interface AgentRailProps {
  agents: AIAgent[];
}

export const AgentRail: React.FC<AgentRailProps> = ({ agents }) => {
  return (
    <aside className="w-full lg:w-72 xl:w-80 border-r border-border bg-surface-subtle/40 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
      {/* Rail Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/80">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-navy" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Swarm &amp; Gate Agents
          </h2>
        </div>
        <Badge variant="teal" size="sm">
          {agents.length} Online
        </Badge>
      </div>

      {/* Agents List */}
      <div className="space-y-3">
        {agents.map((agent) => {
          const isGate = agent.id === "agent-gate";
          const isWorking = agent.status !== "idle";
          const statusColor =
            agent.status === "evaluating"
              ? "bg-navy"
              : agent.status === "analyzing"
              ? "bg-status-amber"
              : agent.status === "active"
              ? "bg-status-teal"
              : "bg-slate-400";

          return (
            <div
              key={agent.id}
              className={`p-3.5 rounded-xl bg-surface border transition-all duration-200 ${
                isGate
                  ? "border-navy-300 shadow-sm bg-slate-50/50"
                  : "border-border shadow-xs hover:border-navy-300"
              }`}
            >
              {/* Agent Header & Status Dot */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    {isGate ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-navy shrink-0" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-status-teal shrink-0" />
                    )}
                    <span className="text-xs font-bold text-foreground">
                      {agent.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-foreground/60 font-mono">
                    {agent.model}
                  </p>
                </div>

                {/* Pulsing Status Dot */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="relative flex h-2.5 w-2.5">
                    {isWorking && (
                      <motion.span
                        className={`absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75`}
                        animate={{
                          scale: [1, 2, 1],
                          opacity: [0.75, 0, 0.75],
                        }}
                        transition={{
                          duration: 1.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColor}`}
                    />
                  </span>
                  <span className="text-[10px] font-mono capitalize font-medium text-foreground/70">
                    {agent.status}
                  </span>
                </div>
              </div>

              {/* Current Task Description */}
              <div className="mt-2.5 p-2 rounded-lg bg-surface-subtle border border-border/60">
                <span className="text-[9px] font-mono text-foreground/50 uppercase tracking-tight block mb-0.5">
                  Task Execution
                </span>
                <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-2">
                  {agent.currentTask}
                </p>
              </div>

              {/* Live Resource & Metrics telemetry */}
              <div className="mt-2.5 pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-[10px] font-mono text-foreground/60">
                <div className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-foreground/40" />
                  <span>{agent.runsEvaluated} runs</span>
                </div>
                <div className="flex items-center gap-1 text-status-teal font-medium">
                  <CheckCircle2 className="w-3 h-3 text-status-teal" />
                  <span>{agent.patchesProcessed} patches</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
