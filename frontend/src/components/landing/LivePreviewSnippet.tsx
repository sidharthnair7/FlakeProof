import React, { useState } from "react";
import { motion } from "motion/react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Play, RotateCcw, ArrowRight, ShieldCheck, GitPullRequest, Layers, Search, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import type { FlakyTestCase, PipelineStage } from "../../lib/types";
import { useReplay } from "../../hooks/useReplay";
import { latestAgentAttempt } from "../../lib/replay";

interface StageInfo {
  id: PipelineStage;
  label: string;
  detail: string;
}

function stagesFor(run: FlakyTestCase | undefined): StageInfo[] {
  const verified = run?.candidatePatches.find((p) => p.verdict === "VERIFIED");
  const cause = run?.rootCause ?? "";
  return [
    {
      id: "intake",
      label: "1. Intake Baseline",
      detail: run
        ? `${run.baselinePasses} of ${run.baselineRuns} baseline runs passed under rotating test orders, before any change.`
        : "Reruns the victim under rotating test orders before any change.",
    },
    {
      id: "diagnosis",
      label: "2. Agent Diagnosis",
      detail: cause
        ? `Diagnosis recorded by the agents: ${cause.slice(0, 150)}${cause.length > 150 ? "..." : ""}`
        : "The swarm, synthesizer and repair agents on Amazon Nova 2 Lite find the cause and write a fix.",
    },
    {
      id: "gate",
      label: "3. Two-Blade Gate",
      detail: run
        ? `${run.candidatePatches.length} candidate(s) judged: Blade 1 reruns each one, Blade 2 scans its diff for band-aids.`
        : "Blade 1 reruns each candidate. Blade 2 scans its diff for band-aids.",
    },
    {
      id: "verdict",
      label: "4. Verdict & PR",
      detail: verified
        ? `"${verified.title}" VERIFIED at ${verified.blade1.passes}/${verified.blade1.runs} reruns.${
            run?.prUrl ? " Pull request opened." : " No pull request was opened in this run."
          }`
        : run
          ? `Attempt verdict: ${run.verdict}. Nothing is proposed unless a candidate is verified.`
          : "Only a VERIFIED candidate reaches the pull request.",
    },
  ];
}

export const LivePreviewSnippet: React.FC = () => {
  const { testCases } = useReplay();
  const run = latestAgentAttempt(testCases);
  const stages = stagesFor(run);
  const [currentStage, setCurrentStage] = useState<PipelineStage>("intake");

  const advanceStage = () => {
    if (currentStage === "intake") setCurrentStage("diagnosis");
    else if (currentStage === "diagnosis") setCurrentStage("gate");
    else if (currentStage === "gate") setCurrentStage("verdict");
    else setCurrentStage("intake");
  };

  return (
    <section className="py-16 bg-surface border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <Badge variant="teal" size="sm" className="mb-2">
              Step Through a Recorded Run
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Watch an order-dependent flake move through the gate
            </h2>
            <p className="text-sm text-foreground/70 mt-1 max-w-xl">
              Every number below comes from {run ? `attempt #${run.attemptId}` : "the recorded runs"} in data/runs.db, the
              latest run where the agents worked.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={advanceStage} icon={<Play className="w-3.5 h-3.5 text-navy" />}>
              Next Stage
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentStage("intake")} icon={<RotateCcw className="w-3.5 h-3.5" />}>
              Start Over
            </Button>
            <Link to="/dashboard">
              <Button variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Open the Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-surface-subtle border border-border">
          {stages.map((stage) => {
            const isCurrent = currentStage === stage.id;

            return (
              <div
                key={stage.id}
                className={`flex flex-col min-h-[230px] rounded-xl p-3.5 border transition-colors ${
                  isCurrent ? "bg-white border-navy/30 shadow-card" : "bg-surface-subtle/50 border-border/60"
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                  <span className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
                    {stage.id === "intake" && <Search className="w-3 h-3 text-status-amber" />}
                    {stage.id === "diagnosis" && <Bot className="w-3 h-3 text-status-teal" />}
                    {stage.id === "gate" && <Layers className="w-3 h-3 text-navy" />}
                    {stage.id === "verdict" && <ShieldCheck className="w-3 h-3 text-status-teal" />}
                    {stage.label}
                  </span>
                  {isCurrent && <span className="w-2 h-2 rounded-full bg-status-teal animate-ping" />}
                </div>

                <div className="flex-1 flex flex-col justify-start relative">
                  {isCurrent ? (
                    <motion.div
                      layoutId="preview-card"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      className="p-3.5 rounded-lg bg-surface border border-border shadow-md space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={stage.id === "verdict" ? "teal" : stage.id === "gate" ? "navy" : "amber"} size="sm">
                          {stage.id === "verdict"
                            ? (run?.verdict ?? "Verdict")
                            : stage.id === "gate"
                              ? "Blade 1 + Blade 2"
                              : (run?.repository ?? "marine-api")}
                        </Badge>
                        <span className="text-[10px] font-mono text-foreground/50">attempt #{run?.attemptId ?? "?"}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-mono font-medium text-foreground truncate">
                          {run?.testTitle ?? "No agent run recorded yet"}
                        </div>
                        <p className="text-[11px] text-foreground/70 line-clamp-4 leading-relaxed">{stage.detail}</p>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-foreground/60">
                        <span className="flex items-center gap-1">
                          {stage.id === "verdict" ? (
                            <GitPullRequest className="w-3 h-3 text-status-teal" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-navy" />
                          )}
                          {stage.id === "verdict" ? (run?.prUrl ? "PR opened" : "No PR opened") : run ? `${run.jvmRuns} JVM runs` : ""}
                        </span>
                        <span className="text-status-teal font-medium">
                          {run ? `${run.baselinePasses}/${run.baselineRuns} baseline` : ""}
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-border/60 rounded-lg p-4 text-center">
                      <span className="text-[11px] text-foreground/40 font-mono">Stage Inactive</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
