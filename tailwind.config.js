/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#01135B",
        surface: "#102E76",
        "surface-2": "#1A3C8C",
        brand: "#ECE441",
        accent: "#E28154",
      },
      fontFamily: {
        cond: ['"Barlow Condensed"', "Arial Narrow", "sans-serif"],
        sans: ["Barlow", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
