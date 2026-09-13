/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF9",
        foreground: "#111827",
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F5F5F4",
          muted: "#E7E5E4",
          hover: "#F8F8F7",
        },
        border: {
          DEFAULT: "#E5E7EB",
          subtle: "#F1F2F4",
          strong: "#D1D5DB",
        },
        navy: {
          DEFAULT: "#0B132B",
          50: "#F0F4F8",
          100: "#D9E2EC",
          200: "#BCCCDC",
          300: "#9FB3C8",
          400: "#627D98",
          500: "#3A506B",
          600: "#1C2541",
          700: "#141C33",
          800: "#0B132B",
          900: "#070C1E",
        },
        status: {
          amber: {
            DEFAULT: "#B45309",
            light: "#FEF3C7",
            subtle: "#FFFBEB",
            border: "#FCD34D",
            text: "#92400E",
          },
          teal: {
            DEFAULT: "#0F766E",
            light: "#CCFBF1",
            subtle: "#F0FDFA",
            border: "#5EEAD4",
            text: "#115E59",
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        "card-hover": "0 10px 25px -5px rgba(11, 19, 43, 0.08), 0 8px 10px -6px rgba(11, 19, 43, 0.04)",
        glow: "0 0 20px -2px rgba(11, 19, 43, 0.15)",
        "glow-amber": "0 0 20px -2px rgba(180, 83, 9, 0.2)",
        "glow-teal": "0 0 20px -2px rgba(15, 118, 110, 0.2)",
      },
      animation: {
        "pulse-subtle": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
