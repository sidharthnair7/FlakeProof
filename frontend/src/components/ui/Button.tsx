import React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "amber" | "teal";
  size?: "sm" | "md" | "lg";
  shortcut?: string;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = "primary",
  size = "md",
  shortcut,
  icon,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 rounded-md gap-1.5",
    md: "text-sm px-4 py-2 rounded-lg gap-2",
    lg: "text-base px-5 py-2.5 rounded-lg gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-navy text-white hover:bg-navy-600 focus-visible:ring-navy shadow-sm hover:shadow-md border border-navy-700/50",
    secondary:
      "bg-white text-foreground hover:bg-surface-subtle border border-border focus-visible:ring-navy shadow-card",
    outline:
      "bg-transparent text-foreground hover:bg-surface-subtle border border-border focus-visible:ring-navy",
    ghost:
      "bg-transparent text-foreground/80 hover:text-foreground hover:bg-surface-subtle focus-visible:ring-navy",
    amber:
      "bg-status-amber text-white hover:bg-status-amber/90 focus-visible:ring-status-amber shadow-sm border border-amber-800/40",
    teal:
      "bg-status-teal text-white hover:bg-status-teal/90 focus-visible:ring-status-teal shadow-sm border border-teal-800/40",
  };

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {shortcut && (
        <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-black/10 text-current border border-white/20">
          {shortcut}
        </kbd>
      )}
    </button>
  );
};
