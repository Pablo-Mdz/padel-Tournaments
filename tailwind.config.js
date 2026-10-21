/** @type {import('tailwindcss').Config} */
// Colours come from CSS variables (see index.css) so the app follows light/dark
// mode and the TV screen can force its own dark theme.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        card: v("card"),
        fill: v("fill"),
        ink: v("ink"),
        ink2: v("ink2"),
        line: v("line"),
        tint: v("tint"),
        "on-tint": v("on-tint"),
        thumb: v("thumb"),
        good: v("good"),
        bad: v("bad"),
        warn: v("warn"),
        // Club colours, fixed in every theme.
        navy: "#01135B",
        "navy-2": "#102E76",
        yellow: "#ECE441",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        rounded: [
          "ui-rounded",
          '"SF Pro Rounded"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        "4xl": "28px",
      },
    },
  },
  plugins: [],
};
