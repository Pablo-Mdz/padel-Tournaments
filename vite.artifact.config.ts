import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single-file build for hosting as a claude.ai artifact: everything inlined,
// hash-free in-app routing, and the "share with viewers" mode switched on.
// Run `npm run build:artifact`, then publish dist-artifact/padel-team-challenge.html.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  define: {
    "import.meta.env.VITE_HASH_ROUTER": JSON.stringify("1"),
    "import.meta.env.VITE_ARTIFACT": JSON.stringify("1"),
  },
  build: { outDir: "dist-artifact", emptyOutDir: true, assetsInlineLimit: 100_000_000 },
});
