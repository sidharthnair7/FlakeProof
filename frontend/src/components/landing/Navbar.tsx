import React from "react";
import { Link } from "react-router-dom";

const LINKS = [
  { label: "Recorded run", href: "/#marine-api-demo" },
  { label: "Case study", href: "/#demo" },
  { label: "How it works", href: "/#how-it-works" },
];

export const Navbar: React.FC = () => (
  <header className="sticky top-0 z-40 border-b border-border/80 bg-[#FAFAF9]">
    <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
      <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <img src="/flakeproof-logo.svg" alt="" className="h-6 w-6" />
        Flakeproof
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-foreground/70 md:flex">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-foreground">
            {link.label}
          </a>
        ))}
        <a
          href="https://github.com/sidharthnair7/FlakeProof"
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          GitHub
        </a>
      </nav>
      <Link to="/dashboard" className="rounded-md bg-navy px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-600">
        Open the dashboard
      </Link>
    </div>
  </header>
);

export default Navbar;
