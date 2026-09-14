import React from "react";
import { motion } from "motion/react";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { Search, Split, ShieldCheck, CheckCircle2, Bot, Database, Sparkles } from "lucide-react";

interface Step {
  stepNumber: string;
  title: string;
  badgeText: string;
  badgeVariant: "amber" | "teal" | "navy";
  icon: React.ReactNode;
  description: string;
  features: string[];
  codeSnippet: {
    filename: string;
    code: string[];
  };
}

// Every snippet line is real output recorded on September 13, 2026 (CLI output, runs.db events, a saved PR body).
const STEPS: Step[] = [
  {
    stepNumber: "01",
    title: "Intake Baseline",
    badgeText: "Rerun Harness",
    badgeVariant: "amber",
    icon: <Search className="w-5 h-5 text-status-amber" />,
    description:
      "Before touching any code, Flakeproof reruns the victim test under rotating Surefire orders: alphabetical, reverse alphabetical, random and filesystem. It reads the Surefire XML report, never the Maven exit code, and stores every run in SQLite.",
    features: [
      "20 baseline runs by default",
      "Scope: order-dependent flaky tests only",
      "A skipped test counts as a failure",
    ],
    codeSnippet: {
      filename: "attempt #1, CLI output",
      code: [
        "attempt #1: net.sf.marineapi.ais.parser.AISMessageFactoryTest#testCreate",
        "  baseline [1/20] pass alphabetical",
        "  baseline [2/20] FAIL reversealphabetical",
        "  baseline [3/20] pass random",
        "  baseline [4/20] pass filesystem",
        "// 14 of 20 baseline runs passed",
      ],
    },
  },
  {
    stepNumber: "02",
    title: "Agent Diagnosis",
    badgeText: "Strands Swarm on Nova 2 Lite",
    badgeVariant: "teal",
    icon: <Bot className="w-5 h-5 text-status-teal" />,
    description:
      "Four specialist agents built with Strands Agents (triage, order, async and resource) can hand the case to each other. They read the failure and the source, then confirm a suspect with real JVM experiments.",
    features: [
      "run_pair runs a suspect first, then the victim",
      "When a whole class passes, each method is pinned in turn",
      "12 pairings per attempt, shared by the team",
    ],
    codeSnippet: {
      filename: "attempt #4, events table",
      code: [
        "triage  failure_report",
        "triage  read_source AISMessageFactoryTest.java",
        "triage  read_source SentenceFactory.java",
        "triage  run_victim_alone",
        "triage  list_test_classes",
        "triage  run_pair first=SentenceFactoryTest",
        "// class passed, so its methods were pinned one at a time",
        "SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar: victim error",
        "triage  record_hypothesis order-dependent 0.90",
      ],
    },
  },
  {
    stepNumber: "03",
    title: "Diagnosis and Repair",
    badgeText: "Synthesizer + Repair Agents",
    badgeVariant: "amber",
    icon: <Split className="w-5 h-5 text-status-amber" />,
    description:
      "A synthesizer agent records one diagnosis. A repair agent edits the code, compiles it and snapshots each fix as a candidate patch. Hand-written planted candidates can be judged alongside the agents' own.",
    features: [
      "record_diagnosis: category, root cause, polluter",
      "edit_file, compile_check, propose_candidate",
      "Planted candidates load with --plant",
    ],
    codeSnippet: {
      filename: "attempt #4, events table and candidate diff",
      code: [
        "synthesizer  record_diagnosis order-dependent",
        "  polluter: SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar",
        "repair  candidate #10: Restore default VDM parser after testRegisterParserWithAlternativeBeginChar",
        "+    instance.reset();",
      ],
    },
  },
  {
    stepNumber: "04",
    title: "The Two-Blade Gate",
    badgeText: "Deterministic Decision",
    badgeVariant: "navy",
    icon: <ShieldCheck className="w-5 h-5 text-navy" />,
    description:
      "Each candidate is applied to a clean tree, compiled and judged twice. Blade 1 reruns it under rotating orders, and every run must pass. Blade 2 scans the diff for band-aids; a judge agent can add a refusal but cannot overrule the scanner.",
    features: [
      "Blade 1: every rerun must pass (200 by default)",
      "Blade 2: 8 band-aid families, including @Ignore and sleep",
      "Verdicts: VERIFIED, REFUSED_UNPROVEN, REFUSED_BANDAID",
    ],
    codeSnippet: {
      filename: "attempt #1, CLI summary (30 reruns each)",
      code: [
        "#1 [planted] Restore the VDM parser after the custom-parser test: REFUSED_UNPROVEN  blade1 17/30  blade2 CLEAN",
        "#2 [planted] Quarantine the test that breaks the AIS suite: REFUSED_BANDAID  blade1 30/30  blade2 BANDAID ignore",
        "#3 [planted] Reset SentenceFactory after every test (the fix upstream merged in PR #109): VERIFIED  blade1 30/30  blade2 CLEAN",
      ],
    },
  },
  {
    stepNumber: "05",
    title: "Pull Request with Evidence",
    badgeText: "PR Writer Agent",
    badgeVariant: "teal",
    icon: <Sparkles className="w-5 h-5 text-status-teal" />,
    description:
      "Only a verified candidate reaches the PR writer agent, and a hook re-checks the verdict before its tool runs. The pull request body carries the evidence and a stated confidence bound. Anything else is refused with the reason.",
    features: [
      "Two locks: the graph topology and the RefusalGuard hook",
      "Evidence: baseline, both blades, the confidence bound",
      "Dry runs save the body to data/pr-bodies/",
    ],
    codeSnippet: {
      filename: "data/pr-bodies/attempt-4.md (dry run)",
      code: [
        "# Fix flaky AISMessageFactoryTest by resetting VDM parser",
        "| Before the patch | 2/4 runs passed under rotating Surefire orders |",
        "| After the patch (Blade 1) | **5/5** runs passed under the same orders |",
        "// 5 of 5 reruns passed, including the one reverse-alphabetical run: a pipeline check, not statistical proof",
      ],
    },
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 bg-surface border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            How Flakeproof repairs tests, and refuses what it cannot prove
          </h2>
          <p className="text-base text-foreground/70">
            Every snippet is condensed from output recorded on September 13, 2026.
          </p>
        </div>

        <div className="space-y-6">
          {STEPS.map((step, idx) => (
            <motion.div
              key={step.stepNumber}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
            >
              <Card className="p-6 md:p-7 hover:border-navy-300 transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold font-mono text-foreground/30">{step.stepNumber}</span>
                      <Badge variant={step.badgeVariant} size="sm">
                        {step.badgeText}
                      </Badge>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-foreground">{step.title}</h3>

                    <p className="text-xs sm:text-sm text-foreground/75 leading-relaxed">{step.description}</p>

                    <ul className="space-y-1.5 pt-1 text-xs text-foreground/80 font-medium">
                      {step.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-status-teal shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="rounded-xl bg-navy text-white font-mono text-xs overflow-hidden border border-slate-700/60 shadow-lg">
                      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400 text-[11px] truncate flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-status-teal" />
                          {step.codeSnippet.filename}
                        </span>
                      </div>

                      <div className="p-3.5 space-y-1 overflow-x-auto text-[11px] leading-relaxed">
                        {step.codeSnippet.code.map((line, lIdx) => {
                          const isComment = line.trimStart().startsWith("//");
                          const isSuccess = line.includes("VERIFIED") || line.includes(" pass ") || line.startsWith("+");
                          const isRefused = line.includes("REFUSED") || line.includes("FAIL") || line.includes(" error");

                          return (
                            <div
                              key={lIdx}
                              className={
                                isComment
                                  ? "text-slate-400"
                                  : isRefused
                                    ? "text-amber-300 font-semibold bg-amber-950/40 px-1 rounded"
                                    : isSuccess
                                      ? "text-teal-300 font-semibold bg-teal-950/40 px-1 rounded"
                                      : "text-slate-200"
                              }
                            >
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
