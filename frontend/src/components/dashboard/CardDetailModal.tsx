import React, { useState, useEffect } from "react";
import type { FlakyTestCase } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  X,
  FileCode,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  Database,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CardDetailModalProps {
  test: FlakyTestCase | null;
  onClose: () => void;
  onSelectPatch?: (testId: string, patchIndex: number) => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  test,
  onClose,
  onSelectPatch,
}) => {
  const [selectedPatchIdx, setSelectedPatchIdx] = useState<number>(0);

  useEffect(() => {
    if (test) {
      setSelectedPatchIdx(test.activePatchIndex ?? 0);
    }
  }, [test]);

  if (!test) return null;

  const currentPatch = test.candidatePatches[selectedPatchIdx] || test.candidatePatches[0];

  const handlePatchChange = (idx: number) => {
    setSelectedPatchIdx(idx);
    if (onSelectPatch) {
      onSelectPatch(test.id, idx);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden z-10 my-8"
        >
          {/* Header */}
          <div className="p-5 bg-surface-subtle border-b border-border flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-navy text-white">
                  {test.repository}
                </span>
                <Badge variant={test.stage === "verdict" ? "teal" : "amber"} size="sm">
                  Stage: {test.stage.toUpperCase()}
                </Badge>
                <span className="text-border">•</span>
                <span className="text-xs font-mono text-foreground/60 flex items-center gap-1">
                  <Database className="w-3 h-3 text-status-teal" />
                  {test.sqliteAuditId}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {test.testTitle}
              </h3>
              <div className="flex items-center gap-1.5 text-xs font-mono text-foreground/60">
                <FileCode className="w-3.5 h-3.5 text-foreground/40" />
                <span>{test.filePath}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-subtle border border-border text-xs font-mono">
              <div>
                <span className="text-foreground/50 block text-[10px] uppercase">
                  Flakiness Rate
                </span>
                <span className="text-status-amber font-bold text-sm">
                  {test.flakinessRate}%
                </span>
              </div>
              <div>
                <span className="text-foreground/50 block text-[10px] uppercase">
                  Baseline Runs
                </span>
                <span className="text-foreground font-bold text-sm">
                  {test.baselineRuns} replays
                </span>
              </div>
              <div>
                <span className="text-foreground/50 block text-[10px] uppercase">
                  Flake Scope
                </span>
                <span className="text-foreground font-bold text-sm">
                  Order-Dependent Only
                </span>
              </div>
              <div>
                <span className="text-foreground/50 block text-[10px] uppercase">
                  Gate Determinism
                </span>
                <span className="text-status-teal font-bold text-sm">
                  Two-Blade (Zero AI)
                </span>
              </div>
            </div>

            {/* Bisection Permutation Trace */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-navy" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Order-Dependent Permutation Trace
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {/* Failing Sequence */}
                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-status-amber flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    FAILING SEQUENCE (Exit 1)
                  </span>
                  <div className="space-y-1 pl-1">
                    {test.orderSequence.failingOrder.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-foreground/40 text-[10px]">{idx + 1}.</span>
                        <span
                          className={
                            idx === 0
                              ? "text-status-amber font-medium truncate"
                              : "text-red-600 font-bold truncate"
                          }
                        >
                          {step}
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] px-1 rounded bg-amber-200 text-amber-900 shrink-0">
                            Polluter
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Passing Sequence */}
                <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-status-teal flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PASSING SEQUENCE (Exit 0)
                  </span>
                  <div className="space-y-1 pl-1">
                    {test.orderSequence.passingOrder.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-foreground/40 text-[10px]">{idx + 1}.</span>
                        <span className="text-status-teal font-medium truncate">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Root Cause & Singleton Pollution */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Swarm Diagnosis &amp; Root Cause
              </h4>
              <div className="p-3.5 rounded-lg bg-surface-subtle border border-border space-y-2 text-xs">
                <p className="text-foreground/85 font-medium leading-relaxed">
                  {test.rootCause.description}
                </p>
                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-foreground/50 uppercase block">
                      Polluted Singleton:
                    </span>
                    <code className="text-xs font-mono font-semibold text-status-amber bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 inline-block">
                      {test.rootCause.singletonClass}
                    </code>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-foreground/50 uppercase block">
                      Leak Explanation:
                    </span>
                    <span className="text-xs text-foreground/70 font-medium">
                      {test.rootCause.leakExplanation}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Patches Evaluation & Two-Blade Gate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-status-teal" />
                  Candidate Patches Evaluated by Two-Blade Gate
                </h4>
                <span className="text-[11px] font-mono text-foreground/50">
                  {test.candidatePatches.length} Candidates Tested
                </span>
              </div>

              {/* Candidate selection tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {test.candidatePatches.map((patch, idx) => {
                  const isSelected = selectedPatchIdx === idx;
                  const isVerified = patch.verdict === "VERIFIED";
                  const isBandaid = patch.verdict === "REFUSED_BANDAID";

                  return (
                    <button
                      key={patch.id}
                      onClick={() => handlePatchChange(idx)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white border-navy shadow-sm ring-1 ring-navy"
                          : "bg-surface-subtle border-border hover:border-navy-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-foreground truncate">
                          Candidate {idx + 1}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isVerified
                              ? "bg-teal-100 text-teal-800"
                              : isBandaid
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {patch.verdict}
                        </span>
                      </div>
                      <p className="text-[10px] text-foreground/60 line-clamp-2">
                        {patch.label}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Two-Blade Evaluation Result for Selected Patch */}
              <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/80">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">
                      {currentPatch.label}
                    </span>
                    <p className="text-[11px] text-foreground/70">
                      {currentPatch.approach}
                    </p>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 ${
                      currentPatch.verdict === "VERIFIED"
                        ? "bg-status-teal-light text-status-teal border border-status-teal-border"
                        : currentPatch.verdict === "REFUSED_BANDAID"
                        ? "bg-red-50 text-red-700 border border-red-300"
                        : "bg-amber-50 text-status-amber border border-amber-300"
                    }`}
                  >
                    {currentPatch.verdict === "VERIFIED" ? (
                      <CheckCircle2 className="w-4 h-4 text-status-teal" />
                    ) : currentPatch.verdict === "REFUSED_BANDAID" ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-status-amber" />
                    )}
                    <span>{currentPatch.verdict}</span>
                  </div>
                </div>

                {/* Blade 1 & Blade 2 Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Blade 1 */}
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                      currentPatch.blade1Runs.passed
                        ? "bg-teal-50/50 border-teal-200"
                        : "bg-amber-50/50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-navy" />
                        Blade 1: 200 Order Replays
                      </span>
                      <span
                        className={`font-bold ${
                          currentPatch.blade1Runs.passed ? "text-status-teal" : "text-status-amber"
                        }`}
                      >
                        {currentPatch.blade1Runs.passedRuns}/{currentPatch.blade1Runs.totalRuns} (
                        {currentPatch.blade1Runs.passRate}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/70">
                      {currentPatch.blade1Runs.passed
                        ? "Passed all randomized order permutations. Invariant execution confirmed."
                        : currentPatch.blade1Runs.failureDetail || "Failed permutation runs."}
                    </p>
                  </div>

                  {/* Blade 2 */}
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                      currentPatch.blade2Scan.passed
                        ? "bg-teal-50/50 border-teal-200"
                        : "bg-red-50/50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <Search className="w-3.5 h-3.5 text-navy" />
                        Blade 2: AST Band-Aid Scan
                      </span>
                      <span
                        className={`font-bold ${
                          currentPatch.blade2Scan.passed ? "text-status-teal" : "text-red-600"
                        }`}
                      >
                        {currentPatch.blade2Scan.passed ? "PASSED (Clean)" : "REFUSED (Mask)"}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/70">
                      {currentPatch.blade2Scan.explanation ||
                        (currentPatch.blade2Scan.passed
                          ? "Zero sleeps, retries, @Ignore, or pinned orders."
                          : `Detected ${currentPatch.blade2Scan.detectedBandAid} mask!`)}
                    </p>
                    {currentPatch.blade2Scan.offendingLine && (
                      <div className="mt-1 p-1 rounded bg-red-100 text-red-900 text-[10px] truncate">
                        Offending line: {currentPatch.blade2Scan.offendingLine}
                      </div>
                    )}
                  </div>
                </div>

                {/* Diff Preview */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-foreground/50 uppercase block">
                    Patch Diff
                  </span>
                  <div className="rounded-xl bg-navy text-white p-3.5 font-mono text-xs overflow-x-auto border border-slate-800 shadow-sm">
                    <pre className="text-[11px] leading-relaxed text-teal-300 whitespace-pre-wrap">
                      {currentPatch.diffSnippet}
                    </pre>
                  </div>
                </div>

                {/* PR Link if verified */}
                {currentPatch.prUrl && (
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-status-teal font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Verified patch automatically dispatched to GitHub PR agent
                    </span>
                    <a
                      href={currentPatch.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-navy font-bold hover:underline flex items-center gap-1"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" /> View PR #142
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-surface-subtle border-t border-border flex items-center justify-between gap-3">
            <div className="text-xs font-mono text-foreground/50">
              Audit ID: {test.sqliteAuditId} • Amazon Nova 2 Lite
            </div>

            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
