import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ArrowLeftRight, CheckCircle2, XCircle, ShieldAlert, Sparkles, Database } from "lucide-react";

export const OrderDependencyDemo: React.FC = () => {
  const [isFailingOrder, setIsFailingOrder] = useState<boolean>(true);

  return (
    <section id="demo" className="py-16 bg-surface-subtle/40 border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <Badge variant="amber" size="sm">
            Interactive Java JUnit Permutation
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            The Ground-Truth Case Study: marine-api Singleton Pollution
          </h2>
          <p className="text-sm text-foreground/70">
            In the open-source <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-border text-slate-900 font-semibold">marine-api</code> Java library, one test deletes a parser from a shared singleton and never resets it. A victim test crashes with <code className="font-mono text-red-600">IllegalArgumentException</code> whenever the test runner executes it afterwards.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 bg-surface-subtle border-b border-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-foreground/70">
                Runner Execution Sequence:
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFailingOrder(!isFailingOrder)}
                icon={<ArrowLeftRight className="w-3.5 h-3.5 text-navy" />}
              >
                Invert Execution Order
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={isFailingOrder ? "amber" : "teal"} size="md">
                {isFailingOrder ? "Sequence: Fails in CI (Exit 1 - 56% flakiness)" : "Sequence: Passes Locally (Exit 0)"}
              </Badge>
            </div>
          </div>

          {/* Side by side test cards */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Test Slot 1 */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isFailingOrder
                    ? "bg-amber-50/40 border-amber-200"
                    : "bg-teal-50/40 border-teal-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-border text-foreground">
                    Step 1 in Runner
                  </span>
                  {isFailingOrder ? (
                    <span className="text-xs font-medium text-status-amber flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Singleton Polluter
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-status-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pristine State
                    </span>
                  )}
                </div>

                <div className="font-mono text-xs font-semibold text-foreground">
                  {isFailingOrder
                    ? "SentenceFactoryTest.testDeleteParser()"
                    : "PositionProviderTest.testGLLSentence()"}
                </div>
                <p className="text-xs text-foreground/70 mt-1">
                  {isFailingOrder
                    ? "Runs first. Deletes the 'GLL' sentence parser from SentenceFactory.getInstance() and never resets the singleton."
                    : "Runs first. SentenceFactory singleton still contains default GLL parser, successfully parsing GPS sentences."}
                </p>
                <div className="mt-3 p-2.5 rounded bg-navy text-white text-[11px] font-mono">
                  {isFailingOrder
                    ? "factory.deleteParser(\"GLL\"); // singleton corrupted!"
                    : "provider.parse(gllSentence); // PASS: GLL parser available"}
                </div>
              </div>

              {/* Test Slot 2 */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isFailingOrder
                    ? "bg-red-50/50 border-red-200"
                    : "bg-teal-50/40 border-teal-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-border text-foreground">
                    Step 2 in Runner
                  </span>
                  {isFailingOrder ? (
                    <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Victim Crashes
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-status-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passes
                    </span>
                  )}
                </div>

                <div className="font-mono text-xs font-semibold text-foreground">
                  {isFailingOrder
                    ? "PositionProviderTest.testGLLSentence()"
                    : "SentenceFactoryTest.testDeleteParser()"}
                </div>
                <p className="text-xs text-foreground/70 mt-1">
                  {isFailingOrder
                    ? "Runs after polluter. Queries SentenceFactory for 'GLL' parser, finds it missing, and crashes!"
                    : "Runs second. Deletes parser, but no further tests in this run require GLL parsing."}
                </p>
                <div className="mt-3 p-2.5 rounded bg-navy text-white text-[11px] font-mono">
                  {isFailingOrder ? (
                    <span className="text-red-300 font-semibold">
                      IllegalArgumentException: Unknown sentence 'GLL'
                    </span>
                  ) : (
                    <span className="text-teal-300 font-semibold">
                      factory.deleteParser(\"GLL\"); // Assert deleted - PASS
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* FlakeProof Resolution Explainer */}
            <div className="p-4 rounded-xl bg-surface-subtle border border-border flex items-start gap-3">
              <div className="p-2 rounded-lg bg-status-teal-light text-status-teal shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-navy" />
                  How FlakeProof Resolves This (Refusing All Masks)
                </span>
                <p className="text-foreground/70 leading-relaxed">
                  The 4-agent swarm on Amazon Nova 2 Lite identifies that <code className="font-mono bg-white px-1 py-0.5 rounded border border-border text-foreground font-semibold">PositionProviderTest</code> only fails when preceded by <code className="font-mono bg-white px-1 py-0.5 rounded border border-border text-foreground font-semibold">SentenceFactoryTest</code>. Candidate fixes are fed to the Two-Blade Gate:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                    <strong>Wrong class restore:</strong> Fails 17/30 runs. <span className="font-bold text-status-amber">REFUSED_UNPROVEN</span>
                  </div>
                  <div className="p-2 rounded bg-red-50 border border-red-200 text-red-900">
                    <strong>@Ignore mask:</strong> Passes 200 runs, caught by AST scan. <span className="font-bold text-red-600">REFUSED_BANDAID</span>
                  </div>
                  <div className="p-2 rounded bg-teal-50 border border-teal-200 text-teal-900">
                    <strong>@After reset singleton:</strong> Passes 200 runs, clean AST. <span className="font-bold text-status-teal">VERIFIED (PR Opened)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
