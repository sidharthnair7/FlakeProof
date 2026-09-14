import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { DiffBlock } from "../ui/DiffBlock";
import { useReplay } from "../../hooks/useReplay";
import { blade1Summary, blade2Label, scanSummary, showcaseAttempt } from "../../lib/replay";
import { Terminal, ShieldCheck, ShieldAlert, XCircle, CheckCircle2, GitPullRequest, Layers, Search } from "lucide-react";

const RUN_HINT = 'python -m agent run --target marine-api --no-agent --plant "demo/candidates/*.diff" --reruns 200 --no-pr';

export const HeroSection: React.FC = () => {
  const { testCases, loading, error } = useReplay();
  const showcase = showcaseAttempt(testCases);
  const [selectedPatchIndex, setSelectedPatchIndex] = useState<number>(0);
  const showcaseId = showcase?.id;
  const defaultIndex = showcase?.activePatchIndex ?? 0;

  useEffect(() => {
    setSelectedPatchIndex(defaultIndex);
  }, [showcaseId, defaultIndex]);

  const activePatch = showcase
    ? (showcase.candidatePatches[selectedPatchIndex] ?? showcase.candidatePatches[0])
    : undefined;

  return (
    <section className="relative pt-14 pb-16 md:pt-20 md:pb-24 border-b border-border/80 bg-[#FAFAF9]">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-sm text-slate-600"
          >
            Built with Strands Agents on Amazon Bedrock (Amazon Nova 2 Lite) for the AWS Agents for Humans hackathon
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.035em] text-[#111827] leading-[1.08] max-w-4xl mx-auto">
              Repairs flaky tests. <br />
              <span className="text-teal-800">Refuses to propose any fix it can&apos;t prove.</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed"
          >
            A <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-sm text-slate-800">sleep</code>, a{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-sm text-slate-800">retry</code> or an{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-sm text-slate-800">@Ignore</code> can turn a
            flaky test green without fixing the cause. Flakeproof uses Strands Agents on Amazon Nova 2 Lite to diagnose the
            failure and write a fix, and a deterministic gate decides: every rerun must pass, and a band-aid scanner refuses
            masks even when they pass. You only hear from it for a pull request that carries its proof.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
          >
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#0B132B] text-white text-sm font-semibold shadow-[0_4px_14px_0_rgba(11,19,43,0.25)] hover:bg-[#141C33] hover:shadow-[0_6px_20px_0_rgba(11,19,43,0.35)] transition-all active:scale-98"
            >
              <Terminal className="w-4 h-4 text-teal-300" />
              <span>Open the dashboard</span>
            </Link>

            <a
              href="#marine-api-demo"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-800 border border-slate-200 shadow-xs hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold transition-all active:scale-98"
            >
              <Search className="w-4 h-4 text-status-teal" />
              <span>See a recorded run</span>
            </a>
          </motion.div>
        </div>

        {/* Centerpiece: a real recorded attempt, straight from data/runs.db */}
        <motion.div
          id="marine-api-demo"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: "easeOut" }}
          className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-200 shadow-[0_20px_50px_-12px_rgba(11,19,43,0.12)] overflow-hidden bg-white"
        >
          {!showcase || !activePatch ? (
            <div className="p-8 text-center space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                {loading ? "Loading recorded runs" : error ? "Can't reach the Flakeproof API" : "No judged candidates recorded yet"}
              </p>
              {!loading && (
                <p className="font-mono text-xs break-all">
                  {error ? "Start it with: python -m uvicorn dashboard.app:app --port 8000" : `Record one with: ${RUN_HINT}`}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Titlebar */}
              <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-slate-800">
                    {showcase.repository} &bull; {showcase.testTitle}
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                  attempt #{showcase.attemptId} &bull; {showcase.createdAt}
                </span>
              </div>

              {/* What was measured before any change */}
              <div className="p-4 bg-amber-50/60 border-b border-amber-200/80 flex items-start gap-3 text-xs text-left">
                <ShieldAlert className="w-4 h-4 text-status-amber shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">
                    Order-dependent flake: {showcase.baselinePasses} of {showcase.baselineRuns} baseline runs passed before any
                    change
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    {showcase.polluterTest ? (
                      <>
                        When{" "}
                        <code className="font-mono text-[11px] text-amber-900">{showcase.polluterTest}</code> runs first,{" "}
                        <code className="font-mono text-[11px] text-amber-900">{showcase.victimTest}</code> fails
                      </>
                    ) : (
                      <>
                        <code className="font-mono text-[11px] text-amber-900">{showcase.victimTest}</code> fails in some orders
                      </>
                    )}
                    {showcase.baselineFailure ? (
                      <>
                        : <code className="font-mono text-[11px] text-red-700">{showcase.baselineFailure}</code>
                      </>
                    ) : (
                      "."
                    )}
                  </p>
                </div>
              </div>

              {/* Candidate tabs */}
              <div className="px-5 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Candidates judged by the gate:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {showcase.candidatePatches.map((patch, idx) => {
                    const isSelected = selectedPatchIndex === idx;
                    const verdictBadge =
                      patch.verdict === "VERIFIED"
                        ? "bg-teal-100 text-status-teal border-teal-300"
                        : patch.verdict === "REFUSED_BANDAID"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-amber-100 text-status-amber border-amber-300";

                    return (
                      <button
                        key={patch.id}
                        onClick={() => setSelectedPatchIndex(idx)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-white border-navy text-navy shadow-xs ring-1 ring-navy font-bold"
                            : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                        }`}
                      >
                        <span>
                          #{patch.number} {patch.source}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${verdictBadge}`}>{patch.verdict}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active candidate */}
              <div className="p-5 sm:p-6 bg-white min-h-[300px] text-left">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePatch.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="space-y-1 max-w-xl">
                        <h3 className="text-base font-bold text-slate-900">{activePatch.title}</h3>
                        {activePatch.rationale && <p className="text-xs text-slate-600 leading-relaxed">{activePatch.rationale}</p>}
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">Gate verdict</span>
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border shadow-xs ${
                            activePatch.verdict === "VERIFIED"
                              ? "bg-status-teal-light text-status-teal border-status-teal-border"
                              : activePatch.verdict === "REFUSED_BANDAID"
                                ? "bg-red-50 text-red-700 border-red-300"
                                : "bg-amber-50 text-status-amber border-amber-300"
                          }`}
                        >
                          {activePatch.verdict === "VERIFIED" ? (
                            <CheckCircle2 className="w-4 h-4 text-status-teal" />
                          ) : activePatch.verdict === "REFUSED_BANDAID" ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-status-amber" />
                          )}
                          <span>{activePatch.verdict}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Blade 1 */}
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          activePatch.blade1.passed ? "bg-teal-50/30 border-teal-200" : "bg-amber-50/30 border-amber-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-status-teal" />
                            BLADE 1: {activePatch.blade1.runs} reruns
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              activePatch.blade1.passed ? "bg-teal-100 text-status-teal" : "bg-amber-100 text-status-amber"
                            }`}
                          >
                            {activePatch.blade1.passed
                              ? "PASSED"
                              : `FAILED ${activePatch.blade1.runs - activePatch.blade1.passes}/${activePatch.blade1.runs}`}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>Pass rate:</span>
                            <span className="font-bold">{activePatch.blade1.passRate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${activePatch.blade1.passed ? "bg-status-teal" : "bg-status-amber"}`}
                              style={{ width: `${activePatch.blade1.passRate}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 pt-1 break-words">{blade1Summary(activePatch)}</p>
                        </div>
                      </div>

                      {/* Blade 2 */}
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          activePatch.blade2.verdict === "BANDAID" ? "bg-red-50/30 border-red-200" : "bg-teal-50/30 border-teal-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-navy" />
                            BLADE 2: band-aid scan
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              activePatch.blade2.verdict === "BANDAID" ? "bg-red-100 text-red-700" : "bg-teal-100 text-status-teal"
                            }`}
                          >
                            {blade2Label(activePatch)}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 space-y-1">
                          {activePatch.blade2.reason && (
                            <p className="text-[11px] leading-relaxed break-words">{scanSummary(activePatch)}</p>
                          )}
                          {activePatch.blade2.line && (
                            <div className="mt-1 p-2 rounded bg-red-100/70 border border-red-200 font-mono text-[11px] text-red-900 break-all">
                              <strong>Offending line{activePatch.blade2.lineNo ? ` ${activePatch.blade2.lineNo}` : ""}:</strong>{" "}
                              {activePatch.blade2.line.trim()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                        <span>Candidate diff:</span>
                        {activePatch.verdict === "VERIFIED" && showcase.prUrl && (
                          <a
                            href={showcase.prUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-status-teal hover:underline flex items-center gap-1 font-semibold"
                          >
                            <GitPullRequest className="w-3.5 h-3.5" />
                            Pull request
                          </a>
                        )}
                      </div>
                      <DiffBlock diff={activePatch.diff} highlight={activePatch.blade2.line} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-600">
                <div className="flex items-center gap-4">
                  <span>Recorded in data/runs.db</span>
                  <span>•</span>
                  <span>{showcase.agentsRan ? "Agent-written and planted candidates" : "Planted candidates, no agents in this attempt"}</span>
                </div>

                <Link to="/dashboard" className="text-navy font-semibold hover:underline flex items-center gap-1 text-xs">
                  Open the dashboard →
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};
