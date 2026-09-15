import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        veil: {
          bg: "#05080c",
          subtle: "#070c12",
          surface: "#0c141d",
          elevated: "#111c29",
          card: "#152333",
          border: "#17293a",
          borderStrong: "#223b54",
          textPrimary: "#edf4f7",
          textSecondary: "#8fa8b7",
          textMuted: "#567082",
        },
        cyber: {
          cyan: "#38bdf8",
          teal: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
          purple: "#a855f7",
          indigo: "#6366f1",
        },
        ink: "#edf4f7",
        signal: "#10b981",
        warning: "#f59e0b",
        surface: "#0c141d",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "0 4px 20px -2px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.03)",
        glowCyan: "0 0 20px -4px rgba(56, 189, 248, 0.35)",
        glowRed: "0 0 20px -4px rgba(239, 68, 68, 0.35)",
        glowAmber: "0 0 20px -4px rgba(245, 158, 11, 0.35)",
        glowEmerald: "0 0 20px -4px rgba(16, 185, 129, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
