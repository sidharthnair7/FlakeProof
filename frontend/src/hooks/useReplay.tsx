import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AIAgent, AgentLog, FlakyTestCase, GateMetric, Tally } from "../lib/types";
import { focusAttempt, toAgents, toLogs, toMetrics, toTestCase, FALLBACK_REPLAY_DATA } from "../lib/replay";
import type { ReplayData } from "../lib/replay";

const POLL_MS = 5000;

export interface ReplayState {
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  lastUpdated: Date | null;
  tally: Tally | null;
  testCases: FlakyTestCase[];
  agents: AIAgent[];
  agentsAttemptId: number | null;
  logs: AgentLog[];
  metrics: GateMetric[];
  refresh: () => void;
}

const ReplayContext = createContext<ReplayState | null>(null);

/** Polls GET /api/replay (recorded runs from data/runs.db) and shares it with every page. */
export const ReplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<ReplayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const lastBody = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/replay", { cache: "no-store" });
      if (!res.ok) throw new Error(`/api/replay answered ${res.status}`);
      const body = await res.text();
      if (body !== lastBody.current) {
        lastBody.current = body; // unchanged data keeps the same objects, so open views stay put
        setData(JSON.parse(body) as ReplayData);
      }
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      // Gracefully fall back to recorded replay demo data so product is 100% functional
      setData((current) => current ?? FALLBACK_REPLAY_DATA);
      setError(err instanceof Error ? err.message : String(err));
      setLastUpdated((current) => current ?? new Date());
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const activeData = data ?? (error ? FALLBACK_REPLAY_DATA : null);

  const derived = useMemo(() => {
    const attempts = activeData?.attempts ?? [];
    const focus = focusAttempt(attempts);
    return {
      tally: activeData?.tally ?? null,
      testCases: attempts.map(toTestCase),
      agents: toAgents(focus),
      agentsAttemptId: focus?.id ?? null,
      logs: toLogs(attempts),
      metrics: activeData ? toMetrics(activeData.tally) : [],
    };
  }, [activeData]);

  const isDemoMode = activeData === FALLBACK_REPLAY_DATA || (error !== null && data === null);

  const value = useMemo<ReplayState>(
    () => ({
      ...derived,
      loading: activeData === null && error === null,
      error,
      isDemoMode,
      lastUpdated,
      refresh: () => void load(),
    }),
    [derived, activeData, error, isDemoMode, lastUpdated, load],
  );

  return <ReplayContext.Provider value={value}>{children}</ReplayContext.Provider>;
};

export function useReplay(): ReplayState {
  const ctx = useContext(ReplayContext);
  if (!ctx) throw new Error("useReplay must be used inside <ReplayProvider>");
  return ctx;
}
