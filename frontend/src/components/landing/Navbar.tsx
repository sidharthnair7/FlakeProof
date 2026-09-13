import React from "react";
import { Link, useLocation } from "react-router-dom";
import { PillNav, type PillNavItem } from "../ui/PillNav";
import { Terminal } from "lucide-react";

const NAV_ITEMS: PillNavItem[] = [
  { label: "Overview", href: "/" },
  { label: "marine-api Demo", href: "/#marine-api-demo" },
  { label: "Two-Blade Gate", href: "/#two-blade-gate" },
  { label: "Live Dashboard", href: "/dashboard" },
];

export const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed top-4 left-0 right-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Animated React Bits PillNav with FlakeProof Branding */}
        <PillNav
          logo="/reliant-logo.svg"
          logoAlt="FlakeProof AWS Hackathon Agent"
          items={NAV_ITEMS}
          activeHref={location.pathname}
          baseColor="#0B132B"
          pillColor="transparent"
          hoveredPillTextColor="#FFFFFF"
          pillTextColor="#1E293B"
          ease="power3.easeOut"
          initialLoadAnimation={true}
        />

        {/* AWS Hackathon Live Action Pill */}
        <div className="hidden lg:flex items-center gap-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-navy text-white text-xs font-semibold shadow-card hover:bg-navy-600 hover:shadow-glow transition-all active:scale-95 border border-navy-700/50 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-teal opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-teal" />
            </span>
            <Terminal className="w-3.5 h-3.5 text-teal-300 ml-0.5" />
            <span>Agent Console</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-slate-300 ml-0.5">
              ⌘D
            </kbd>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
