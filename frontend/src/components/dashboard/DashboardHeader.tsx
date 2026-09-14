import React from "react";
import { Link } from "react-router-dom";
import type { Tally } from "../../lib/types";

interface DashboardHeaderProps {
  tally: Tally | null;
  lastUpdated: Date | null;
  error: string | null;
  running: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ tally, lastUpdated, error, running }) => (
  <header className="border-b border-border/80 bg-surface/85 backdrop-blur-md sticky top-0 z-30 shadow-xs">
    <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <img src="/flakeproof-logo.svg" alt="" className="h-5 w-5" />
          Flakeproof
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-foreground/60 sm:flex">
          <Link to="/" className="hover:text-foreground">
            Overview
          </Link>
          <span className="font-medium text-foreground">Runs</span>
          <a
            href="https://github.com/sidharthnair7/FlakeProof"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-4 text-xs text-foreground/50">
        {tally && (
          <span className="hidden md:inline">
            {tally.attempts} runs, {tally.runs.toLocaleString()} JVM test runs, {tally.prs} pull{" "}
            {tally.prs === 1 ? "request" : "requests"}
          </span>
        )}
        {error ? (
          <span className="text-red-700">Can't reach the API</span>
        ) : running ? (
          <span className="flex items-center gap-1.5 text-status-teal">
            <span className="h-1.5 w-1.5 rounded-full bg-status-teal" />
            Run in progress
          </span>
        ) : lastUpdated ? (
          <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
        ) : null}
      </div>
    </div>
  </header>
);
