import React, { useState } from "react";
import type { AgentLog } from "../../lib/types";
import { GATE_VERDICT_METRICS } from "../../lib/mockData";
import {
  PieChart,
  Terminal,
  Bot,
  Database,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface MetricsAndActivityRailProps {
  logs: AgentLog[];
}

export const MetricsAndActivityRail: React.FC<MetricsAndActivityRailProps> = ({
  logs,
}) => {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredLogs = logs.filter((log) => {
    if (filterType === "all") return true;
    if (filterType === "verdicts") {
      return log.level === "gate_pass" || log.level === "gate_refusal" || log.level === "pr_opened";
    }
    if (filterType === "diagnosis") {
      return log.level === "diagnosis" || log.level === "info";
    }
    return true;
  });

  return (
    <aside className="w-full lg:w-80 xl:w-96 border-l border-border bg-surface-subtle/40 p-4 flex flex-col gap-5 shrink-0 overflow-y-auto">
      {/* 1. Gate Verdict Distribution */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-navy" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Gate Verdict Distribution
            </h2>
          </div>
          <span className="text-[11px] font-mono text-foreground/50">
            242 Evaluations
          </span>
        </div>

        <div className="space-y-3">
          {GATE_VERDICT_METRICS.map((metric) => (
            <div key={metric.id} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground/80 font-medium truncate max-w-[210px]">
                  {metric.label}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {metric.percentage}%
                </span>
              </div>

              {/* Progress bar */}
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
                <span>{metric.count} candidate patches</span>
                <span>
                  {metric.verdictType === "VERIFIED"
                    ? "Passed Both Blades"
                    : metric.verdictType === "REFUSED_BANDAID"
                    ? "Mask Refused"
                    : "Blade 1 Failed"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Real-Time SQLite Activity Log Stream */}
      <div className="flex-1 flex flex-col min-h-[350px] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-navy" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              SQLite Audit Stream
            </h2>
          </div>

          {/* Filter Pills */}
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

        {/* Log rows */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredLogs.map((log) => {
            const getIcon = () => {
              switch (log.level) {
                case "gate_pass":
                case "pr_opened":
                  return <ShieldCheck className="w-3.5 h-3.5 text-status-teal shrink-0" />;
                case "gate_refusal":
                  return <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
                case "diagnosis":
                  return <Bot className="w-3.5 h-3.5 text-status-amber shrink-0" />;
                default:
                  return <Database className="w-3.5 h-3.5 text-navy shrink-0" />;
              }
            };

            return (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-surface border border-border/80 shadow-2xs text-xs space-y-1.5 hover:border-navy-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 font-medium text-foreground/85">
                    {getIcon()}
                    <span className="truncate max-w-[140px]">{log.agentName}</span>
                  </span>
                  <div className="flex items-center gap-1.5 text-foreground/40 shrink-0">
                    <span className="px-1 py-0.2 rounded bg-surface-subtle border border-border text-[9px]">
                      {log.sqliteHash}
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
                <p className="text-[11px] text-foreground/75 leading-relaxed pl-5 font-mono">
                  {log.message}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
