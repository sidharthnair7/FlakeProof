import React, { useState } from "react";
import { motion } from "motion/react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Play, RotateCcw, ArrowRight, ShieldCheck, GitPullRequest, Layers, Search, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import type { PipelineStage } from "../../lib/types";

interface StageInfo {
  id: PipelineStage;
  label: string;
  badgeVariant: "amber" | "teal" | "neutral";
  detail: string;
}

const STAGES: StageInfo[] = [
  {
    id: "intake",
    label: "1. Intake Baseline",
    badgeVariant: "amber",
    detail: "Reruns PositionProviderTest 30 times. Baseline flakiness measured at 56.7% across order permutations.",
  },
  {
    id: "diagnosis",
    label: "2. Swarm Diagnosis",
    badgeVariant: "amber",
    detail: "4-agent swarm on Amazon Nova 2 Lite bisects order sequence; isolates SentenceFactory singleton leak.",
  },
  {
    id: "gate",
    label: "3. Two-Blade Gate",
    badgeVariant: "neutral",
    detail: "Zero AI. Blade 1 reruns 200 order permutations. Blade 2 scans AST for band-aids (@Ignore, sleep, retry).",
  },
  {
    id: "verdict",
    label: "4. Verdict & PR",
    badgeVariant: "teal",
    detail: "VERIFIED teardown reset passes all 200 runs + clean AST. PR #142 opened with evidence logged to SQLite.",
  },
];

export const LivePreviewSnippet: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<PipelineStage>("gate");

  const advanceStage = () => {
    if (currentStage === "intake") setCurrentStage("diagnosis");
    else if (currentStage === "diagnosis") setCurrentStage("gate");
    else if (currentStage === "gate") setCurrentStage("verdict");
    else setCurrentStage("intake");
  };

  const resetStage = () => setCurrentStage("intake");

  return (
    <section className="py-16 bg-surface border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <Badge variant="teal" size="sm" className="mb-2">
              Interactive Pipeline Preview
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Watch an order-dependent flake move through the Two-Blade Gate
            </h2>
            <p className="text-sm text-foreground/70 mt-1 max-w-xl">
              FlakeProof cards advance across pipeline stages as agents bisect permutations, synthesize patches, and submit to the deterministic gate.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={advanceStage}
              icon={<Play className="w-3.5 h-3.5 text-navy" />}
            >
              Advance Stage
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetStage}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>
            <Link to="/dashboard">
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Open FlakeProof Console
              </Button>
            </Link>
          </div>
        </div>

        {/* 4-column Mini Kanban preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-surface-subtle border border-border">
          {STAGES.map((stage) => {
            const isCurrent = currentStage === stage.id;

            return (
              <div
                key={stage.id}
                className={`flex flex-col min-h-[230px] rounded-xl p-3.5 border transition-colors ${
                  isCurrent
                    ? "bg-white border-navy/30 shadow-card"
                    : "bg-surface-subtle/50 border-border/60"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                  <span className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
                    {stage.id === "intake" && <Search className="w-3 h-3 text-status-amber" />}
                    {stage.id === "diagnosis" && <Bot className="w-3 h-3 text-status-teal" />}
                    {stage.id === "gate" && <Layers className="w-3 h-3 text-navy" />}
                    {stage.id === "verdict" && <ShieldCheck className="w-3 h-3 text-status-teal" />}
                    {stage.label}
                  </span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-status-teal animate-ping" />
                  )}
                </div>

                {/* Card slot */}
                <div className="flex-1 flex flex-col justify-start relative">
                  {isCurrent ? (
                    <motion.div
                      layoutId="preview-card"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      className="p-3.5 rounded-lg bg-surface border border-border shadow-md space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={stage.id === "verdict" ? "teal" : stage.id === "gate" ? "navy" : "amber"}
                          size="sm"
                        >
                          {stage.id === "verdict"
                            ? "VERIFIED (Passed Both Blades)"
                            : stage.id === "gate"
                            ? "Blade 1: 200 Runs"
                            : "marine-api Java Flake"}
                        </Badge>
                        <span className="text-[10px] font-mono text-foreground/50">
                          sqlite_0x8f2a
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-mono font-medium text-foreground truncate">
                          PositionProviderTest.testGLLSentence()
                        </div>
                        <p className="text-[11px] text-foreground/70 line-clamp-2 leading-relaxed">
                          {stage.detail}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-foreground/60">
                        <span className="flex items-center gap-1">
                          {stage.id === "verdict" ? (
                            <GitPullRequest className="w-3 h-3 text-status-teal" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-navy" />
                          )}
                          {stage.id === "verdict" ? "PR #142 Opened" : "Polluter: SentenceFactoryTest"}
                        </span>
                        <span className="text-status-teal font-medium">
                          {stage.id === "verdict" ? "100% Proven" : "56.7% Flake"}
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-border/60 rounded-lg p-4 text-center">
                      <span className="text-[11px] text-foreground/40 font-mono">
                        Stage Inactive
                      </span>
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
