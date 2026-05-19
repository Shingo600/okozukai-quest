import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kid: {
          bg: "#FFFBEE",
          pink: "#FFD9E0",
          green: "#A8E6CF",
          yellow: "#FFE38A",
          orange: "#FFB99A",
        },
        parent: {
          bg: "#F5F1FB",
          purple: "#B89CE6",
          purpleDeep: "#7C5BC7",
        },
      },
      fontFamily: {
        rounded: ['"Hiragino Maru Gothic ProN"', '"Quicksand"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 6px 18px -8px rgba(120,90,160,0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
