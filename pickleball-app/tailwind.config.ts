import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gg: {
          bg:         "#0b0f1a",
          card:       "#111827",
          "card-2":   "#1a2235",
          border:     "#1f2937",
          "border-2": "#374151",
          green:      "#22c55e",
          "green-2":  "#16a34a",
          "green-dim":"#14532d",
          muted:      "#6b7280",
          error:      "#ef4444",
          "error-dim":"#450a0a",
          yellow:     "#eab308",
          orange:     "#f97316",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
