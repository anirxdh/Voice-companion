import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./agents/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        veil: {
          cyan: "#67e8f9",
          ember: "#fb7185",
          gold: "#fde68a",
          ink: "#05060a",
          mist: "#c4b5fd",
          plasma: "#38bdf8"
        }
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"]
      },
      boxShadow: {
        "veil-glow": "0 0 40px rgba(103,232,249,.24), 0 0 140px rgba(251,113,133,.12)"
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)", opacity: ".1" },
          "50%": { opacity: ".35" },
          "100%": { transform: "translateY(100%)", opacity: ".1" }
        }
      },
      animation: {
        scan: "scan 7s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
