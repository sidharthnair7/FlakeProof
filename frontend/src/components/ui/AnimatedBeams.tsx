import React from "react";
import { motion } from "motion/react";

export const AnimatedBeams: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* Haikei-inspired geometric SVG grid */}
      <svg
        className="absolute inset-0 w-full h-full stroke-slate-200/50 [mask-image:radial-gradient(100%_100%_at_top_center,white,transparent)]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="hero-grid-pattern"
            width="48"
            height="48"
            x="50%"
            y="-1"
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 48V.5H48" fill="none" />
          </pattern>
          {/* Gradients for animated beams */}
          <linearGradient id="beam-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0B132B" stopOpacity="0" />
            <stop offset="50%" stopColor="#0B132B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0F766E" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam-gradient-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B45309" stopOpacity="0" />
            <stop offset="50%" stopColor="#B45309" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0B132B" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" strokeWidth="0" fill="url(#hero-grid-pattern)" />

        {/* Animated Horizontal Beam */}
        <motion.rect
          x="-30%"
          y="144"
          width="40%"
          height="1.5"
          fill="url(#beam-gradient-1)"
          initial={{ x: "-40%" }}
          animate={{ x: "120%" }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 1.5,
          }}
        />

        {/* Second Horizontal Beam with delayed offset */}
        <motion.rect
          x="-30%"
          y="288"
          width="35%"
          height="1.5"
          fill="url(#beam-gradient-1)"
          initial={{ x: "-35%" }}
          animate={{ x: "120%" }}
          transition={{
            duration: 8.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
            repeatDelay: 2,
          }}
        />

        {/* Animated Vertical Beam */}
        <motion.rect
          x="50%"
          y="-30%"
          width="1.5"
          height="40%"
          fill="url(#beam-gradient-2)"
          initial={{ y: "-40%" }}
          animate={{ y: "120%" }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2,
            repeatDelay: 2,
          }}
        />
      </svg>

      {/* Subtle intersecting glow nodes */}
      <motion.div
        className="absolute top-[144px] left-[50%] w-2 h-2 -ml-1 -mt-1 rounded-full bg-status-teal/40 blur-[2px]"
        animate={{
          scale: [1, 2, 1],
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-[288px] left-[35%] w-2.5 h-2.5 -ml-1.5 -mt-1.5 rounded-full bg-status-amber/40 blur-[2px]"
        animate={{
          scale: [1, 2.2, 1],
          opacity: [0.2, 0.7, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
      />

      {/* Ambient radial soft light */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-navy-100/40 via-surface-subtle/30 to-transparent blur-3xl rounded-full" />
    </div>
  );
};
