import { defineConfig } from "vite";

// A relative base makes built asset URLs (e.g. ./assets/index.js) resolve
// against the page's own location. This works unchanged for a GitHub Pages
// project site (/<repo>/), a user/org site (/), a custom domain, and local
// `vite preview` — avoiding the "blank page / 404 assets" base-path trap.
// Override with BASE_PATH only if you specifically need an absolute base.
export default defineConfig({
  base: process.env.BASE_PATH ?? "./",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
