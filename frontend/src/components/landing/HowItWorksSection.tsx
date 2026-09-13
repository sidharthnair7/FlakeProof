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
      "When a test exhibits intermittency, FlakeProof reruns the test 30+ times to measure its baseline flakiness rate, isolate its timing signature, and confirm whether it is an order-dependent flake.",
    features: [
      "Automated baseline execution (30+ iterations)",
      "Strict scope: order-dependent flaky tests only",
      "Cryptographic run ID logged to persistent SQLite database",
    ],
    codeSnippet: {
      filename: "flakeproof-intake.log",
      code: [
        "// SQLite Audit ID: sqlite_run_0x8f2a9d41",
        "Target: PositionProviderTest.testGLLSentence()",
        "Baseline iterations: 30 runs executed",
        "Pass: 13 | Fail: 17 | Flakiness rate: 56.7%",
        "Signature: Intermittent failure under order permutations",
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
      "A swarm of 4 specialist agents (Triage, Order, Async, and Resource) built with Strands Agents hands the case between them to isolate the minimal polluter-victim test pair and identify the root cause.",
    features: [
      "Triage Specialist: analyzes stack traces and framework boundaries",
      "Order Specialist: bisects test order sequences to find polluter",
      "Async & Resource Specialists: trace thread pools and singleton leaks",
    ],
    codeSnippet: {
      filename: "strands-agent-swarm.diag",
      code: [
        "Triage: Classified order-dependent singleton leak",
        "Order: Bisected minimal pair (SentenceFactoryTest -> PositionProviderTest)",
        "Resource: Isolated singleton leak in SentenceFactory.getInstance()",
        "Async: Verified zero unclosed worker threads or countdown latches",
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
      "All candidate patches hashed and logged to SQLite",
    ],
    codeSnippet: {
      filename: "candidate-patches.patch",
      code: [
        "Candidate 1: Restores parser with wrong class (GGASentenceParser)",
        "Candidate 2: Annotates polluter test with @Ignore",
        "Candidate 3: Adds @After teardown resetting SentenceFactory singleton",
        "// Sending all 3 candidates to the Deterministic Gate...",
      ],
    },
  },
  {
    stepNumber: "04",
    title: "Deterministic Two-Blade Gate",
    badgeText: "Zero AI Inside (Strict Code)",
    badgeVariant: "navy",
    icon: <ShieldCheck className="w-5 h-5 text-navy" />,
    description:
      "No AI is trusted to verify the fix. A purely deterministic two-blade gate judges each candidate twice: Blade 1 tests 200 random order permutations (100% must pass). Blade 2 inspects the AST for band-aids and refuses them even if all runs pass.",
    features: [
      "Blade 1: Reruns test 200 times across randomized test orders (all must pass)",
      "Blade 2: AST scan refuses sleep, retry, @Ignore, pinned order, weakened assertions",
      "Verdicts: VERIFIED, REFUSED_UNPROVEN, or REFUSED_BANDAID",
    ],
    codeSnippet: {
      filename: "two-blade-gate.eval",
      code: [
        "[Candidate 1]: Blade 1: 13/30 runs passed. -> REFUSED_UNPROVEN",
        "[Candidate 2]: Blade 1: 200/200 passed. Blade 2: AST caught @Ignore! -> REFUSED_BANDAID",
        "[Candidate 3]: Blade 1: 200/200 passed. Blade 2: Clean AST (0 masks). -> VERIFIED",
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
      "Only a verified patch reaches the PR agent, which opens a GitHub pull request backed by cryptographic SQLite evidence (the 200 green runs and clean AST scan). Unproven or band-aid patches are permanently refused with the offending reason.",
    features: [
      "Zero developer interruption required",
      "Cryptographic SQLite audit record of every run and decision",
      "Pull request contains mathematical proof of order-invariance",
    ],
    codeSnippet: {
      filename: "GitHub PR #142 - marine-api",
      code: [
        "Title: Fix order-dependent flake in PositionProviderTest via singleton reset",
        "Evidence:",
        "- Blade 1: 200/200 randomized order replays passed (0 flakes)",
        "- Blade 2: AST scan verified zero band-aids (@Ignore, sleep, retry)",
        "- SQLite Audit: sqlite_run_0x8f2a9d41 (Hash: 0x3f7a...9d21)",
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
                          const isSuccess = line.includes("VERIFIED") || line.includes("PASS") || line.includes("PR #142");
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
