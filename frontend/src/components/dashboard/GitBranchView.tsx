import React, { useState } from "react";
import type { FlakyTestCase } from "../../lib/types";
import { VerdictTag } from "./verdict";
import { DiffBlock } from "../ui/DiffBlock";
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  CheckCircle2,
  FileCode,
  Layers,
} from "lucide-react";

interface GitBranchViewProps {
  testCases: FlakyTestCase[];
  onOpen: (attemptId: number) => void;
}

export const GitBranchView: React.FC<GitBranchViewProps> = ({ testCases, onOpen }) => {
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});
  const rows = [...testCases].sort((a, b) => b.attemptId - a.attemptId);

  const toggleDiff = (patchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDiffs((prev) => ({ ...prev, [patchId]: !prev[patchId] }));
  };

  return (
    <div className="space-y-8">
      {rows.map((test) => {
        const verifiedPatch = test.candidatePatches.find((p) => p.verdict === "VERIFIED");
        const candidateBranches = test.candidatePatches;
        const commitHash = `0x${test.attemptId.toString(16).padStart(2, "0")}f${test.baselineRuns.toString(16)}`;

        return (
          <div
            key={test.id}
            className="rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-md shadow-card overflow-hidden transition-all duration-200 hover:shadow-card-hover"
          >
            {/* Git Repository & Attempt Header */}
            <div className="px-5 py-3.5 bg-surface-subtle/80 border-b border-border/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-navy text-white flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-teal-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-foreground">
                      {test.repository}
                    </span>
                    <span className="text-border">•</span>
                    <span className="font-mono text-[11px] text-foreground/60">
                      attempt #{test.attemptId}
                    </span>
                    <span className="text-border">•</span>
                    <span className="text-[11px] text-foreground/50">{test.createdAt}</span>
                  </div>
                  <p className="font-mono text-[11px] text-foreground/70 truncate max-w-lg mt-0.5">
                    {test.testTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <VerdictTag verdict={test.verdict} />
                {test.prUrl && (
                  <a
                    href={test.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-teal-light text-status-teal font-mono text-xs font-semibold border border-status-teal-border/60 hover:bg-teal-100 transition-colors"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span>PR #{test.prUrl.split("/").pop()}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onOpen(test.attemptId)}
                  className="px-3 py-1 rounded-md bg-navy text-white text-xs font-medium hover:bg-navy-600 transition-all shadow-xs"
                >
                  Inspect Evidence
                </button>
              </div>
            </div>

            {/* Git Graph Visual Area */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* 1. Trunk Commit: Failing Baseline */}
              <div className="relative flex items-start gap-4">
                {/* Visual Branch Spine Node */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-6 h-6 rounded-full bg-navy text-white flex items-center justify-center shadow-xs ring-4 ring-navy-50">
                    <GitCommit className="w-3.5 h-3.5 text-teal-300" />
                  </div>
                  <div className="w-0.5 h-full bg-navy/20 min-h-[48px] my-1" />
                </div>

                {/* Commit Content */}
                <div className="flex-1 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-navy-50 text-navy border border-navy-200">
                      main
                    </span>
                    <span className="font-mono text-[11px] text-foreground/50">{commitHash}</span>
                    <span className="text-border">•</span>
                    <span className="text-xs font-semibold text-foreground">
                      Baseline Intermittent Flake: {test.victimTest}
                    </span>
                  </div>

                  <div className="mt-2 p-3 rounded-xl bg-surface-subtle border border-border text-xs space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground/80 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-status-amber" />
                        Baseline Order Intermittency:
                      </span>
                      <span className="font-mono font-bold text-status-amber">
                        {test.baselinePasses} of {test.baselineRuns} passed ({test.baselineFailRate}% fail rate)
                      </span>
                    </div>

                    {test.polluterTest && (
                      <p className="text-foreground/60 font-mono text-[11px]">
                        <span className="text-red-700 font-semibold">Polluter:</span> {test.polluterTest}
                      </p>
                    )}
                    {test.rootCause && (
                      <p className="text-foreground/70 text-[11px] leading-relaxed pt-0.5">
                        {test.rootCause}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Diverging Branches: Candidate Patches */}
              <div className="space-y-4 pl-3 sm:pl-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-foreground/50">
                  <GitBranch className="w-3.5 h-3.5 text-navy" />
                  <span>Swarm Repair Branches ({candidateBranches.length} Candidates Evaluated):</span>
                </div>

                {candidateBranches.map((patch, pIdx) => {
                  const isVerified = patch.verdict === "VERIFIED";
                  const isBandaid = patch.verdict === "REFUSED_BANDAID";
                  const branchName = isVerified
                    ? `fix/patch-${patch.number}-hermetic-reset`
                    : isBandaid
                    ? `bandaid/patch-${patch.number}-${patch.blade2.category || "mask"}`
                    : `try/patch-${patch.number}-incomplete-restore`;

                  const patchHash = `0x${test.attemptId}${patch.number}d9`;
                  const isDiffOpen = expandedDiffs[patch.id] ?? false;

                  return (
                    <div key={patch.id} className="relative flex items-start gap-4">
                      {/* Branch Node Indicator with SVG Curve */}
                      <div className="flex flex-col items-center shrink-0 pt-1">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-white shadow-xs ${
                            isVerified
                              ? "bg-status-teal ring-4 ring-teal-50"
                              : isBandaid
                              ? "bg-red-500 ring-4 ring-red-50"
                              : "bg-status-amber ring-4 ring-amber-50"
                          }`}
                        >
                          {isVerified ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isBandaid ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                        </div>
                        {pIdx < candidateBranches.length - 1 && (
                          <div className="w-0.5 h-full bg-border min-h-[50px] my-1" />
                        )}
                      </div>

                      {/* Branch Card */}
                      <div
                        className={`flex-1 p-4 rounded-xl border transition-all ${
                          isVerified
                            ? "bg-teal-50/40 border-teal-200/80 shadow-xs"
                            : isBandaid
                            ? "bg-red-50/30 border-red-200/70"
                            : "bg-amber-50/30 border-amber-200/70"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-2 border-b border-black/5">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-border text-foreground">
                                {branchName}
                              </span>
                              <span className="font-mono text-[11px] text-foreground/50">
                                {patchHash}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-subtle text-foreground/70">
                                {patch.source === "agent" ? "Swarm Nova 2 Lite" : "Planted"}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-foreground">
                              {patch.title}
                            </h4>
                            {patch.rationale && (
                              <p className="text-xs text-foreground/70 leading-relaxed">
                                {patch.rationale}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <VerdictTag verdict={patch.verdict} />
                            {patch.diff && (
                              <button
                                type="button"
                                onClick={(e) => toggleDiff(patch.id, e)}
                                className="inline-flex items-center gap-1 text-xs font-mono text-foreground/70 hover:text-foreground px-2 py-1 rounded border border-border bg-white hover:bg-surface-subtle transition-colors"
                              >
                                <FileCode className="w-3 h-3" />
                                <span>{isDiffOpen ? "Hide Diff" : "View Diff"}</span>
                                {isDiffOpen ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Gate Evaluation Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                          {/* Blade 1 */}
                          <div className="p-2.5 rounded-lg bg-white/80 border border-border/80 space-y-1">
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="font-bold flex items-center gap-1 text-foreground">
                                <Layers className="w-3 h-3 text-status-teal" />
                                Blade 1: Order Reruns
                              </span>
                              <span
                                className={`font-bold ${
                                  patch.blade1.passed ? "text-status-teal" : "text-status-amber"
                                }`}
                              >
                                {patch.blade1.passes}/{patch.blade1.runs} passed
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  patch.blade1.passed ? "bg-status-teal" : "bg-status-amber"
                                }`}
                                style={{ width: `${patch.blade1.passRate}%` }}
                              />
                            </div>
                            {patch.blade1.failures.length > 0 && (
                              <p className="text-[10px] text-red-700 truncate font-mono pt-0.5">
                                Fail: {patch.blade1.failures[0]}
                              </p>
                            )}
                          </div>

                          {/* Blade 2 */}
                          <div className="p-2.5 rounded-lg bg-white/80 border border-border/80 space-y-1">
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="font-bold flex items-center gap-1 text-foreground">
                                <ShieldCheck className="w-3 h-3 text-navy" />
                                Blade 2: AST Scan
                              </span>
                              <span
                                className={`font-bold ${
                                  patch.blade2.verdict === "CLEAN"
                                    ? "text-status-teal"
                                    : "text-red-600"
                                }`}
                              >
                                {patch.blade2.verdict === "CLEAN" ? "AST Clean" : "Band-Aid Refused"}
                              </span>
                            </div>
                            <p className="text-[11px] text-foreground/70 truncate">
                              {patch.blade2.reason || "No band-aids detected."}
                            </p>
                            {patch.blade2.line && (
                              <div className="font-mono text-[10px] p-1 rounded bg-red-100/80 text-red-900 truncate">
                                {patch.blade2.line}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expandable Unified Diff Viewer */}
                        {isDiffOpen && patch.diff && (
                          <div className="mt-3 pt-3 border-t border-black/5">
                            <DiffBlock diff={patch.diff} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. Merge Commit back to Main (if verified fix exists) */}
              {verifiedPatch ? (
                <div className="relative flex items-start gap-4 pt-2">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-6 h-6 rounded-full bg-status-teal text-white flex items-center justify-center shadow-xs ring-4 ring-teal-50">
                      <GitMerge className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="flex-1 p-3.5 rounded-xl bg-teal-50/60 border border-teal-300 text-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-mono font-bold text-teal-950">
                        <span className="px-1.5 py-0.5 rounded bg-teal-200 text-teal-900 text-[10px]">
                          MERGED INTO MAIN
                        </span>
                        <span>Merge branch &apos;fix/patch-{verifiedPatch.number}&apos;</span>
                      </div>
                      <p className="text-teal-800 text-[11px]">
                        Fix proven across {verifiedPatch.blade1.runs} random order replays and verified clean by AST scanner.
                      </p>
                    </div>

                    {test.prUrl ? (
                      <a
                        href={test.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-status-teal text-white font-semibold text-xs shadow-xs hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5"
                      >
                        <GitPullRequest className="w-3.5 h-3.5" />
                        <span>Pull Request #{test.prUrl.split("/").pop()}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] font-mono text-teal-800">
                        Verified dry run (no PR requested)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Unmerged / Refused State */
                <div className="relative flex items-start gap-4 pt-1">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center ring-4 ring-slate-100">
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>

                  <div className="flex-1 p-3 rounded-xl bg-surface-subtle border border-border text-xs text-foreground/60">
                    <span className="font-semibold text-foreground/80">No merge to main:</span> All candidate patches were refused by the Two-Blade Gate. Zero unproven fixes merged.
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
