import React from "react";
import { StatCard } from "../ui/StatCard";
import { ShieldCheck, Zap, Bot, Activity } from "lucide-react";
import { motion } from "motion/react";
import { useReplay } from "../../hooks/useReplay";

export const StatsStrip: React.FC = () => {
  const { tally } = useReplay();

  return (
    <section className="py-12 bg-surface-subtle/50 border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            title="JVM Runs Recorded"
            value={tally ? String(tally.runs) : "n/a"}
            change="Blade 1 evidence"
            changeType="neutral"
            subtitle="every rerun is stored in SQLite"
            icon={<Activity className="w-4 h-4 text-status-teal" />}
          />
          <StatCard
            title="Candidates Judged"
            value={tally ? String(tally.attempted) : "n/a"}
            change={tally ? `${tally.verified} verified, ${tally.refused} refused` : "waiting for the API"}
            changeType="neutral"
            subtitle="agent-written and planted"
            icon={<ShieldCheck className="w-4 h-4 text-navy" />}
          />
          <StatCard
            title="Diagnosis Swarm"
            value="4 agents"
            change="Strands Swarm"
            changeType="neutral"
            subtitle="triage, order, async, resource"
            icon={<Bot className="w-4 h-4 text-status-teal" />}
          />
          <StatCard
            title="Band-Aid Families"
            value="8"
            change="Blade 2 scanner"
            changeType="neutral"
            subtitle="sleep, retry, @Ignore, timeout and more"
            icon={<Zap className="w-4 h-4 text-status-amber" />}
          />
        </motion.div>
      </div>
    </section>
  );
};
