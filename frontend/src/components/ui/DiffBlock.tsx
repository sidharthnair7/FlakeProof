import React from "react";

interface DiffBlockProps {
  diff: string;
  highlight?: string;
}

export const DiffBlock: React.FC<DiffBlockProps> = ({ diff, highlight }) => {
  const target = highlight?.trim();
  const lines = diff.replace(/\r/g, "").replace(/\n$/, "").split("\n");

  return (
    <div className="p-3.5 rounded-xl bg-slate-900 text-white font-mono text-xs overflow-x-auto">
      <pre className="leading-relaxed">
        {lines.map((line, idx) => {
          const isHeader =
            line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++");
          const isAdd = !isHeader && line.startsWith("+");
          const isRemove = !isHeader && line.startsWith("-");
          const isHit = Boolean(target) && isAdd && line.slice(1).trim() === target;
          const className = isHit
            ? "text-red-50 bg-red-700/80 px-1 rounded font-semibold"
            : isAdd
              ? "text-teal-300 bg-teal-950/40 px-1 rounded"
              : isRemove
                ? "text-red-300 bg-red-950/40 px-1 rounded"
                : isHeader
                  ? "text-slate-500"
                  : "text-slate-300";
          return (
            <div key={idx} className={className}>
              {line || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
};
