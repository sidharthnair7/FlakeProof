import React, { useEffect, useState } from "react";
import type { FlakyTestCase } from "../../lib/types";
import { blade1Summary, blade2Label } from "../../lib/replay";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { DiffBlock } from "../ui/DiffBlock";
import {
  X,
  FileCode,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  Layers,
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
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ test, onClose }) => {
  const [selectedPatchIdx, setSelectedPatchIdx] = useState<number>(0);
  const testId = test?.id;
  const defaultPatch = test?.activePatchIndex ?? 0;

  // Reset the selected candidate only when a different attempt is opened, not on every poll.
  useEffect(() => {
    setSelectedPatchIdx(defaultPatch);
  }, [testId, defaultPatch]);

  if (!test) return null;

  const currentPatch = test.candidatePatches[selectedPatchIdx] ?? test.candidatePatches[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-xs"
        />

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
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-navy text-white">{test.repository}</span>
                <Badge variant={test.stage === "verdict" ? "teal" : "amber"} size="sm">
                  {test.status === "RUNNING" ? `Stage: ${test.stage}` : test.status === "FAILED" ? "Run failed" : `Verdict: ${test.verdict}`}
                </Badge>
                <span className="text-border">•</span>
                <span className="text-xs font-mono text-foreground/60 flex items-center gap-1">
                  <Database className="w-3 h-3 text-status-teal" />
                  attempt #{test.attemptId} · {test.createdAt}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">{test.testTitle}</h3>
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

          <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
            {/* Quick facts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-subtle border border-border text-xs font-mono">
              <div>
                <span className="text-foreground/50 block text-[10px] uppercase">Baseline</span>
                <span className="text-status-amber font-bold text-sm">
                  {test.baselinePasses}/{test.baselineRuns} passed
                </span>
              </div>
              <div>
                <span className="text-foreground/50 block text-[10px] uppercase">JVM runs</span>
                <span className="text-foreground font-bold text-sm">{test.jvmRuns}</span>
              </div>
              <div>
                <span className="text-foreground/50 block text-[10px] uppercase">Candidates from</span>
                <span className="text-foreground font-bold text-sm">{test.agentsRan ? "Agents" : "Planted only"}</span>
              </div>
              <div>
                <span className="text-foreground/50 block text-[10px] uppercase">Scope</span>
                <span className="text-status-teal font-bold text-sm">Order-dependent</span>
              </div>
            </div>

            {test.error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-mono text-red-800 whitespace-pre-wrap">
                {test.error}
              </div>
            )}

            {/* Order trace */}
            {test.polluterTest && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-navy" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Order Dependence</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-status-amber flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      POLLUTER FIRST: VICTIM FAILS
                    </span>
                    <div className="space-y-1 pl-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground/40 text-[10px]">1.</span>
                        <span className="text-status-amber font-medium truncate">{test.polluterTest}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground/40 text-[10px]">2.</span>
                        <span className="text-red-600 font-bold truncate">{test.victimTest}</span>
                      </div>
                    </div>
                    {test.baselineFailure && (
                      <p className="text-[10px] text-red-700 pt-1 break-words">{test.baselineFailure}</p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-status-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      VICTIM FIRST: PASSES
                    </span>
                    <div className="space-y-1 pl-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground/40 text-[10px]">1.</span>
                        <span className="text-status-teal font-medium truncate">{test.victimTest}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground/40 text-[10px]">2.</span>
                        <span className="text-status-teal font-medium truncate">{test.polluterTest}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnosis */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Diagnosis</h4>
              <div className="p-3.5 rounded-lg bg-surface-subtle border border-border space-y-2 text-xs">
                <p className="text-foreground/85 font-medium leading-relaxed">
                  {test.rootCause ||
                    (test.agentsRan
                      ? "The agents did not record a root cause in this attempt."
                      : "No agents ran in this attempt: it judged planted candidates only.")}
                </p>
                {test.category && (
                  <p className="text-[11px] font-mono text-foreground/60">Category: {test.category}</p>
                )}
                {test.hypotheses.length > 0 && (
                  <div className="pt-2 border-t border-border/60 space-y-1">
                    <span className="text-[10px] font-mono text-foreground/50 uppercase block">Recorded hypotheses</span>
                    {test.hypotheses.map((h, idx) => (
                      <p key={idx} className="text-[11px] text-foreground/75">
                        <span className="font-mono font-semibold">{h.agent}</span> ({h.category},{" "}
                        {Math.round(h.confidence * 100)}%): {h.summary}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Candidates judged by the gate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-status-teal" />
                  Candidates Judged by the Gate
                </h4>
                <span className="text-[11px] font-mono text-foreground/50">{test.candidatePatches.length} candidates</span>
              </div>

              {!currentPatch ? (
                <p className="text-xs text-foreground/60">No candidate patches in this attempt.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {test.candidatePatches.map((patch, idx) => {
                      const isSelected = selectedPatchIdx === idx;
                      return (
                        <button
                          key={patch.id}
                          onClick={() => setSelectedPatchIdx(idx)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white border-navy shadow-sm ring-1 ring-navy"
                              : "bg-surface-subtle border-border hover:border-navy-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 gap-1">
                            <span className="text-[11px] font-bold text-foreground truncate">
                              #{patch.number} {patch.source}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                patch.verdict === "VERIFIED"
                                  ? "bg-teal-100 text-teal-800"
                                  : patch.verdict === "REFUSED_BANDAID"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {patch.verdict}
                            </span>
                          </div>
                          <p className="text-[10px] text-foreground/60 line-clamp-2">{patch.title}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/80">
                      <div className="space-y-0.5 max-w-xl">
                        <span className="text-xs font-bold text-foreground">{currentPatch.title}</span>
                        {currentPatch.rationale && (
                          <p className="text-[11px] text-foreground/70">{currentPatch.rationale}</p>
                        )}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Blade 1 */}
                      <div
                        className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                          currentPatch.blade1.passed ? "bg-teal-50/50 border-teal-200" : "bg-amber-50/50 border-amber-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-navy" />
                            Blade 1: {currentPatch.blade1.runs} reruns
                          </span>
                          <span
                            className={`font-bold ${currentPatch.blade1.passed ? "text-status-teal" : "text-status-amber"}`}
                          >
                            {currentPatch.blade1.passes}/{currentPatch.blade1.runs} ({currentPatch.blade1.passRate}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground/70 break-words">{blade1Summary(currentPatch)}</p>
                      </div>

                      {/* Blade 2 */}
                      <div
                        className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                          currentPatch.blade2.verdict === "BANDAID" ? "bg-red-50/50 border-red-200" : "bg-teal-50/50 border-teal-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1">
                            <Search className="w-3.5 h-3.5 text-navy" />
                            Blade 2: band-aid scan
                          </span>
                          <span
                            className={`font-bold ${currentPatch.blade2.verdict === "BANDAID" ? "text-red-600" : "text-status-teal"}`}
                          >
                            {blade2Label(currentPatch)}
                          </span>
                        </div>
                        {currentPatch.blade2.reason && (
                          <p className="text-[11px] text-foreground/70 break-words">{currentPatch.blade2.reason}</p>
                        )}
                        {currentPatch.blade2.line && (
                          <div className="mt-1 p-1 rounded bg-red-100 text-red-900 text-[10px] break-all">
                            Offending line{currentPatch.blade2.lineNo ? ` ${currentPatch.blade2.lineNo}` : ""}:{" "}
                            {currentPatch.blade2.line.trim()}
                          </div>
                        )}
                      </div>
                    </div>

                    {currentPatch.compileError && (
                      <pre className="p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 whitespace-pre-wrap">
                        {currentPatch.compileError}
                      </pre>
                    )}

                    {currentPatch.diff && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-foreground/50 uppercase block">Patch diff</span>
                        <DiffBlock diff={currentPatch.diff} highlight={currentPatch.blade2.line} />
                      </div>
                    )}

                    {currentPatch.verdict === "VERIFIED" && (
                      <div className="pt-2 flex items-center justify-between text-xs">
                        {test.prUrl ? (
                          <a
                            href={test.prUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-navy font-bold hover:underline flex items-center gap-1"
                          >
                            <GitPullRequest className="w-3.5 h-3.5" /> {test.prUrl.replace("https://github.com/", "")}
                          </a>
                        ) : (
                          <span className="font-mono text-foreground/60 flex items-center gap-1">
                            <GitPullRequest className="w-3.5 h-3.5" /> Verified. No pull request was opened in this run.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {test.refusalReason && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Refusal statement</h4>
                <pre className="p-3 rounded-lg bg-surface-subtle border border-border text-[11px] text-foreground/75 whitespace-pre-wrap">
                  {test.refusalReason}
                </pre>
              </div>
            )}
          </div>

          <div className="p-4 bg-surface-subtle border-t border-border flex items-center justify-between gap-3">
            <div className="text-xs font-mono text-foreground/50">attempt #{test.attemptId} in data/runs.db</div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
