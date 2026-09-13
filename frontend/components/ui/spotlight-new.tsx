"use client";
import { motion } from "motion/react";

export type SpotlightProps = {
  gradientFirst?: string;
  gradientSecond?: string;
  gradientThird?: string;
  translateY?: number;
  width?: number;
  height?: number;
  smallWidth?: number;
  duration?: number;
  xOffset?: number;
  variant?: "light" | "dark";
};

// High-Visibility Light-Mode Color Spectrum:
// Vibrant, saturated blends of Electric Teal (#0D9488), Sunset Amber (#F59E0B), Sky Cyan (#0EA5E9), and Royal Indigo (#6366F1).
// Elevated opacity (0.35 - 0.55) so the moving spotlight cones and ambient light are unmistakably visible on light (#FAFAF9) backgrounds.
const LIGHT_GRADIENTS = {
  first:
    "radial-gradient(68.54% 68.72% at 55.02% 31.46%, rgba(13, 148, 136, 0.55) 0%, rgba(14, 165, 233, 0.40) 42%, rgba(15, 23, 42, 0.12) 75%, transparent 100%)",
  second:
    "radial-gradient(50% 50% at 50% 50%, rgba(245, 158, 11, 0.50) 0%, rgba(217, 119, 6, 0.28) 55%, transparent 100%)",
  third:
    "radial-gradient(50% 50% at 50% 50%, rgba(99, 102, 241, 0.46) 0%, rgba(59, 130, 246, 0.26) 55%, transparent 100%)",
};

const DARK_GRADIENTS = {
  first:
    "radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .12) 0, hsla(210, 100%, 55%, .04) 50%, hsla(210, 100%, 45%, 0) 80%)",
  second:
    "radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .10) 0, hsla(210, 100%, 55%, .04) 80%, transparent 100%)",
  third:
    "radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .08) 0, hsla(210, 100%, 45%, .03) 80%, transparent 100%)",
};

export const Spotlight = ({
  variant = "light",
  gradientFirst,
  gradientSecond,
  gradientThird,
  translateY = -80, // Lowered so the beam cones actively illuminate the upper section
  width = 680,
  height = 1450,
  smallWidth = 300,
  duration = 7,
  xOffset = 130,
}: SpotlightProps = {}) => {
  const activePresets = variant === "light" ? LIGHT_GRADIENTS : DARK_GRADIENTS;
  const g1 = gradientFirst || activePresets.first;
  const g2 = gradientSecond || activePresets.second;
  const g3 = gradientThird || activePresets.third;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden select-none"
    >
      {/* Ambient Aurora Light Layer for Light Mode */}
      {variant === "light" && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none z-0">
          <div className="absolute -top-16 left-[10%] w-[600px] h-[400px] bg-gradient-to-br from-teal-400/40 via-cyan-400/30 to-transparent blur-3xl rounded-full" />
          <div className="absolute -top-10 right-[10%] w-[600px] h-[400px] bg-gradient-to-bl from-amber-400/40 via-indigo-400/30 to-transparent blur-3xl rounded-full" />
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-gradient-to-b from-sky-400/25 via-teal-300/20 to-transparent blur-3xl rounded-full" />
        </div>
      )}

      {/* Left Sweeping Spotlight Beam */}
      <motion.div
        animate={{
          x: [0, xOffset, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{
          mixBlendMode: variant === "light" ? "multiply" : "normal",
        }}
      >
        <div
          style={{
            transform: `translateY(${translateY}px) rotate(-45deg)`,
            background: g1,
            width: `${width}px`,
            height: `${height}px`,
            filter: "blur(24px)",
          }}
          className="absolute top-0 left-0"
        />

        <div
          style={{
            transform: "rotate(-45deg) translate(8%, -40%)",
            background: g2,
            width: `${smallWidth}px`,
            height: `${height}px`,
            filter: "blur(18px)",
          }}
          className="absolute top-0 left-0 origin-top-left"
        />

        <div
          style={{
            transform: "rotate(-45deg) translate(-150%, -60%)",
            background: g3,
            width: `${smallWidth}px`,
            height: `${height}px`,
            filter: "blur(20px)",
          }}
          className="absolute top-0 left-0 origin-top-left"
        />
      </motion.div>

      {/* Right Sweeping Spotlight Beam */}
      <motion.div
        animate={{
          x: [0, -xOffset, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        className="absolute top-0 right-0 w-full h-full pointer-events-none z-0"
        style={{
          mixBlendMode: variant === "light" ? "multiply" : "normal",
        }}
      >
        <div
          style={{
            transform: `translateY(${translateY}px) rotate(45deg)`,
            background: g1,
            width: `${width}px`,
            height: `${height}px`,
            filter: "blur(24px)",
          }}
          className="absolute top-0 right-0"
        />

        <div
          style={{
            transform: "rotate(45deg) translate(-8%, -40%)",
            background: g2,
            width: `${smallWidth}px`,
            height: `${height}px`,
            filter: "blur(18px)",
          }}
          className="absolute top-0 right-0 origin-top-right"
        />

        <div
          style={{
            transform: "rotate(45deg) translate(150%, -60%)",
            background: g3,
            width: `${smallWidth}px`,
            height: `${height}px`,
            filter: "blur(20px)",
          }}
          className="absolute top-0 right-0 origin-top-right"
        />
      </motion.div>
    </motion.div>
  );
};
export default Spotlight;
