import React, { useEffect, useState } from "react";
import { GitPullRequest, X } from "lucide-react";
import type { AgentLog, FlakyTestCase, OrderTally } from "../../lib/types";
import { ORDER_NAMES, blade1Summary, orderLabel, scanSummary, sortOrders } from "../../lib/replay";
import { DiffBlock } from "../ui/DiffBlock";
import { VerdictTag } from "./verdict";

interface RunDetailProps {
  test: FlakyTestCase | null;
  logs: AgentLog[];
  onClose: () => void;
}

function runSentence(t: FlakyTestCase): string {
  const before = t.baselineRuns ? `Before any fix, the test passed ${t.baselinePasses} of ${t.baselineRuns} runs. ` : "";
  if (t.status === "RUNNING") return `${before}This run is still in progress.`;
  if (t.status === "FAILED") return `${before}This run stopped before it finished.`;
  const fix = t.candidatePatches.find((p) => p.verdict === "VERIFIED");
  const refused = t.candidatePatches.filter((p) => p.verdict === "REFUSED_BANDAID" || p.verdict === "REFUSED_UNPROVEN").length;
  if (fix) {
    const whose = fix.source === "agent" ? "the repair agent's patch" : "a planted patch";
    const pr = t.prUrl ? ", and Flakeproof opened a pull request" : "; no pull request was opened in this run";
    const others = refused ? ` It refused ${refused} other ${refused === 1 ? "patch" : "patches"}.` : "";
    return `${before}The gate verified ${whose}, "${fix.title}"${pr}.${others}`;
  }
  if (t.candidatePatches.length === 0) return `${before}No patches were judged.`;
  return `${before}The gate refused every patch, so nothing was proposed.`;
}

const cell = (t: OrderTally[string] | undefined) => (t ? `${t.passes}/${t.runs}` : "n/a");

