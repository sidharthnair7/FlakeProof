import React from "react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => (
  <footer className="border-t border-border bg-surface-subtle">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-foreground/60 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
      <p>
        <span className="font-semibold text-foreground">Flakeproof</span>. Built with Strands Agents on Amazon Nova 2 Lite
        (Amazon Bedrock) for the AWS Agents for Humans hackathon.
      </p>
      <nav className="flex flex-wrap gap-5">
        <Link to="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <a href="https://github.com/sidharthnair7/FlakeProof" target="_blank" rel="noreferrer" className="hover:text-foreground">
          Source on GitHub
        </a>
        <a href="https://github.com/ktuukkan/marine-api" target="_blank" rel="noreferrer" className="hover:text-foreground">
          marine-api
        </a>
      </nav>
    </div>
  </footer>
);
