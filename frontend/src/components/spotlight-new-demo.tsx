"use client";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Prism } from "@/components/ui/Prism";
import { ArrowLeft, Sparkles, Sliders, RefreshCw, Layers, Sun, Moon } from "lucide-react";

export default function SpotlightNewDemo() {
  const [animationType, setAnimationType] = useState<"rotate" | "hover" | "3drotate">("rotate");
  const [isLightMode, setIsLightMode] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(3.6);
  const [glow, setGlow] = useState<number>(1.2);
  const [timeScale, setTimeScale] = useState<number>(0.5);
  const [colorFrequency, setColorFrequency] = useState<number>(1.2);
  const [noise, setNoise] = useState<number>(0.35);

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden transition-colors duration-500 ${
        isLightMode ? "bg-[#FAFAF9] text-[#111827]" : "bg-black/[0.96] text-white"
      }`}
    >
      {/* Animated Raymarched Prism Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Prism
          key={`${animationType}-${isLightMode}`}
          animationType={animationType}
          timeScale={timeScale}
          height={3.5}
          baseWidth={5.5}
          scale={scale}
          hueShift={0}
          colorFrequency={colorFrequency}
          noise={noise}
          glow={glow}
          bloom={1.0}
          transparent={true}
          lightMode={isLightMode}
        />
        {/* Subtle grid pattern overlay */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            isLightMode ? "bg-grid-pattern opacity-25" : "bg-grid-white/[0.04] opacity-30"
          }`}
        />
        {/* Soft edge vignette */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            isLightMode
              ? "bg-gradient-to-b from-transparent via-transparent to-[#FAFAF9]/60"
              : "bg-gradient-to-b from-transparent via-transparent to-black/60"
          }`}
        />
      </div>

      {/* Floating Top Nav */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
        <Link
          to="/"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-colors backdrop-blur-md ${
            isLightMode
              ? "bg-white/90 border-border text-foreground hover:bg-stone-50 shadow-xs"
              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to FlakeProof
        </Link>

        <button
          onClick={() => setIsLightMode(!isLightMode)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-colors backdrop-blur-md cursor-pointer ${
            isLightMode
              ? "bg-white/90 border-border text-foreground hover:bg-stone-50 shadow-xs"
              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
          }`}
        >
          {isLightMode ? (
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

      {/* Main Showcase Area */}
      <div className="p-4 max-w-3xl mx-auto relative z-10 w-full text-center space-y-6 pt-12">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-semibold backdrop-blur-md ${
            isLightMode
              ? "bg-white/90 border-border text-status-teal shadow-xs"
              : "bg-white/10 border-white/20 text-teal-300"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>React Bits &bull; Raymarched Prism &bull; WebGL (OGL)</span>
        </div>

        <h1
          className={`text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] ${
            isLightMode
              ? "text-slate-900"
              : "bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400"
          }`}
        >
          Iridescent Prism <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">
            Raymarched Refraction
          </span>
        </h1>

        <p
          className={`mt-4 font-normal text-base sm:text-lg max-w-xl mx-auto leading-relaxed ${
            isLightMode ? "text-slate-700" : "text-neutral-300"
          }`}
        >
          A high-performance WebGL raymarched pyramid shader with volumetric color dispersion, internal sine wave frequencies, and film-grain illumination.
        </p>

        {/* Animation Mode Selector */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <span
            className={`text-xs font-mono flex items-center gap-1 mr-1 ${
              isLightMode ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Mode:
          </span>
          {(["rotate", "hover", "3drotate"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setAnimationType(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono uppercase transition-all border cursor-pointer ${
                animationType === mode
                  ? isLightMode
                    ? "bg-white border-navy text-slate-900 shadow-sm ring-1 ring-navy"
                    : "bg-white/30 border-white text-white shadow-sm"
                  : isLightMode
                  ? "bg-white/80 border-border text-slate-700 hover:bg-white"
                  : "bg-white/10 border-white/20 text-neutral-300 hover:bg-white/20"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Interactive Controls Card */}
        <div
          className={`max-w-md mx-auto p-4 rounded-2xl border shadow-md backdrop-blur-md text-left space-y-3 text-xs font-mono ${
            isLightMode
              ? "bg-white/90 border-border text-slate-700"
              : "bg-neutral-900/80 border-neutral-800 text-neutral-200"
          }`}
        >
          <div
            className={`flex items-center justify-between pb-2 border-b font-bold uppercase text-[10px] tracking-wider ${
              isLightMode
                ? "border-border text-slate-600"
                : "border-neutral-800 text-neutral-400"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-status-teal" /> Prism Shader Uniforms
            </span>
            <button
              onClick={() => {
                setScale(3.6);
                setGlow(1.2);
                setTimeScale(0.5);
                setColorFrequency(1.2);
                setNoise(0.35);
              }}
              className="text-slate-400 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Reset
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Scale</span>
                <span className="font-bold">{scale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="6.0"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Glow Intensity</span>
                <span className="font-bold">{glow.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={glow}
                onChange={(e) => setGlow(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Color Frequency</span>
                <span className="font-bold">{colorFrequency.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="3.0"
                step="0.1"
                value={colorFrequency}
                onChange={(e) => setColorFrequency(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-pink-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Animation Speed</span>
                <span className="font-bold">{timeScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.5"
                step="0.05"
                value={timeScale}
                onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