export const RunDetail: React.FC<RunDetailProps> = ({ test, logs, onClose }) => {
  const [selected, setSelected] = useState(0);
  const testId = test?.id;
  const defaultPatch = test?.activePatchIndex ?? 0;

  useEffect(() => {
    setSelected(defaultPatch);
  }, [testId, defaultPatch]);

  useEffect(() => {
    if (!testId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [testId, onClose]);

  if (!test) return null;

  const patches = test.candidatePatches;
  const patch = patches[selected] ?? patches[0];
  const events = logs.filter((l) => l.attemptId === test.attemptId).reverse();
  const orders = sortOrders([
    ...Object.keys(test.baselineByOrder),
    ...patches.flatMap((p) => Object.keys(p.blade1.byOrder)),
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-detail-title"
        className="relative w-full max-w-4xl rounded-xl bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <p className="text-sm text-foreground/50">
              Run #{test.attemptId} · {test.createdAt} · {test.repository}
            </p>
            <h2 id="run-detail-title" className="mt-0.5 break-all font-mono text-base font-semibold text-foreground">
              {test.testTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-foreground/50 hover:bg-surface-subtle hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-8 px-6 py-6">
          <p className="text-sm leading-relaxed text-foreground">{runSentence(test)}</p>
          {test.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{test.error}</p>}

          {patches.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground">Patches the gate judged</h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="border-b border-border bg-surface-subtle text-foreground/60">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Patch</th>
                      <th scope="col" className="px-3 py-2 font-medium">Reruns passed</th>
                      <th scope="col" className="px-3 py-2 font-medium">Band-aid scan</th>
                      <th scope="col" className="px-3 py-2 font-medium">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {patches.map((p, i) => (
                      <tr
                        key={p.id}
                        tabIndex={0}
                        onClick={() => setSelected(i)}
                        onKeyDown={(e) => e.key === "Enter" && setSelected(i)}
                        aria-selected={i === selected}
                        className={`cursor-pointer align-top focus:outline-none ${i === selected ? "bg-navy-50" : "hover:bg-surface-hover"}`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-foreground">{p.title}</div>
                          <div className="text-xs text-foreground/50">
                            #{p.number}, {p.source === "agent" ? "written by the repair agent" : "planted from a .diff file"}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-foreground/80">
                          {p.blade1.runs ? `${p.blade1.passes} of ${p.blade1.runs}` : "not rerun"}
                        </td>
                        <td className="px-3 py-2.5 text-foreground/80">
                          {p.blade2.verdict === "BANDAID"
                            ? `Band-aid${p.blade2.lineNo ? `, line ${p.blade2.lineNo}` : ""}`
                            : p.blade2.verdict === "CLEAN"
                              ? "Clean"
                              : "Not run"}
                        </td>
                        <td className="px-3 py-2.5">
                          <VerdictTag verdict={p.verdict} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {orders.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground">Reruns by test order</h3>
              <p className="mt-1 text-sm text-foreground/60">
                A patch can only prove it removed the leak in orders where the unfixed code failed every run
                {test.strictOrders.length ? `: here, ${orderLabel(test.strictOrders)}` : ""}. In the other orders the flaky
                test runs first and passes either way.
              </p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface-subtle text-foreground/60">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Test order</th>
                      <th scope="col" className="px-3 py-2 font-medium">Before any fix</th>
                      {patches.map((p) => (
                        <th key={p.id} scope="col" className="px-3 py-2 font-medium">
                          #{p.number}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o) => {
                      const strict = test.strictOrders.includes(o);
                      return (
                        <tr key={o} className={strict ? "bg-amber-50/60" : undefined}>
                          <td className="whitespace-nowrap px-3 py-2 text-foreground">
                            {ORDER_NAMES[o] ?? o}
                            {strict && <span className="ml-2 text-xs text-amber-800">unfixed code always failed</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-foreground/80">{cell(test.baselineByOrder[o])}</td>
                          {patches.map((p) => (
                            <td key={p.id} className="px-3 py-2 font-mono text-xs text-foreground/80">
                              {cell(p.blade1.byOrder[o])}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {patch && (
            <section>
              <h3 className="text-sm font-semibold text-foreground">
                #{patch.number}: {patch.title}
              </h3>
              {patch.rationale && <p className="mt-1 text-sm text-foreground/60">{patch.rationale}</p>}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-sm font-medium text-foreground">Reruns</p>
                  <p className="mt-1 break-words text-sm text-foreground/70">{blade1Summary(patch)}</p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-sm font-medium text-foreground">Band-aid scan</p>
                  <p className="mt-1 text-sm text-foreground/70">{scanSummary(patch)}</p>
                  {patch.blade2.line && (
                    <p className="mt-2 break-all rounded bg-red-50 px-2 py-1 font-mono text-xs text-red-800">
                      Line {patch.blade2.lineNo ?? "?"}: {patch.blade2.line.trim()}
                    </p>
                  )}
                </div>
              </div>
              {patch.compileError && (
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-xs text-red-800">{patch.compileError}</pre>
              )}
              {patch.diff && (
                <div className="mt-3">
                  <DiffBlock diff={patch.diff} highlight={patch.blade2.line} />
                </div>
              )}
              {patch.verdict === "VERIFIED" && (
                <p className="mt-3 text-sm">
                  {test.prUrl ? (
                    <a
                      href={test.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-navy underline-offset-2 hover:underline"
                    >
                      <GitPullRequest className="h-4 w-4" />
                      {test.prUrl.replace("https://github.com/", "")}
                    </a>
                  ) : (
                    <span className="text-foreground/60">Verified. No pull request was opened in this run.</span>
                  )}
                </p>
              )}
            </section>
          )}

          {test.agentsRan && (
            <section>
              <h3 className="text-sm font-semibold text-foreground">What the agents concluded</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                {test.rootCause || "The agents did not record a root cause in this run."}
              </p>
              {test.category && <p className="mt-1 text-xs text-foreground/50">Category: {test.category}</p>}
              {test.hypotheses.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-foreground/70">
                  {test.hypotheses.map((h, i) => (
                    <li key={i}>
                      <span className="font-medium text-foreground">{h.agent}</span> ({h.category},{" "}
                      {Math.round(h.confidence * 100)}%): {h.summary}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {test.refusalReason && (
            <details className="rounded-lg border border-border">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-foreground">Refusal statement</summary>
              <pre className="whitespace-pre-wrap border-t border-border px-4 py-3 text-xs text-foreground/70">{test.refusalReason}</pre>
            </details>
          )}

          <details className="rounded-lg border border-border">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-foreground">
              Event log ({events.length} events)
            </summary>
            <ol className="max-h-80 divide-y divide-border overflow-y-auto border-t border-border text-xs">
              {events.map((e) => (
                <li key={e.id} className="grid grid-cols-[4.5rem_7.5rem_1fr] gap-3 px-4 py-1.5">
                  <span className="font-mono text-foreground/50">{e.timestamp}</span>
                  <span className="truncate text-foreground/70">{e.agentName}</span>
                  <span className="break-words font-mono text-foreground/80">{e.message}</span>
                </li>
              ))}
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
};
