import React, { useState } from "react";
import type { AgentLog, GateMetric, Tally } from "../../lib/types";
import { PieChart, Terminal, Bot, Database, ShieldCheck, XCircle } from "lucide-react";

interface MetricsAndActivityRailProps {
  metrics: GateMetric[];
  tally: Tally | null;
  logs: AgentLog[];
}

export const MetricsAndActivityRail: React.FC<MetricsAndActivityRailProps> = ({ metrics, tally, logs }) => {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredLogs = logs.filter((log) => {
    if (filterType === "verdicts") {
      return log.level === "gate_pass" || log.level === "gate_refusal" || log.level === "pr_opened";
    }
    if (filterType === "diagnosis") {
      return log.level === "diagnosis" || log.kind === "tool_call" || log.kind === "tool";
    }
    return true;
  });

  return (
    <aside className="w-full lg:w-80 xl:w-96 border-l border-border bg-surface-subtle/40 p-4 flex flex-col gap-5 shrink-0 overflow-y-auto">
      {/* 1. Gate verdicts across every recorded candidate */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-navy" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Gate Verdicts</h2>
          </div>
          <span className="text-[11px] font-mono text-foreground/50">{tally?.attempted ?? 0} candidates judged</span>
        </div>

        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.id} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground/80 font-medium truncate max-w-[210px]">{metric.label}</span>
                <span className="font-mono font-bold text-foreground">{metric.percentage}%</span>
              </div>

              <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border/60">
                <div
                  className={`h-full rounded-full ${
                    metric.verdictType === "VERIFIED"
                      ? "bg-status-teal"
                      : metric.verdictType === "REFUSED_BANDAID"
                        ? "bg-red-500"
                        : "bg-status-amber"
                  }`}
                  style={{ width: `${metric.percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-foreground/50 font-mono">
                <span>{metric.count} candidates</span>
                <span>
                  {metric.verdictType === "VERIFIED"
                    ? "Passed both blades"
                    : metric.verdictType === "REFUSED_BANDAID"
                      ? "Band-aid refused"
                      : "Not proven by Blade 1"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. The events table as a timeline */}
      <div className="flex-1 flex flex-col min-h-[350px] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-navy" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Agent Trace</h2>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-mono">
            {["all", "verdicts", "diagnosis"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-1.5 py-0.5 rounded capitalize transition-colors cursor-pointer ${
                  filterType === tab
                    ? "bg-navy text-white font-medium"
                    : "text-foreground/60 hover:text-foreground bg-surface border border-border"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredLogs.length === 0 && <p className="text-xs text-foreground/50 font-mono">No events recorded yet.</p>}
          {filteredLogs.map((log) => {
            const icon =
              log.level === "gate_pass" || log.level === "pr_opened" ? (
                <ShieldCheck className="w-3.5 h-3.5 text-status-teal shrink-0" />
              ) : log.level === "gate_refusal" ? (
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              ) : log.level === "diagnosis" ? (
                <Bot className="w-3.5 h-3.5 text-status-amber shrink-0" />
              ) : (
                <Database className="w-3.5 h-3.5 text-navy shrink-0" />
              );

            return (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-surface border border-border/80 shadow-2xs text-xs space-y-1.5 hover:border-navy-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 font-medium text-foreground/85">
                    {icon}
                    <span className="truncate max-w-[140px]">{log.agentName}</span>
                  </span>
                  <div className="flex items-center gap-1.5 text-foreground/40 shrink-0">
                    <span className="px-1 py-0.2 rounded bg-surface-subtle border border-border text-[9px]">{log.ref}</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
                <p className="text-[11px] text-foreground/75 leading-relaxed pl-5 font-mono break-words">{log.message}</p>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
