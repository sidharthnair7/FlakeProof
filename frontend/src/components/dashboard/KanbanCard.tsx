import React from "react";
import { motion } from "motion/react";
import type { FlakyTestCase } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { FileCode, GitPullRequest, ArrowRight, ShieldCheck, XCircle, ShieldAlert, Layers } from "lucide-react";

interface KanbanCardProps {
  test: FlakyTestCase;
  onSelect: (test: FlakyTestCase) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ test, onSelect }) => {
  const isVerdict = test.stage === "verdict";
  const activePatch = test.candidatePatches[test.activePatchIndex] || test.candidatePatches[0];

  return (
    <motion.div
      layoutId={test.id}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 30,
        mass: 0.8,
      }}
      onClick={() => onSelect(test)}
      className="group relative rounded-xl bg-surface p-4 border border-border shadow-xs hover:shadow-card-hover hover:border-navy-400/80 transition-all duration-200 cursor-pointer select-none"
    >
      {/* Top row: Badges and Seed */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {isVerdict ? (
          <Badge
            variant={
              activePatch.verdict === "VERIFIED"
                ? "teal"
                : activePatch.verdict === "REFUSED_BANDAID"
                ? "amber"
                : "neutral"
            }
            size="sm"
          >
            {activePatch.verdict === "VERIFIED" ? (
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-status-teal" /> VERIFIED
              </span>
            ) : activePatch.verdict === "REFUSED_BANDAID" ? (
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-600" /> REFUSED_BANDAID
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-status-amber" /> REFUSED_UNPROVEN
              </span>
            )}
          </Badge>
        ) : test.stage === "gate" ? (
          <Badge variant="navy" size="sm">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" /> Two-Blade Gate
            </span>
          </Badge>
        ) : test.stage === "diagnosis" ? (
          <Badge variant="teal" size="sm">
            Swarm Diagnosis
          </Badge>
        ) : (
          <Badge variant="amber" size="sm">
            Baseline Intake
          </Badge>
        )}

        <span className="text-[10px] font-mono text-foreground/50">
          {test.sqliteAuditId.slice(0, 15)}
        </span>
      </div>

      {/* Test Title & Repo */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-foreground/50">
          <span className="px-1.5 py-0.2 rounded bg-surface-subtle border border-border font-semibold text-slate-700">
            {test.repository}
          </span>
          <span>•</span>
          <span>Order-dependent</span>
        </div>
        <h4 className="text-xs font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-navy transition-colors">
          {test.testTitle}
        </h4>
        <div className="flex items-center gap-1 text-[11px] font-mono text-foreground/60 truncate">
          <FileCode className="w-3 h-3 text-foreground/40 shrink-0" />
          <span className="truncate">{test.filePath}</span>
        </div>
      </div>

      {/* Polluter & Victim indicators */}
      <div className="mt-3 p-2 rounded-lg bg-surface-subtle border border-border/60 text-[11px] font-mono space-y-1">
        {test.polluterTest && (
          <div className="flex items-center justify-between text-status-amber truncate">
            <span className="text-[10px] text-foreground/50 uppercase">Polluter:</span>
            <span className="truncate max-w-[150px] font-medium ml-1">
              {test.polluterTest}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-foreground/75 truncate">
          <span className="text-[10px] text-foreground/50 uppercase">Victim:</span>
          <span className="truncate max-w-[150px] font-medium ml-1">
            {test.victimTest}
          </span>
        </div>
      </div>

      {/* Footer info: Flakiness rate & baseline runs */}
      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-foreground/60">
        <div className="flex items-center gap-1">
          <span className="text-status-amber font-semibold">
            {test.flakinessRate}% Flake
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-foreground/60">
            {test.baselineRuns} replays
          </span>
        </div>
      </div>

      {/* Resolved PR indicator if available */}
      {isVerdict && activePatch.prUrl && (
        <div className="mt-2.5 pt-2 border-t border-status-teal-border/40 flex items-center justify-between text-[11px] font-mono text-status-teal font-medium">
          <span className="flex items-center gap-1">
            <GitPullRequest className="w-3 h-3" /> PR Opened with Evidence
          </span>
          <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </motion.div>
  );
};
