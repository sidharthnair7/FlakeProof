import React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "amber" | "teal" | "navy" | "neutral";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = "neutral",
  size = "sm",
  dot = true,
  ...props
}) => {
  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 rounded-full gap-1.5 font-medium",
    md: "text-xs px-2.5 py-1 rounded-full gap-1.5 font-medium",
  };

  const variantStyles = {
    amber: "bg-status-amber-light text-status-amber border border-status-amber-border/60",
    teal: "bg-status-teal-light text-status-teal border border-status-teal-border/60",
    navy: "bg-navy-50 text-navy border border-navy-200",
    neutral: "bg-surface-subtle text-foreground/80 border border-border",
  };

  const dotColor = {
    amber: "bg-status-amber",
    teal: "bg-status-teal",
    navy: "bg-navy",
    neutral: "bg-foreground/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center tracking-tight transition-colors",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor[variant])} />
      )}
      <span>{children}</span>
    </span>
  );
};
