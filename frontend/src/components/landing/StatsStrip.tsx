import React from "react";
import { StatCard } from "../ui/StatCard";
import { ShieldCheck, Zap, GitPullRequest, Activity } from "lucide-react";
import { motion } from "motion/react";

export const StatsStrip: React.FC = () => {
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
            title="Recorded Gate Evidence"
            value="200 Runs"
            subtitle="Blade 1: every controlled rerun must pass"
            change="Zero test flakes tolerated"
            changeType="positive"
            icon={<ShieldCheck className="w-4 h-4 text-status-teal" />}
            progressPercent={100}
          />
          <StatCard
            title="Band-Aid Policy"
            value="Hard Refusal"
            subtitle="Blade 2: Refuses sleep, retry, @Ignore & pinned order"
            change="Deterministic diff enforcement"
            changeType="positive"
            icon={<Zap className="w-4 h-4 text-status-amber" />}
            progressPercent={100}
          />
          <StatCard
            title="Diagnosis Swarm"
            value="4 Agents"
            subtitle="Triage, Order, Async, Resource on Bedrock Nova 2 Lite"
            change="Strands specialist routing"
            changeType="positive"
            icon={<Activity className="w-4 h-4 text-status-teal" />}
            progressPercent={100}
          />
          <StatCard
            title="SQLite Audit Log"
            value="Recorded Evidence"
            subtitle="Every run, candidate patch & diff scan persisted"
            change="GitHub PR with evidence"
            changeType="positive"
            icon={<GitPullRequest className="w-4 h-4 text-navy" />}
            progressPercent={100}
          />
        </motion.div>
      </div>
    </section>
  );
};
