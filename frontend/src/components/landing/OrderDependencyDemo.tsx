import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ArrowLeftRight, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { useReplay } from "../../hooks/useReplay";
import { showcaseAttempt, shortTestName } from "../../lib/replay";

// The verified reproduction for marine-api PR #109 (agent/targets.py).
const POLLUTER = "SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar";
const VICTIM = "AISMessageFactoryTest#testCreate";

export const OrderDependencyDemo: React.FC = () => {
  const [isFailingOrder, setIsFailingOrder] = useState<boolean>(true);
  const { testCases } = useReplay();
  const showcase = showcaseAttempt(testCases);
  const polluter = showcase?.polluterTest ? shortTestName(showcase.polluterTest) : POLLUTER;
  const victim = showcase?.victimTest ?? VICTIM;

  const first = isFailingOrder
    ? {
        name: polluter,
        tag: "Polluter",
        text: 'Runs first. Registers a test-double VDMParser for "VDM", then unregisters it, which deletes the "VDM" entry from the shared SentenceFactory singleton. The class resets the factory before each test, never after.',
        code: 'instance.unregisterParser(VDMParser.class); // "VDM" entry deleted',
      }
    : {
        name: victim,
        tag: "Clean state",
        text: "Runs first. The singleton still holds the real VDM parser, so the AIS sentence in its field initializer parses.",
        code: "sf.createParser(s1); // PASS",
      };

  const second = isFailingOrder
    ? {
        name: victim,
        text: "Runs after the polluter. Its field initializer asks the factory for a VDM parser and finds none, so the constructor throws and every test in the class errors.",
        code: "UnsupportedSentenceException: Parser for type 'VDM' not found",
      }
    : {
        name: polluter,
        text: "Runs second. It still deletes the VDM entry, but no later test in this run needs it.",
        code: 'assertFalse(instance.hasParser("VDM")); // PASS',
      };

  return (
    <section id="demo" className="py-16 bg-surface-subtle/40 border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <Badge variant="amber" size="sm">
            JUnit 4 Test Order
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Case study: one test leaves a shared singleton dirty
          </h2>
          <p className="text-sm text-foreground/70">
            In the open-source{" "}
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-border text-slate-900 font-semibold">marine-api</code>{" "}
            Java library, one test deletes a parser from a shared singleton and never resets it. The victim fails whenever the
            test runner executes it afterwards. The maintainers fixed it upstream in PR #109.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="p-4 bg-surface-subtle border-b border-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-foreground/70">Runner order:</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFailingOrder(!isFailingOrder)}
                icon={<ArrowLeftRight className="w-3.5 h-3.5 text-navy" />}
              >
                Swap the Order
              </Button>
            </div>

            <Badge variant={isFailingOrder ? "amber" : "teal"} size="md">
              {isFailingOrder ? "Polluter first: the victim fails" : "Victim first: it passes"}
            </Badge>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isFailingOrder ? "bg-amber-50/40 border-amber-200" : "bg-teal-50/40 border-teal-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-border text-foreground">
                    Runs 1st
                  </span>
                  {isFailingOrder ? (
                    <span className="text-xs font-medium text-status-amber flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> {first.tag}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-status-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {first.tag}
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs font-semibold text-foreground break-all">{first.name}</div>
                <p className="text-xs text-foreground/70 mt-1">{first.text}</p>
                <div className="mt-3 p-2.5 rounded bg-navy text-white text-[11px] font-mono break-all">{first.code}</div>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  isFailingOrder ? "bg-red-50/50 border-red-200" : "bg-teal-50/40 border-teal-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-border text-foreground">
                    Runs 2nd
                  </span>
                  {isFailingOrder ? (
                    <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Victim fails
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-status-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passes
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs font-semibold text-foreground break-all">{second.name}</div>
                <p className="text-xs text-foreground/70 mt-1">{second.text}</p>
                <div className="mt-3 p-2.5 rounded bg-navy text-white text-[11px] font-mono break-all">
                  <span className={isFailingOrder ? "text-red-300 font-semibold" : "text-teal-300 font-semibold"}>{second.code}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-subtle border border-border">
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-sm text-foreground">How Flakeproof handles it</span>
                <p className="text-foreground/70 leading-relaxed">
                  The swarm pairs suspect tests with the victim. When a whole class passes, the tool pins its methods one at a
                  time, because a class that resets before each test hides its polluting method. Every candidate fix then goes
                  through the gate{showcase ? ` (attempt #${showcase.attemptId}):` : "."}
                </p>
                {showcase && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    {showcase.candidatePatches.slice(0, 3).map((patch) => (
                      <div
                        key={patch.id}
                        className={`p-2 rounded border ${
                          patch.verdict === "VERIFIED"
                            ? "bg-teal-50 border-teal-200 text-teal-900"
                            : patch.verdict === "REFUSED_BANDAID"
                              ? "bg-red-50 border-red-200 text-red-900"
                              : "bg-amber-50 border-amber-200 text-amber-900"
                        }`}
                      >
                        <strong>{patch.title}:</strong> {patch.blade1.passes}/{patch.blade1.runs} reruns passed.{" "}
                        <span className="font-bold">{patch.verdict}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
