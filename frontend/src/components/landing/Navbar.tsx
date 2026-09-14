import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  // React Router updates the URL hash without the browser's native anchor jump.
  // Resolve it after the landing route has rendered so these links also work from
  // /dashboard and on a direct URL such as /#two-blade-gate.
  useEffect(() => {
    if (location.pathname !== "/") return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

    if (!location.hash) {
      window.scrollTo({ top: 0, behavior });
      return;
    }

    const targetId = decodeURIComponent(location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior, block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname]);

  // Global keyboard shortcut: Cmd+D / Ctrl+D opens Agent Console Dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (location.pathname === "/dashboard") {
          navigate("/");
        } else {
          navigate("/dashboard");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [location.pathname, navigate]);

  return (
    <nav className="fixed top-4 left-0 right-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Animated React Bits PillNav with FlakeProof Branding */}
        <PillNav
          logo="/flakeproof-logo.svg"
          logoAlt="FlakeProof"
          items={NAV_ITEMS}
          activeHref={`${location.pathname}${location.hash}`}
          baseColor="#0B132B"
          pillColor="transparent"
          hoveredPillTextColor="#FFFFFF"
          pillTextColor="#1E293B"
          ease="power3.easeOut"
          initialLoadAnimation={true}
        />

        {/* Live action pill */}
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
