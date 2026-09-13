import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import {
  ShieldCheck,
  Play,
  Pause,
  StepForward,
  PlusCircle,
  RotateCcw,
  GitBranch,
  ArrowLeft,
} from "lucide-react";

interface DashboardHeaderProps {
  isRunning: boolean;
  speedMultiplier: number;
  activeSeed: number;
  activeBranch: string;
  onTogglePause: () => void;
  onSetSpeed: (speed: number) => void;
  onStepNext: () => void;
  onTriggerFlake: () => void;
  onReset: () => void;
  onBranchChange: (branch: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  isRunning,
  speedMultiplier,
  activeSeed,
  activeBranch,
  onTogglePause,
  onSetSpeed,
  onStepNext,
  onTriggerFlake,
  onReset,
  onBranchChange,
}) => {
  return (
    <header className="border-b border-border bg-surface px-4 py-3 sm:px-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Brand, Breadcrumb & Branch */}
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
            <span className="font-bold text-sm tracking-tight text-foreground">
              FlakeProof Console
            </span>
            <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              AWS Agents for Humans Hackathon
            </span>
          </div>

          <span className="text-border">/</span>

          {/* Repository Branch selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-subtle border border-border text-xs font-mono">
            <GitBranch className="w-3.5 h-3.5 text-foreground/60" />
            <select
              value={activeBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="bg-transparent border-none text-foreground font-medium focus:outline-none cursor-pointer"
            >
              <option value="main">marine-api (main)</option>
              <option value="spring-sec">spring-security (PR #8921)</option>
              <option value="hikari-pool">HikariCP-benchmark</option>
            </select>
          </div>

          {/* Active Seed Tag */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-subtle border border-border text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-status-teal animate-pulse" />
            <span className="text-foreground/60">Permutation Seed:</span>
            <span className="text-foreground font-bold">#{activeSeed}</span>
          </div>
        </div>

        {/* Right: Simulation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Play */}
          <Button
            variant={isRunning ? "secondary" : "primary"}
            size="sm"
            onClick={onTogglePause}
            icon={isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          >
            {isRunning ? "Pause Gate" : "Resume"}
          </Button>

          {/* Step Next */}
          <Button
            variant="outline"
            size="sm"
            onClick={onStepNext}
            icon={<StepForward className="w-3.5 h-3.5" />}
            title="Advance the next pending card through the Two-Blade Gate pipeline"
          >
            Step
          </Button>

          {/* Speed Toggle */}
          <div className="flex items-center rounded-md border border-border bg-surface-subtle p-0.5 text-xs font-mono">
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => onSetSpeed(speed)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  speedMultiplier === speed
                    ? "bg-navy text-white shadow-xs"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Trigger New Flake */}
          <Button
            variant="amber"
            size="sm"
            onClick={onTriggerFlake}
            icon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            Simulate Flake
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            title="Reset to default dataset"
          >
            Reset
          </Button>
        </div>
      </div>
    </header>
  );
};
