import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const GithubIcon = () => (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface-subtle border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4 text-status-teal-border" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">FlakeProof</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  AWS Agents for Humans Hackathon
                </span>
              </div>
              <p className="text-xs text-foreground/60 mt-0.5">
                Built with Strands Agents on Amazon Nova 2 Lite (Amazon Bedrock). A deterministic two-blade gate decides.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-foreground/70 font-medium">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#demo" className="hover:text-foreground transition-colors">
              marine-api Case Study
            </a>
            <a
              href="https://github.com/sidharthnair7/FlakeProof"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <GithubIcon />
              FlakeProof
            </a>
            <a
              href="https://github.com/ktuukkan/marine-api"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <GithubIcon />
              marine-api
            </a>
          </div>

          <div className="text-xs text-foreground/50 font-mono">
            &copy; {new Date().getFullYear()} FlakeProof • The gate decides; agents only propose.
          </div>
        </div>
      </div>
    </footer>
  );
};
