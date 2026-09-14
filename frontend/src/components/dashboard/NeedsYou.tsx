import React from "react";
import type { FlakyTestCase } from "../../lib/types";

interface NeedsYouProps {
  testCases: FlakyTestCase[];
  onOpen: (attemptId: number) => void;
}

/** The only thing that asks for a person: a pull request whose fix the gate proved. */
export const NeedsYou: React.FC<NeedsYouProps> = ({ testCases, onOpen }) => {
  const prs = testCases
    .filter((t) => t.prUrl && t.verdict === "VERIFIED")
    .sort((a, b) => b.attemptId - a.attemptId);
  const running = testCases.some((t) => t.status === "RUNNING");

  return (
    <section aria-labelledby="needs-you-heading">
      <h2 id="needs-you-heading" className="text-base font-semibold text-foreground">
        Needs you
      </h2>
      <p className="mt-1 text-sm text-foreground/60">
        Flakeproof works on its own. It asks for a decision only when the gate has proven a fix.
      </p>

      <div className="mt-4 space-y-3">
        {prs.length === 0 && (
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground/70">
            Nothing needs you. {running ? "A run is in progress." : `${testCases.length} runs finished.`}
          </div>
        )}

        {prs.map((t) => {
          const fix = t.candidatePatches.find((p) => p.verdict === "VERIFIED");
          if (!fix || !t.prUrl) return null;
          const refused = t.candidatePatches.filter(
            (p) => p.verdict === "REFUSED_BANDAID" || p.verdict === "REFUSED_UNPROVEN",
          ).length;
          const leakRuns = fix.blade1.strictRuns
            ? `, including ${fix.blade1.strictPasses} of ${fix.blade1.strictRuns} with the polluting test first`
            : "";

          return (
            <div
              key={t.id}
              className="flex flex-col gap-3 rounded-lg border border-teal-600/30 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Review pull request #{t.prUrl.split("/").pop()}: {fix.title}
                </p>
                <p className="mt-1 text-sm text-foreground/60">
                  It passed all {fix.blade1.runs} reruns{leakRuns}.
                  {refused > 0 && ` The gate refused ${refused} other ${refused === 1 ? "patch" : "patches"} in run #${t.attemptId}.`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(t.attemptId)}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface-subtle"
                >
                  See the evidence
                </button>
                <a
                  href={t.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-600"
                >
                  Open on GitHub
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
