import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface TextRevealProps {
  text: string;
  className?: string;
  highlightWords?: string[];
  highlightClass?: string;
  delay?: number;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  className = "",
  highlightWords = [],
  highlightClass = "text-navy font-bold",
  delay = 0.1,
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const words = containerRef.current?.querySelectorAll(".reveal-word");
      if (words && words.length > 0) {
        gsap.fromTo(
          words,
          {
            y: 28,
            opacity: 0,
            filter: "blur(4px)",
          },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.7,
            stagger: 0.035,
            ease: "power3.out",
            delay,
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [text, delay]);

  const words = text.split(" ");

  return (
    <h1
      ref={containerRef}
      className={`inline-block overflow-hidden ${className}`}
    >
      {words.map((word, index) => {
        // Strip punctuation for matching
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
        const isHighlighted = highlightWords.some(
          (hw) => hw.toLowerCase() === cleanWord.toLowerCase()
        );

        return (
          <span
            key={index}
            className="inline-block overflow-hidden mr-[0.25em] align-top py-1"
          >
            <span
              className={`reveal-word inline-block will-change-transform ${
                isHighlighted ? highlightClass : ""
              }`}
            >
              {word}
            </span>
          </span>
        );
      })}
    </h1>
  );
};
