import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Service worker: after the first visit the whole app (JS, CSS, fonts)
    // is cached so it keeps working without internet.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff,woff2,svg,png}"],
        navigateFallback: "index.html",
      },
      manifest: {
        name: "Padel Team Challenge – 4PADEL Berlin",
        short_name: "Team Challenge",
        display: "standalone",
        orientation: "landscape",
        background_color: "#01135B",
        theme_color: "#01135B",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
