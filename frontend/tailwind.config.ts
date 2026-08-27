import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211f",
        signal: "#1f7a5c",
        warning: "#b7791f",
        surface: "#f7f8f5",
      },
    },
  },
  plugins: [],
} satisfies Config;
