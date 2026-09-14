import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ArrowLeftRight, CheckCircle2, XCircle, ShieldAlert, Sparkles, Database } from "lucide-react";

/** Class#method with a line-break opportunity after the #, so long JUnit names wrap there first. */
const TestName: React.FC<{ name: string }> = ({ name }) => {
  const [cls, method] = name.split("#");
  return (
    <>
      {cls}#<wbr />
      {method}
    </>
  );
};

export const OrderDependencyDemo: React.FC = () => {
  const [isFailingOrder, setIsFailingOrder] = useState<boolean>(true);

  return (
    <section id="demo" className="py-16 bg-surface-subtle/40 border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <Badge variant="amber" size="sm">
            Interactive controlled-order illustration
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Recorded Case Study: marine-api Shared-State Leak
          </h2>
          <p className="text-sm text-foreground/70">
            In the open-source <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-border text-slate-900 font-semibold">marine-api</code> Java library, one test unregisters VDM from a shared factory without teardown cleanup. A later AIS test can then fail with <code className="font-mono text-red-600">Parser for type 'VDM' not found</code>.
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
                {isFailingOrder ? "Recorded failing order: polluter first" : "Control order: victim first"}
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
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-border text-foreground">
                    Step 1 in Runner
                  </span>
                  {isFailingOrder ? (
                    <span className="shrink-0 text-xs font-medium text-status-amber flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Singleton Polluter
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-status-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pristine State
                    </span>
                  )}
                </div>

                <div className="break-words font-mono text-[11px] font-semibold leading-relaxed text-foreground sm:text-xs">
                  <TestName name={isFailingOrder
                    ? "SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar"
                    : "AISMessageFactoryTest#testCreate"} />
                </div>
                <p className="text-xs text-foreground/70 mt-1">
                  {isFailingOrder
                    ? "Runs first. Unregisters VDM from the shared SentenceFactory; without teardown, that state leaks to later tests."
                    : "Runs first while SentenceFactory still has the default VDM parser."}
                </p>
                <div className="mt-3 break-words rounded bg-navy p-2.5 font-mono text-[11px] text-white">
                  {isFailingOrder
                    ? "instance.unregisterParser(VDMParser.class); // shared state changed"
                    : "factory.createParser(\"!AIVDM,...\"); // VDM parser available"}
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
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-border text-foreground">
                    Step 2 in Runner
                  </span>
                  {isFailingOrder ? (
                    <span className="shrink-0 text-xs font-medium text-red-600 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Victim Crashes
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-status-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passes
                    </span>
                  )}
                </div>

                <div className="break-words font-mono text-[11px] font-semibold leading-relaxed text-foreground sm:text-xs">
                  <TestName name={isFailingOrder
                    ? "AISMessageFactoryTest#testCreate"
                    : "SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar"} />
                </div>
                <p className="text-xs text-foreground/70 mt-1">
                  {isFailingOrder
                    ? "Runs after the polluter. A VDM parser is missing from SentenceFactory, so parsing fails."
                    : "Runs second after the victim has already completed."}
                </p>
                <div className="mt-3 break-words rounded bg-navy p-2.5 font-mono text-[11px] text-white">
                  {isFailingOrder ? (
                    <span className="text-red-300 font-semibold">
                      error: Parser for type 'VDM' not found
                    </span>
                  ) : (
                    <span className="text-teal-300 font-semibold">
                      instance.unregisterParser(VDMParser.class); // test completes
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
                  FlakeProof records the polluter-victim relationship and sends candidates to the Two-Blade Gate. This case proves why passing reruns alone is insufficient:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div className="min-w-0 break-words p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                    <strong>VDM re-register:</strong> Passes 121/200. <span className="font-bold text-status-amber">REFUSED_UNPROVEN</span>
                  </div>
                  <div className="min-w-0 break-words p-2 rounded bg-red-50 border border-red-200 text-red-900">
                    <strong>@Ignore mask:</strong> Passes 200/200, caught by the diff scan. <span className="font-bold text-red-600">REFUSED_BANDAID</span>
                  </div>
                  <div className="min-w-0 break-words p-2 rounded bg-teal-50 border border-teal-200 text-teal-900">
                    <strong>@After factory reset:</strong> Passes 200/200, clean scan. <span className="font-bold text-status-teal">VERIFIED (PR #1)</span>
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
