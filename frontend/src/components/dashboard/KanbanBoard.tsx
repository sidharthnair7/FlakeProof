import React from "react";
import type { FlakyTestCase, PipelineStage } from "../../lib/types";
import { KanbanCard } from "./KanbanCard";
import { Search, Bot, Layers, ShieldCheck } from "lucide-react";

interface ColumnDef {
  id: PipelineStage;
  title: string;
  badgeVariant: "amber" | "teal" | "neutral";
  icon: React.ReactNode;
  subtitle: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: "intake",
    title: "Intake Baseline",
    badgeVariant: "amber",
    icon: <Search className="w-4 h-4 text-status-amber" />,
    subtitle: "Reruns to measure baseline",
  },
  {
    id: "diagnosis",
    title: "Swarm Diagnosis",
    badgeVariant: "teal",
    icon: <Bot className="w-4 h-4 text-status-teal" />,
    subtitle: "4 Bedrock Nova 2 Lite agents",
  },
  {
    id: "gate",
    title: "Two-Blade Gate",
    badgeVariant: "neutral",
    icon: <Layers className="w-4 h-4 text-navy" />,
    subtitle: "200 runs + AST scan (No AI)",
  },
  {
    id: "verdict",
    title: "Verdicts & PR",
    badgeVariant: "teal",
    icon: <ShieldCheck className="w-4 h-4 text-status-teal" />,
    subtitle: "Verified fixes open PR",
  },
];

interface KanbanBoardProps {
  testCases: FlakyTestCase[];
  onSelectTest: (test: FlakyTestCase) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  testCases,
  onSelectTest,
}) => {
  return (
    <div className="flex-1 overflow-x-auto p-4 lg:p-6 bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-w-[900px] h-full">
        {COLUMNS.map((column) => {
          const columnTests = testCases.filter((t) => t.stage === column.id);

          return (
            <div
              key={column.id}
              className="flex flex-col rounded-2xl bg-surface-subtle/70 border border-border p-3.5 h-full"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-surface border border-border/80">
                    {column.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {column.title}
                      </h3>
                      <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-surface border border-border text-foreground/70 font-semibold">
                        {columnTests.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-foreground/50">
                      {column.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards Container with Motion layout animations */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {columnTests.length > 0 ? (
                  columnTests.map((test) => (
                    <KanbanCard
                      key={test.id}
                      test={test}
                      onSelect={onSelectTest}
                    />
                  ))
                ) : (
                  <div className="h-40 rounded-xl border-2 border-dashed border-border/80 flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-xs font-mono text-foreground/40">
                      No tests in this stage
                    </span>
                    <span className="text-[10px] text-foreground/30 mt-1">
                      Tests advance across gate blades automatically
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
