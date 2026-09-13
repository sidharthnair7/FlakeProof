import React from "react";
import { Badge } from "./Badge";
import { GitCommit, Bug, ShieldCheck } from "lucide-react";

interface MarqueeItem {
  id: string;
  suite: string;
  type: "order-dependent" | "async-race";
  victim: string;
  polluter: string;
  statusText: string;
}

const SAMPLE_ITEMS: MarqueeItem[] = [
  {
    id: "m-1",
    suite: "tests/billing/tax_calculation.spec.ts",
    type: "order-dependent",
    victim: "it('calculates tax exemption')",
    polluter: "customer_org.spec.ts",
    statusText: "Polluter Pinpointed",
  },
  {
    id: "m-2",
    suite: "tests/auth/jwt_expiration.test.ts",
    type: "order-dependent",
    victim: "it('returns 401 when token expired')",
    polluter: "trial_activation.test.ts",
    statusText: "Clock Leak Isolated",
  },
  {
    id: "m-3",
    suite: "tests/workers/webhook_drain.spec.ts",
    type: "async-race",
    victim: "it('gracefully drains pending queue')",
    polluter: "analytics_batch.spec.ts",
    statusText: "Event Loop Restored",
  },
  {
    id: "m-4",
    suite: "tests/billing/invoice_idempotency.spec.ts",
    type: "order-dependent",
    victim: "it('guarantees single invoice creation')",
    polluter: "subscription_renewal.spec.ts",
    statusText: "PR #408 Verified",
  },
  {
    id: "m-5",
    suite: "tests/rbac/role_sync.test.ts",
    type: "order-dependent",
    victim: "it('invalidates permission cache')",
    polluter: "super_admin_setup.test.ts",
    statusText: "Singleton Cleared",
  },
];

export const InteractiveMarquee: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`w-full overflow-hidden relative select-none py-3 ${className}`}>
      {/* Left & Right fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Infinite scrolling row */}
      <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
        {[...SAMPLE_ITEMS, ...SAMPLE_ITEMS].map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-surface border border-border shadow-sm text-xs transition-all hover:border-navy-300 hover:shadow"
          >
            <span className="p-1 rounded bg-surface-subtle text-foreground/70">
              {item.type === "order-dependent" ? (
                <Bug className="w-3.5 h-3.5 text-status-amber" />
              ) : (
                <GitCommit className="w-3.5 h-3.5 text-status-teal" />
              )}
            </span>
            <span className="font-mono text-foreground font-medium truncate max-w-[210px]">
              {item.suite}
            </span>
            <Badge
              variant={item.type === "order-dependent" ? "amber" : "teal"}
              size="sm"
            >
              {item.type === "order-dependent" ? "Order-Dependent" : "Async"}
            </Badge>
            <span className="text-muted-foreground text-[11px] flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3 h-3 text-status-teal" />
              {item.statusText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
