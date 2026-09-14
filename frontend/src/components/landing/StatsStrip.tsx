import React from "react";
import { useReplay } from "../../hooks/useReplay";

export const StatsStrip: React.FC = () => {
  const { tally } = useReplay();
  if (!tally) return null;

  const stats = [
    { value: tally.runs.toLocaleString(), label: "JVM test runs recorded" },
    { value: String(tally.attempts), label: "pipeline runs" },
    { value: `${tally.verified} / ${tally.refused}`, label: "gate verdicts, verified / refused" },
    { value: String(tally.prs), label: tally.prs === 1 ? "pull request opened" : "pull requests opened" },
  ];

  return (
    <section className="border-b border-border/80 bg-surface">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="text-sm text-foreground/60">{s.label}</dt>
            <dd className="text-2xl font-semibold tracking-tight text-foreground">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
