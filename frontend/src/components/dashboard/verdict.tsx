import React from "react";
import type { GateVerdict } from "../../lib/types";

type Verdict = GateVerdict | "PENDING";

const TEXT: Record<Verdict, string> = {
  VERIFIED: "Verified",
  REFUSED_BANDAID: "Refused: band-aid",
  REFUSED_UNPROVEN: "Refused: not proven",
  PENDING: "Pending",
};

const STYLE: Record<Verdict, string> = {
  VERIFIED: "bg-teal-50 text-teal-800 ring-teal-600/20",
  REFUSED_BANDAID: "bg-red-50 text-red-800 ring-red-600/20",
  REFUSED_UNPROVEN: "bg-amber-50 text-amber-800 ring-amber-600/20",
  PENDING: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export const VerdictTag: React.FC<{ verdict: Verdict }> = ({ verdict }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLE[verdict]}`}
  >
    {TEXT[verdict]}
  </span>
);
