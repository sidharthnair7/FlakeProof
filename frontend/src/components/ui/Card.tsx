import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "subtle" | "interactive";
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = "default",
  ...props
}) => {
  const variantStyles = {
    default: "bg-surface border border-border shadow-card",
    glass: "glass-panel shadow-card",
    subtle: "bg-surface-subtle border border-border/80",
    interactive:
      "bg-surface border border-border shadow-card hover:shadow-card-hover hover:border-navy-300 transition-all duration-200 cursor-pointer",
  };

  return (
    <div
      className={cn("rounded-xl p-5 relative overflow-hidden", variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};
