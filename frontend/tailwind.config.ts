import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ===== Design Tokens (from prototype) ===== */
      colors: {
        brand: {
          DEFAULT: "#0b0b0d",
          2: "#1f2937",
          3: "#4b5563",
        },
        success: {
          DEFAULT: "#10b981",
          light: "#d1fae5",
        },
        warn: "#f59e0b",
        danger: "#ef4444",
        bg: {
          DEFAULT: "#ffffff",
          soft: "#f7f7f9",
          muted: "#f3f4f6",
        },
        panel: {
          DEFAULT: "#ffffff",
          2: "#fafafa",
        },
        line: {
          DEFAULT: "#e5e7eb",
          light: "#f3f4f6",
        },
        text: {
          DEFAULT: "#0b0b0d",
          muted: "#6b7280",
          light: "#9ca3af",
        },
      },
      borderRadius: {
        DEFAULT: "12px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        DEFAULT: "0 6px 16px rgba(0,0,0,.08)",
        sm: "0 2px 8px rgba(0,0,0,.06)",
        lg: "0 12px 32px rgba(0,0,0,.12)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      /* ===== Responsive Breakpoints ===== */
      screens: {
        mobile: "640px",
        tablet: "768px",
        laptop: "1024px",
        desktop: "1280px",
        wide: "1536px",
      },
    },
  },
  plugins: [],
  // Prevent Tailwind from resetting MUI styles
  corePlugins: {
    preflight: false,
  },
};

export default config;
