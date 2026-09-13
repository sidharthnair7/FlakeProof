"use client";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Spotlight } from "@/components/ui/spotlight-new";
import { ArrowLeft, Sparkles, Moon, Sun } from "lucide-react";

export default function SpotlightNewDemo() {
  const [isLight, setIsLight] = useState<boolean>(true);

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 transition-colors duration-500 relative overflow-hidden ${
        isLight ? "bg-[#FAFAF9] text-[#111827]" : "bg-black/[0.96] text-white"
      }`}
    >
      {/* Dynamic Animated Spotlight with Light/Dark Spectrum */}
      <Spotlight
        key={isLight ? "light-mode" : "dark-mode"}
        variant={isLight ? "light" : "dark"}
        translateY={-70}
        duration={7}
      />

      {/* Subtle grid background */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-30 ${
          isLight ? "bg-grid-pattern" : "bg-grid-white/[0.04]"
        }`}
      />

      {/* Floating Top Controls */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
        <Link
          to="/"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isLight
              ? "bg-white border-border text-foreground hover:bg-stone-100"
              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Reliant
        </Link>

        <button
          onClick={() => setIsLight(!isLight)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isLight
              ? "bg-white border-border text-foreground hover:bg-stone-100 shadow-xs"
              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
          }`}
        >
          {isLight ? (
            <>
              <Moon className="w-3.5 h-3.5 text-navy" />
              <span>Switch to Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch to Light Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-w-4xl mx-auto relative z-10 w-full text-center space-y-6 pt-12">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono transition-colors ${
            isLight
              ? "bg-white border-border shadow-xs text-status-teal font-semibold"
              : "bg-white/10 border-white/20 text-teal-300"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isLight ? "Vibrant Light-Mode Spectrum" : "Original Dark-Mode Glow"}</span>
        </div>

        <h1
          className={`text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] ${
            isLight
              ? "bg-clip-text text-transparent bg-gradient-to-b from-navy-950 via-navy-800 to-navy-600"
              : "bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400"
          }`}
        >
          Spotlight tuned <br /> for high visibility.
        </h1>

        <p
          className={`mt-4 font-normal text-base sm:text-lg max-w-xl mx-auto leading-relaxed ${
            isLight ? "text-foreground/75" : "text-neutral-300"
          }`}
        >
          {isLight
            ? "A rich multi-chromatic spotlight combining electric cyan-teal, amber sunset, and royal indigo to illuminate light themes with depth and motion."
            : "A subtle yet effective spotlight effect with gentle illumination across dark canvases."}
        </p>
      </div>
    </div>
  );
}
