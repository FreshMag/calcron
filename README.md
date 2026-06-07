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
```

If any operand is a Time the result is a Time, except Time − Time (and `..`), which
yields a Duration. A range between Times of different hierarchy (e.g.
`(2000-06-03)..(15:07)`) raises an `IncompatibleHierarchyError`.

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to
`main`. In the repo settings, set **Pages → Build and deployment → Source** to
**GitHub Actions**. The Vite `base` defaults to `/time-calculator/`; override it with
the `BASE_PATH` env var for a custom domain or user/org page.

## Notes & assumptions

- Weeks are accepted on input (1w = 7 days) and shown in days.
- Time − Time over a window of only year/month yields whole months; if the window
  reaches the day field or finer, the result is a fixed-length (calendar) difference.
- Sub-second precision is tracked to microseconds; very large durations are limited by
  double-precision microseconds (~285 years).
