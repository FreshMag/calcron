import { defineConfig } from "vite";
import Sitemap from "vite-plugin-sitemap";

// The full public URL of the deployed site. Sitemap/robots entries must be
// absolute, so this is spelled out here (override via SITE_URL for a custom
// domain or a different repo/path). Defaults to the GitHub Pages project site.
// We fold the path into `hostname` (rather than the plugin's `basePath`) so the
// robots.txt `Sitemap:` line — which is built from hostname alone — stays correct.
const SITE_URL = process.env.SITE_URL ?? "https://freshmag.github.io/calcron/";
// The plugin uses `hostname` verbatim for the robots.txt `Sitemap:` line, but only
// its origin for sitemap <loc> entries — so we pass the full URL as `hostname` AND
// its path as `basePath` to keep both outputs correct.
const SITE_HOSTNAME = SITE_URL.replace(/\/+$/, ""); // no trailing slash
const SITE_BASE = new URL(SITE_URL).pathname.replace(/\/+$/, ""); // e.g. "/calcron"

// A relative base makes built asset URLs (e.g. ./assets/index.js) resolve
// against the page's own location. This works unchanged for a GitHub Pages
// project site (/<repo>/), a user/org site (/), a custom domain, and local
// `vite preview` — avoiding the "blank page / 404 assets" base-path trap.
// Override with BASE_PATH only if you specifically need an absolute base.
export default defineConfig({
  base: process.env.BASE_PATH ?? "./",
  plugins: [
    // Emits dist/sitemap.xml and dist/robots.txt during build.
    Sitemap({
      hostname: SITE_HOSTNAME,
      basePath: SITE_BASE,
      readable: true,
      changefreq: "weekly",
      robots: [{ userAgent: "*", allow: "/" }],
    }),
    // The sitemap plugin injects <link rel="sitemap" href="/sitemap.xml">; make it
    // relative so it resolves under the deploy subpath (matches our relative base).
    {
      name: "calcron:relative-sitemap-link",
      transformIndexHtml: {
        order: "post",
        handler: (html: string) =>
          html.replace('href="/sitemap.xml"', 'href="./sitemap.xml"'),
      },
    },
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
