import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { ShieldCheck, RefreshCw, ArrowLeft, Database } from "lucide-react";
import type { Tally } from "../../lib/types";

interface DashboardHeaderProps {
  tally: Tally | null;
  lastUpdated: Date | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ tally, lastUpdated, error, loading, onRefresh }) => {
  const connected = !error && !loading;

  return (
    <header className="border-b border-border bg-surface px-4 py-3 sm:px-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: brand and data source */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Landing</span>
          </Link>

          <span className="text-border">/</span>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-navy flex items-center justify-center text-white text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-status-teal-border" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">FlakeProof Console</span>
            <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              AWS Agents for Humans Hackathon
            </span>
          </div>

          <span className="text-border">/</span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-subtle border border-border text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-status-teal animate-pulse" : "bg-status-amber"}`} />
            <Database className="w-3.5 h-3.5 text-foreground/60" />
            <span className="text-foreground/80">
              {error ? `API unreachable: ${error}` : loading ? "Connecting to the API" : "Live from data/runs.db"}
            </span>
          </div>
        </div>

        {/* Right: what is recorded, and a manual refresh */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-foreground/70">
          {tally && (
            <span>
              {tally.attempts} attempts · {tally.attempted} candidates judged · {tally.runs} JVM runs
            </span>
          )}
          {lastUpdated && <span className="text-foreground/50">updated {lastUpdated.toLocaleTimeString()}</span>}
          <Button variant="outline" size="sm" onClick={onRefresh} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
};
