import React from "react";
import { cn } from "../../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  changeType?: "positive" | "neutral" | "negative";
  icon?: React.ReactNode;
  progressPercent?: number;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = "positive",
  icon,
  progressPercent,
  className = "",
}) => {
  return (
    <div
      className={cn(
        "rounded-xl p-4 bg-surface border border-border shadow-card hover:shadow-card-hover transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground/60 tracking-tight uppercase">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {value}
            </span>
          </div>
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-surface-subtle border border-border/80 text-foreground/70">
            {icon}
          </div>
        )}
      </div>

      {(change || subtitle || progressPercent !== undefined) && (
        <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-1.5">
          {change && (
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded text-[11px]",
                  changeType === "positive"
                    ? "bg-status-teal-light text-status-teal font-medium"
                    : changeType === "negative"
                    ? "bg-status-amber-light text-status-amber font-medium"
                    : "bg-surface-subtle text-foreground/70"
                )}
              >
                {changeType === "positive" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : changeType === "negative" ? (
                  <TrendingDown className="w-3 h-3" />
                ) : null}
                {change}
              </span>
              {subtitle && (
                <span className="text-foreground/50 text-[11px] truncate">
                  {subtitle}
                </span>
              )}
            </div>
          )}

          {progressPercent !== undefined && (
            <div className="w-full bg-surface-subtle rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className="bg-navy h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
