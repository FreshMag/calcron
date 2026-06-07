import { defineConfig } from "vite";

// `base` is set for GitHub Pages "project" sites served at
// https://<user>.github.io/time-calculator/. Override with the BASE_PATH env
// var (e.g. "/" for a custom domain or user/org page).
export default defineConfig({
  base: process.env.BASE_PATH ?? "/time-calculator/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
