// Duration construction, arithmetic, and component breakdown.

import {
  Duration,
  DurationUnit,
  FIXED_US,
  TypeError_,
} from "./types";

export function makeDuration(months: number, fixedUs: number): Duration {
  return { kind: "duration", months, fixedUs };
}

export const ZERO_DURATION = makeDuration(0, 0);

/** Build a Duration from a map of unit → count (years fold to months, weeks to days). */
export function durationFromUnits(units: Partial<Record<DurationUnit, number>>): Duration {
  let months = 0;
  let fixedUs = 0;
  for (const [unit, count] of Object.entries(units) as [DurationUnit, number][]) {
    if (count === undefined) continue;
    if (unit === "y") months += count * 12;
    else if (unit === "M") months += count;
    else fixedUs += count * FIXED_US[unit];
  }
  return makeDuration(months, Math.round(fixedUs));
}

export function addDurations(a: Duration, b: Duration): Duration {
  return makeDuration(a.months + b.months, a.fixedUs + b.fixedUs);
}

export function subDurations(a: Duration, b: Duration): Duration {
  return makeDuration(a.months - b.months, a.fixedUs - b.fixedUs);
}

export function scaleDuration(d: Duration, k: number): Duration {
  return makeDuration(d.months * k, d.fixedUs * k);
}

export function divideDuration(d: Duration, k: number): Duration {
  if (k === 0) throw new TypeError_("Division by zero");
  // Months are divided directly; any non-integer result is preserved (e.g. 1M / 2).
  // The fixed cascade divides cleanly down to whole microseconds.
  return makeDuration(d.months / k, Math.round(d.fixedUs / k));
}

export interface DurationParts {
  negative: boolean; // true if the whole duration is negative-leaning
  y: number;
  M: number;
  d: number;
  h: number;
  m: number;
  s: number;
  ms: number;
  us: number;
}

/**
 * Break a Duration into display components. The calendar group (y, M) and the
 * fixed group (d, h, m, s, ms, us) are expanded independently and may carry
 * opposite signs (a deliberately rare case the spec never produces).
 */
export function durationParts(d: Duration): DurationParts {
  const calY = Math.trunc(d.months / 12);
  const calM = d.months - calY * 12;

  let rem = Math.abs(d.fixedUs);
  const fixedNeg = d.fixedUs < 0;
  const us = rem % 1000;
  rem = Math.floor(rem / 1000);
  const ms = rem % 1000;
  rem = Math.floor(rem / 1000);
  const s = rem % 60;
  rem = Math.floor(rem / 60);
  const m = rem % 60;
  rem = Math.floor(rem / 60);
  const h = rem % 24;
  rem = Math.floor(rem / 24);
  const day = rem; // weeks fold into days

  const sign = (v: number) => (fixedNeg ? -v : v);

  return {
    negative: d.months < 0 || d.fixedUs < 0,
    y: calY,
    M: calM,
    d: sign(day),
    h: sign(h),
    m: sign(m),
    s: sign(s),
    ms: sign(ms),
    us: sign(us),
  };
}

export function isZeroDuration(d: Duration): boolean {
  return d.months === 0 && d.fixedUs === 0;
}
