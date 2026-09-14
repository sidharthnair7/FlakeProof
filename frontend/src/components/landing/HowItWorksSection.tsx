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

const STEPS: Step[] = [
  {
    stepNumber: "01",
    title: "Intake Baseline Measurement",
    badgeText: "Replay Profiler",
    badgeVariant: "amber",
    icon: <Search className="w-5 h-5 text-status-amber" />,
    description:
      "FlakeProof measures a baseline before proposing a repair. The recorded marine-api case ran 20 baseline checks across four fixed Surefire orders and exposed an order-dependent failure.",
    features: [
      "Baseline measured before any patch is evaluated",
      "Strict scope: order-dependent flaky tests only",
      "Runs, failures, and order labels persisted to SQLite",
    ],
    codeSnippet: {
      filename: "flakeproof-intake.log",
      code: [
        "// Recorded SQLite evidence: attempt #5",
        "Target: AISMessageFactoryTest#testCreate",
        "Baseline: 20 controlled runs",
        "Pass: 13 | Fail: 7 | Failure rate: 35%",
        "Reverse alphabetical: 0/5 passed",
        "-> Dispatched to Diagnosis Swarm on Amazon Bedrock",
      ],
    },
  },
  {
    stepNumber: "02",
    title: "4-Agent Diagnosis Swarm",
    badgeText: "Amazon Nova 2 Lite (Bedrock)",
    badgeVariant: "teal",
    icon: <Bot className="w-5 h-5 text-status-teal" />,
    description:
      "A Strands Swarm provides Triage, Order, Async, and Resource specialists. They can hand work to one another while recording hypotheses and tool calls for review.",
    features: [
      "Triage Specialist: reads failures and framework boundaries",
      "Order Specialist: investigates test-order dependence",
      "Async & Resource Specialists: investigate races and shared resources",
    ],
    codeSnippet: {
      filename: "strands-agent-swarm.diag",
      code: [
        "Triage: run_pair isolated the polluting method",
        "Diagnosis: order-dependent shared-factory state",
        "Repair: proposed a reset at the polluter boundary",
        "Recorded agent run: repair passed 5/5 before later re-judging",
        "-> Diagnosis synthesized; dispatched to Repair Agent",
      ],
    },
  },
  {
    stepNumber: "03",
    title: "Synthesizer & Repair Candidates",
    badgeText: "Nova 2 Lite Code Gen",
    badgeVariant: "amber",
    icon: <Split className="w-5 h-5 text-status-amber" />,
    description:
      "A synthesizer agent formally records the diagnosis into SQLite, and a repair agent powered by Amazon Nova 2 Lite generates candidate patches to fix the root cause without masking it.",
    features: [
      "Synthesizes teardown reset hooks (@After / @AfterEach)",
      "Generates multiple candidate strategies for deterministic evaluation",
      "All candidate patches and their verdicts logged to SQLite",
    ],
    codeSnippet: {
      filename: "candidate-patches.patch",
      code: [
        "Candidate 1: Re-registers VDM after the custom-parser test",
        "Candidate 2: Annotates polluter test with @Ignore",
        "Candidate 3: Adds @After teardown resetting SentenceFactory singleton",
        "// Sending all 3 candidates to the Deterministic Gate...",
      ],
    },
  },
  {
    stepNumber: "04",
    title: "Deterministic Two-Blade Gate",
    badgeText: "Deterministic Approval",
    badgeVariant: "navy",
    icon: <ShieldCheck className="w-5 h-5 text-navy" />,
    description:
      "The gate is the final approval authority. Blade 1 runs a fixed rotation of Surefire orders and requires every rerun to pass. Blade 2 deterministically scans the diff for band-aid patterns. A model judge can add a refusal, never approve a patch.",
    features: [
      "Blade 1: Reruns across alphabetical, reverse alphabetical, random, and filesystem orders",
      "Blade 2: Diff scan refuses sleep, retry, @Ignore, pinned order, weakened assertions",
      "Verdicts: VERIFIED, REFUSED_UNPROVEN, or REFUSED_BANDAID",
    ],
    codeSnippet: {
      filename: "two-blade-gate.eval",
      code: [
        "[Candidate 1]: Blade 1: 121/200 passed. -> REFUSED_UNPROVEN",
        "[Candidate 2]: Blade 1: 200/200 passed. Diff scan caught @Ignore -> REFUSED_BANDAID",
        "[Candidate 3]: Blade 1: 200/200 passed. Diff scan clean -> VERIFIED",
        "// Gate policy: Only VERIFIED fixes proceed to PR Agent",
      ],
    },
  },
  {
    stepNumber: "05",
    title: "PR Evidence Agent & SQLite Audit",
    badgeText: "Automated PR with Proof",
    badgeVariant: "teal",
    icon: <Sparkles className="w-5 h-5 text-status-teal" />,
    description:
      "Only a verified patch can reach the PR agent. Its pull request includes the recorded rerun and scan evidence; unproven and band-aid patches are refused with their reason.",
    features: [
      "The graph cannot route around a non-VERIFIED verdict",
      "SQLite records every run, candidate, and decision",
      "Pull request #1 links the recorded evidence",
    ],
    codeSnippet: {
      filename: "GitHub PR #1 - marine-api fork",
      code: [
        "Title: Fix order-dependent AIS test flake via SentenceFactory reset",
        "Evidence:",
        "- Blade 1: 200/200 controlled reruns passed",
        "- Blade 2: deterministic diff scan found no band-aids",
        "- SQLite evidence: recorded attempt #5",
      ],
    },
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 bg-surface border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="teal" size="sm">
              AWS "Agents for Humans" Hackathon
            </Badge>
            <Badge variant="navy" size="sm">
              Amazon Nova 2 Lite
            </Badge>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            How FlakeProof Repairs Tests and Proves Every Fix
          </h2>
          <p className="text-base text-foreground/70">
            FlakeProof refuses to propose any fix it cannot prove. From intake baseline to a deterministic two-blade gate, every step is persisted in SQLite.
          </p>
        </div>

        {/* 5 Step Cards with Motion Scroll Reveal */}
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
                  {/* Left Column: Details */}
                  <div className="lg:col-span-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold font-mono text-foreground/30">
                        {step.stepNumber}
                      </span>
                      <Badge variant={step.badgeVariant} size="sm">
                        {step.badgeText}
                      </Badge>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      {step.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-foreground/75 leading-relaxed">
                      {step.description}
                    </p>

                    <ul className="space-y-1.5 pt-1 text-xs text-foreground/80 font-medium">
                      {step.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-status-teal shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column: Code Snippet */}
                  <div className="lg:col-span-6">
                    <div className="rounded-xl bg-navy text-white font-mono text-xs overflow-hidden border border-slate-700/60 shadow-lg">
                      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400 text-[11px] truncate flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-status-teal" />
                          {step.codeSnippet.filename}
                        </span>
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1 overflow-x-auto text-[11px] leading-relaxed">
                        {step.codeSnippet.code.map((line, lIdx) => {
                          const isSuccess = line.includes("VERIFIED") || line.includes("PASS") || line.includes("PR #1");
                          const isRefused = line.includes("REFUSED") || line.includes("Fail") || line.includes("corrupted");
                          const isComment = line.startsWith("//");

                          return (
                            <div
                              key={lIdx}
                              className={
                                isSuccess
                                  ? "text-teal-300 font-semibold bg-teal-950/40 px-1 rounded"
                                  : isRefused
                                  ? "text-amber-300 font-semibold bg-amber-950/40 px-1 rounded"
                                  : isComment
                                  ? "text-slate-400"
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
