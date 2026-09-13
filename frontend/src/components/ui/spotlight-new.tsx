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

// Refined, high-end light mode spectrum:
// Eliminates muddy edge blobs and replaces them with an ethereal, architectural overhead lighting system.
// Gentle cyan-teal, soft electric blue, and warm amber highlights with delicate opacity.
const LIGHT_GRADIENTS = {
  first:
    "radial-gradient(68.54% 68.72% at 55.02% 31.46%, rgba(15, 118, 110, 0.18) 0%, rgba(14, 165, 233, 0.12) 45%, rgba(99, 102, 241, 0.04) 75%, transparent 100%)",
  second:
    "radial-gradient(50% 50% at 50% 50%, rgba(180, 83, 9, 0.14) 0%, rgba(245, 158, 11, 0.08) 55%, transparent 100%)",
  third:
    "radial-gradient(50% 50% at 50% 50%, rgba(15, 118, 110, 0.12) 0%, rgba(59, 130, 246, 0.06) 55%, transparent 100%)",
};

const DARK_GRADIENTS = {
  first:
    "radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .08) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)",
  second:
    "radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)",
  third:
    "radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 45%, .02) 80%, transparent 100%)",
};

export const Spotlight = ({
  variant = "light",
  gradientFirst,
  gradientSecond,
  gradientThird,
  translateY = -160,
  width = 580,
  height = 1350,
  smallWidth = 260,
  duration = 8,
  xOffset = 90,
}: SpotlightProps = {}) => {
  const activePresets = variant === "light" ? LIGHT_GRADIENTS : DARK_GRADIENTS;
  const g1 = gradientFirst || activePresets.first;
  const g2 = gradientSecond || activePresets.second;
  const g3 = gradientThird || activePresets.third;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden select-none"
    >
      {/* Central Architectural Ambient Glow (Subtle & Luxurious) */}
      {variant === "light" && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[550px] pointer-events-none">
          {/* Overhead soft radial illumination directly over hero center */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[780px] h-[450px] bg-gradient-to-b from-teal-500/10 via-sky-500/8 to-transparent blur-3xl rounded-full" />
          <div className="absolute -top-10 left-1/3 w-[450px] h-[300px] bg-teal-400/8 blur-3xl rounded-full" />
          <div className="absolute -top-10 right-1/3 w-[450px] h-[300px] bg-amber-400/8 blur-3xl rounded-full" />
        </div>
      )}

      {/* Left Spotlight Beam */}
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
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-80"
      >
        <div
          style={{
            transform: `translateY(${translateY}px) rotate(-45deg)`,
            background: g1,
            width: `${width}px`,
            height: `${height}px`,
            filter: "blur(30px)",
          }}
          className="absolute top-0 left-0"
        />

        <div
          style={{
            transform: "rotate(-45deg) translate(5%, -45%)",
            background: g2,
            width: `${smallWidth}px`,
            height: `${height}px`,
            filter: "blur(24px)",
          }}
          className="absolute top-0 left-0 origin-top-left"
        />

        <div
          style={{
            transform: "rotate(-45deg) translate(-140%, -60%)",
            background: g3,
            width: `${smallWidth}px`,
            height: `${height}px`,
            filter: "blur(24px)",
          }}
          className="absolute top-0 left-0 origin-top-left"
        />
      </motion.div>

      {/* Right Spotlight Beam */}
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
        className="absolute top-0 right-0 w-full h-full pointer-events-none z-0 opacity-80"
      >
        <div
          style={{
            transform: `translateY(${translateY}px) rotate(45deg)`,
            background: g1,
            width: `${width}px`,
            height: `${height}px`,
            filter: "blur(30px)",
          }}
          className="absolute top-0 right-0"
        />

        <div
          style={{
            transform: "rotate(45deg) translate(-5%, -45%)",
            background: g2,
            width: `${smallWidth}px`,
            height: `${height}px`,
            filter: "blur(24px)",
          }}
          className="absolute top-0 right-0 origin-top-right"
        />

        <div
          style={{
            transform: "rotate(45deg) translate(140%, -60%)",
            background: g3,
            width: `${smallWidth}px`,
            height: `${height}px`,
            filter: "blur(24px)",
          }}
          className="absolute top-0 right-0 origin-top-right"
        />
      </motion.div>
    </motion.div>
  );
};
export default Spotlight;
