// Resolve a property/argument identifier (e.g. `seconds`, `s`, `min`, `M`) to a
// canonical duration unit. Single-letter aliases are case-sensitive so that `m`
// (minute) and `M` (month) stay distinct; word aliases are case-insensitive.

import { DurationUnit } from "./types";

const ALIASES: Record<string, DurationUnit> = {
  us: "us",
  micros: "us",
  microsecond: "us",
  microseconds: "us",

  ms: "ms",
  millis: "ms",
  millisecond: "ms",
  milliseconds: "ms",

  s: "s",
  sec: "s",
  secs: "s",
  second: "s",
  seconds: "s",

  m: "m",
  min: "m",
  mins: "m",
  minute: "m",
  minutes: "m",

  h: "h",
  hr: "h",
  hrs: "h",
  hour: "h",
  hours: "h",

  d: "d",
  day: "d",
  days: "d",

  w: "w",
  week: "w",
  weeks: "w",

  M: "M",
  month: "M",
  months: "M",

  y: "y",
  yr: "y",
  yrs: "y",
  year: "y",
  years: "y",
};

export function resolveUnit(name: string): DurationUnit | null {
  if (Object.prototype.hasOwnProperty.call(ALIASES, name)) return ALIASES[name];
  const lower = name.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ALIASES, lower)) return ALIASES[lower];
  return null;
}
