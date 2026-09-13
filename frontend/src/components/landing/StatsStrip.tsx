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
            title="Two-Blade Determinism"
            value="200 Runs"
            subtitle="Blade 1: 100% pass required across random orders"
            change="Zero test flakes tolerated"
            changeType="positive"
            icon={<ShieldCheck className="w-4 h-4 text-status-teal" />}
            progressPercent={100}
          />
          <StatCard
            title="Band-Aid Refusal Rate"
            value="100%"
            subtitle="Blade 2: Refuses sleep, retry, @Ignore & pinned order"
            change="AST proof enforcement"
            changeType="positive"
            icon={<Zap className="w-4 h-4 text-status-amber" />}
            progressPercent={100}
          />
          <StatCard
            title="Diagnosis Swarm"
            value="4 Agents"
            subtitle="Triage, Order, Async, Resource on Bedrock Nova 2 Lite"
            change="Strands Agent handoffs"
            changeType="positive"
            icon={<Activity className="w-4 h-4 text-status-teal" />}
            progressPercent={100}
          />
          <StatCard
            title="SQLite Audit Log"
            value="100% Proven"
            subtitle="Every run, candidate patch & AST scan persisted"
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
