import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#FAF9F6",
          dark: "#FFFEF9",
        },
        burgundy: {
          DEFAULT: "#800000",
          light: "#A52A2A",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

