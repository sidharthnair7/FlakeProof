import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Prism } from "../ui/Prism";
import { MARINE_API_TEST_CASE } from "../../lib/mockData";
import {
  Terminal,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  CheckCircle2,
  GitPullRequest,
  Database,
  Cpu,
  Layers,
  Search,
} from "lucide-react";

export const HeroSection: React.FC = () => {
  const [selectedPatchIndex, setSelectedPatchIndex] = useState<number>(2); // Default to verified maintainer fix

  const activePatch = MARINE_API_TEST_CASE.candidatePatches[selectedPatchIndex];

  const handleSelectPatch = (index: number) => {
    setSelectedPatchIndex(index);
  };

  return (
    <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden border-b border-border/80 bg-[#FAFAF9]">
      {/* Animated Raymarched Prism Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-90">
        <Prism
          animationType="rotate"
          timeScale={0.4}
          height={3.5}
          baseWidth={5.5}
          scale={3.8}
          hueShift={0}
          colorFrequency={1.2}
          noise={0.35}
          glow={1.1}
          bloom={1.0}
          transparent={true}
          lightMode={true}
        />
        {/* Soft bottom vignette to gently merge with the section border */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FAFAF9]/85 pointer-events-none" />
      </div>

      {/* High-Precision Subtle Grid Overlay with Smooth Radial Mask */}
      <div
        className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none [mask-image:radial-gradient(ellipse_75%_50%_at_50%_35%,#000_65%,transparent_100%)]"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
          {/* AWS Hackathon Announcement Pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-border shadow-xs text-xs font-medium text-foreground backdrop-blur-md hover:border-navy-300 transition-all">
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-status-amber font-mono font-semibold text-[11px]">
                AWS &quot;Agents for Humans&quot; Entry
              </span>
              <span className="text-border">•</span>
              <span className="text-foreground/80 font-mono">
                Amazon Nova 2 Lite &bull; Strands Agents &bull; Bedrock
              </span>
              <ArrowRight className="w-3 h-3 text-foreground/50 ml-0.5" />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.035em] text-[#111827] leading-[1.08] max-w-4xl mx-auto">
              Repairs flaky tests.{" "}
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600">
                Refuses to propose any fix it can&apos;t prove.
              </span>
            </h1>
          </motion.div>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed"
          >
            Existing repair tools generate masks: a <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-sm text-slate-800">sleep</code>, a <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-sm text-slate-800">retry</code>, or <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-sm text-slate-800">@Ignore</code> turns the test green without fixing the cause. FlakeProof uses a 4-agent swarm on Amazon Nova 2 Lite to find root causes, and a <strong>deterministic Two-Blade Gate (no AI inside)</strong> to refuse band-aids and unproven patches.
          </motion.p>

          {/* CTA Buttons */}
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
              <span>Launch Live Dashboard</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-[11px] font-mono text-slate-200">
                ⌘D
              </kbd>
            </Link>

            <a
              href="#marine-api-demo"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-800 border border-slate-200 shadow-xs hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold transition-all active:scale-98"
            >
              <Search className="w-4 h-4 text-status-teal" />
              <span>Inspect marine-api Case Study</span>
            </a>
          </motion.div>

          {/* Tech Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs font-mono text-slate-500"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-border shadow-2xs font-medium text-slate-700">
              <Cpu className="w-3.5 h-3.5 text-status-amber" />
              Strands Swarm (4 Diagnosis Agents)
            </span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-border shadow-2xs font-medium text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-status-teal" />
              Two-Blade Gate (200 Order Replays + AST Scan)
            </span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-border shadow-2xs font-medium text-slate-700">
              <Database className="w-3.5 h-3.5 text-navy" />
              SQLite Audit Trail
            </span>
          </motion.div>
        </div>

        {/* Centerpiece: Real-world marine-api Demo with 3 Candidate Patches */}
        <motion.div
          id="marine-api-demo"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: "easeOut" }}
          className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-200 shadow-[0_20px_50px_-12px_rgba(11,19,43,0.12)] overflow-hidden bg-white"
        >
          {/* Terminal Titlebar */}
          <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-teal-400" />
              </div>
              <span className="ml-2 text-xs font-mono font-semibold text-slate-800">
                marine-api (open-source Java NMEA library) &bull; Order-Dependent Flake Benchmark
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                SQLite Audit ID: {MARINE_API_TEST_CASE.sqliteAuditId}
              </span>
            </div>
          </div>

          {/* Ground Truth Flake Explanation Banner */}
          <div className="p-4 bg-amber-50/60 border-b border-amber-200/80 flex items-start gap-3 text-xs">
            <ShieldAlert className="w-4 h-4 text-status-amber shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">
                Ground-Truth Flake: Shared Singleton Parser Deletion in <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">SentenceFactory.getInstance()</code>
              </p>
              <p className="text-slate-600 leading-relaxed">
                <code className="font-mono text-[11px] text-amber-900">SentenceFactoryTest.testDeleteParser()</code> deletes the GLL sentence parser from the shared singleton and never resets it. When <code className="font-mono text-[11px] text-amber-900">PositionProviderTest.testGLLSentence()</code> runs afterward, it fails to parse GPS coordinates.
              </p>
            </div>
          </div>

          {/* 3 Candidate Patches Selector Tabs */}
          <div className="px-5 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Evaluate Candidate Patches Through Two-Blade Gate:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {MARINE_API_TEST_CASE.candidatePatches.map((patch, idx) => {
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
                    onClick={() => handleSelectPatch(idx)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-white border-navy text-navy shadow-xs ring-1 ring-navy font-bold"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span>Patch {idx + 1}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${verdictBadge}`}>
                      {patch.verdict}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Patch Gate Evaluation */}
          <div className="p-5 sm:p-6 bg-white min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePatch.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Patch Header & Verdict Stamp */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1 max-w-xl">
                    <h3 className="text-base font-bold text-slate-900">{activePatch.label}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{activePatch.approach}</p>
                  </div>

                  {/* Verdict Stamp */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                      Gate Verdict
                    </span>
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

                {/* Two-Blade Evaluation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Blade 1: 200-Run Order Permutation Replay */}
                  <div
                    className={`p-4 rounded-xl border space-y-2 ${
                      activePatch.blade1Runs.passed
                        ? "bg-teal-50/30 border-teal-200"
                        : "bg-amber-50/30 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-status-teal" />
                        BLADE 1: 200 Order Replays
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          activePatch.blade1Runs.passed
                            ? "bg-teal-100 text-status-teal"
                            : "bg-amber-100 text-status-amber"
                        }`}
                      >
                        {activePatch.blade1Runs.passed ? "PASSED" : "FAILED (17/30)"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span>Permutation Pass Rate:</span>
                        <span className="font-bold">{activePatch.blade1Runs.passRate}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            activePatch.blade1Runs.passed ? "bg-status-teal" : "bg-status-amber"
                          }`}
                          style={{ width: `${activePatch.blade1Runs.passRate}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 pt-1">
                        {activePatch.blade1Runs.failureDetail}
                      </p>
                    </div>
                  </div>

                  {/* Blade 2: AST Band-Aid Scanner (No AI) */}
                  <div
                    className={`p-4 rounded-xl border space-y-2 ${
                      activePatch.blade2Scan.passed
                        ? "bg-teal-50/30 border-teal-200"
                        : "bg-red-50/30 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-navy" />
                        BLADE 2: Band-Aid AST Scanner
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          activePatch.blade2Scan.passed
                            ? "bg-teal-100 text-status-teal"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {activePatch.blade2Scan.passed ? "CLEAN" : "BAND-AID REFUSED"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <p className="text-[11px] leading-relaxed">{activePatch.blade2Scan.explanation}</p>
                      {activePatch.blade2Scan.offendingLine && (
                        <div className="mt-1 p-2 rounded bg-red-100/70 border border-red-200 font-mono text-[11px] text-red-900">
                          <strong>Offending AST Mask:</strong> {activePatch.blade2Scan.offendingLine}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Candidate Patch Diff Snippet */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>Proposed Unified Diff:</span>
                    {activePatch.prUrl && (
                      <a
                        href={activePatch.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-status-teal hover:underline flex items-center gap-1 font-semibold"
                      >
                        <GitPullRequest className="w-3.5 h-3.5" />
                        PR #142 (Merged by Maintainers)
                      </a>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 text-white font-mono text-xs overflow-x-auto">
                    <pre className="leading-relaxed">
                      {activePatch.diffSnippet.split("\n").map((line, lIdx) => {
                        const isAdd = line.startsWith("+");
                        const isRemove = line.startsWith("-");
                        return (
                          <div
                            key={lIdx}
                            className={
                              isAdd
                                ? "text-teal-300 bg-teal-950/40 px-1 rounded"
                                : isRemove
                                ? "text-red-300 bg-red-950/40 px-1 rounded"
                                : "text-slate-300"
                            }
                          >
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Telemetry Footer */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-600">
            <div className="flex items-center gap-4">
              <span>Diagnosis: Swarm (Nova 2 Lite)</span>
              <span>•</span>
              <span className="text-status-teal font-semibold">Two-Blade Gate: Active</span>
              <span>•</span>
              <span>Database: SQLite Persistent Log</span>
            </div>

            <Link
              to="/dashboard"
              className="text-navy font-semibold hover:underline flex items-center gap-1 text-xs"
            >
              Open Live Swarm Dashboard →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
