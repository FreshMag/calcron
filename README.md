# ⏱ Calcron

A tiny web app for calculating with **times** and **durations**, written in a small
DSL inside a dark-mode, IDE-style editor. Results are computed live, inline, next to
each line.

Built with TypeScript + Vite + CodeMirror 6, and deployed to GitHub Pages.

## Quick start

```bash
npm install
npm run dev      # local dev server
npm test         # run the DSL engine test suite (Vitest)
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## The Calcron language

Write one expression per line. `//` starts a comment.

### Times

A **Time** is a point in time with a *window* of specified fields. Fields below the
window default to their start value; fields above it are **free** (wildcards).

```
15:06              // 15h 06m  (seconds free-below = 0, date free-above)
15:06:50:687       // with seconds and milliseconds
15m:06             // specifier: 15 minutes, 6 seconds
8h:50m             // == 08:50
06/15              // June 15th  (also 06-15, 15d/6M, 6M/15, 06/15d)
2000/06/15 8:50    // full timestamp (quote it if used inside an expression)
'2000y/06/15 8h:50:47'
```

Field abbreviations: `us` µs · `ms` ms · `s` sec · `m` min · `h` hour · `d` day ·
`w` week · `M` month · `y` year. Note `m` (minute) vs `M` (month).

### Durations

A **Duration** is an elapsed amount — units are always explicit (no inference):

```
15y · 16m · 15m51s · "15h 51s" · '16y 15h 32s'
15:06..17:49       // range between two Times -> a Duration
```

### Operations

```
15:06 + 31m            = 15:37        time + duration -> time
06/20 + 20d            = 07/10
31m + 40s              = 31m40s       duration + duration -> duration
(00:15s..00:45s) / 2   = 15s          duration / scalar -> duration
0/1M..0/2M * 5         = 5M           duration * scalar -> duration
2 / 3                  = 0.6667       plain number math (scalars may be decimals)
```

If any operand is a Time the result is a Time, except Time − Time (and `..`), which
yields a Duration. A range between Times of different hierarchy (e.g.
`(2000-06-03)..(15:07)`) raises an `IncompatibleHierarchyError`.

Scalars can be integers or decimals (`1.5`, `0.5`) and you can do plain arithmetic
between numbers. Note `/` is a date separator when unspaced (`2/3` = Feb 3rd) but
division when spaced (`2 / 3` = 0.6667), per the usual literal rules.

### Settings

The gear icon (top-right) opens a settings popover, saved in the browser
(`localStorage`, no backend):

- **Output format** — *Natural language* (default, e.g. `2 hours and 43 minutes`,
  `July 10`) or *Compact* (`2h43m`, `07/10`).
- **Output language** — the locale used for natural output (month names, unit words,
  number formatting), powered by the platform `Intl` APIs.

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to
`main`. In the repo settings, set **Pages → Build and deployment → Source** to
**GitHub Actions**.

The Vite `base` is `./` (relative), so built asset URLs resolve at any path — a
project site (`/<repo>/`), a user/org site (`/`), or a custom domain — with no
configuration. Override with `BASE_PATH` only if you need an absolute base.

### SEO files

The build also emits `sitemap.xml` and `robots.txt` into `dist/` (via
[`vite-plugin-sitemap`](https://www.npmjs.com/package/vite-plugin-sitemap)), so they
deploy alongside the site. These need the site's **absolute** URL, which defaults to
`https://freshmag.github.io/calcron/`; set the `SITE_URL` env var when building for a
different repo, user/org page, or custom domain. Note that for a *project* Pages site,
crawlers only read `robots.txt` from the domain root (`https://<user>.github.io/robots.txt`,
owned by your `<user>.github.io` repo), so submit `sitemap.xml` directly via Google
Search Console.

## Releases

Releases are automated with [semantic-release](https://semantic-release.gitbook.io/).
On every push to `main`, `.github/workflows/release.yml` analyses the commit
messages and, when warranted, bumps the version, updates `CHANGELOG.md`, tags the
commit, and publishes a GitHub Release. Configuration lives in `.releaserc.json`.

Versioning is driven by [Conventional Commits](https://www.conventionalcommits.org/):

| Commit type             | Release       |
| ----------------------- | ------------- |
| `fix: …`                | patch (x.y.**z**) |
| `feat: …`               | minor (x.**y**.z) |
| `feat!: …` / `BREAKING CHANGE:` | major (**x**.y.z) |
| `chore:`, `docs:`, `refactor:`, … | no release |

Notes:

- The first release needs a releasable commit — a `chore:` commit alone won't
  trigger one. Land a `feat:` or `fix:` to cut `1.0.0`.
- The package is `"private": true` and never published to npm; `@semantic-release/npm`
  only keeps the version in `package.json` in sync (`npmPublish: false`).
- The workflow uses the built-in `GITHUB_TOKEN`. Ensure **Settings → Actions →
  General → Workflow permissions** allows read/write. If `main` has branch protection
  that blocks the bot from pushing the `chore(release): … [skip ci]` commit, allow the
  Actions bot to bypass it (or drop `@semantic-release/git` from `.releaserc.json` to
  release with tags + GitHub Releases only, without committing the changelog back).

## Notes & assumptions

- Weeks are accepted on input (1w = 7 days) and shown in days.
- Time − Time over a window of only year/month yields whole months; if the window
  reaches the day field or finer, the result is a fixed-length (calendar) difference.
- Sub-second precision is tracked to microseconds; very large durations are limited by
  double-precision microseconds (~285 years).
