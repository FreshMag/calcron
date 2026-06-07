// Time construction, canonicalization, and arithmetic.
//
// A Time keeps a contiguous window of specified fields. Arithmetic anchors the
// "free" (above-window) fields to fixed defaults so they cancel out (for Time−Time)
// or are discarded (for Time±Duration, where overflow into a free field stays free).

import {
  Duration,
  IncompatibleHierarchyError,
  TIME_FIELDS,
  Time,
  TimeField,
  fieldIndex,
} from "./types";
import { makeDuration } from "./duration";

/** Default value for a field when it is free (above the window) or zero-filled (below). */
function anchorValue(idx: number): number {
  const f = TIME_FIELDS[idx];
  if (f === "y") return 2000; // arbitrary anchor for a free year
  if (f === "M") return 1; // months/days start at 1
  if (f === "d") return 1;
  return 0;
}

/** Build a Time from explicit field values; the window spans min..max provided index. */
export function makeTime(values: Partial<Record<TimeField, number>>): Time {
  const provided = (Object.keys(values) as TimeField[]).map(fieldIndex);
  if (provided.length === 0) {
    throw new Error("Time requires at least one field");
  }
  const top = Math.min(...provided);
  const bottom = Math.max(...provided);
  const full: Partial<Record<TimeField, number>> = {};
  for (let i = top; i <= bottom; i++) {
    const f = TIME_FIELDS[i];
    full[f] = values[f] ?? anchorValue(i);
  }
  return { kind: "time", top, bottom, values: full };
}

type Broken = Record<TimeField, number>;

/** Fully resolve a Time to all 8 concrete fields (anchoring free/zero-filled). Public for formatting. */
export function resolveTimeFields(t: Time): Record<TimeField, number> {
  return canonicalize(t);
}

/** Fully resolve a Time to all 8 fields, anchoring free and zero-filled fields. */
function canonicalize(t: Time): Broken {
  const out = {} as Broken;
  for (let i = 0; i < TIME_FIELDS.length; i++) {
    const f = TIME_FIELDS[i];
    if (i < t.top || i > t.bottom) out[f] = anchorValue(i);
    else out[f] = t.values[f] ?? anchorValue(i);
  }
  return out;
}

/** Absolute microseconds (UTC) for a fully-resolved time. */
function brokenToUs(b: Broken): number {
  const ms = Date.UTC(b.y, b.M - 1, b.d, b.h, b.m, b.s, b.ms);
  return ms * 1000 + b.us;
}

/** Deepest TIME_FIELDS index a duration can affect (for extending the result window). */
function deepestDurationField(d: Duration): number | null {
  const us = Math.abs(d.fixedUs);
  if (us !== 0) {
    if (us % 1000 !== 0) return fieldIndex("us");
    if (us % 1_000_000 !== 0) return fieldIndex("ms");
    if (us % 60_000_000 !== 0) return fieldIndex("s");
    if (us % 3_600_000_000 !== 0) return fieldIndex("m");
    if (us % 86_400_000_000 !== 0) return fieldIndex("h");
    return fieldIndex("d");
  }
  if (d.months !== 0) {
    return d.months % 12 !== 0 ? fieldIndex("M") : fieldIndex("y");
  }
  return null;
}

/** Time ± Duration → Time (calendar-aware; overflow into free fields stays free). */
export function addDurationToTime(t: Time, d: Duration, sign: 1 | -1): Time {
  const months = d.months * sign;
  const fixedUs = d.fixedUs * sign;
  const b = canonicalize(t);

  // Calendar (months/years) first, then the fixed cascade.
  const base = new Date(Date.UTC(b.y, b.M - 1, b.d, b.h, b.m, b.s, b.ms));
  base.setUTCMonth(base.getUTCMonth() + months);

  const totalUs = b.us + fixedUs;
  const finalMs = base.getTime() + Math.floor(totalUs / 1000);
  const finalUs = ((totalUs % 1000) + 1000) % 1000;
  const f = new Date(finalMs);

  const resolved: Broken = {
    y: f.getUTCFullYear(),
    M: f.getUTCMonth() + 1,
    d: f.getUTCDate(),
    h: f.getUTCHours(),
    m: f.getUTCMinutes(),
    s: f.getUTCSeconds(),
    ms: f.getUTCMilliseconds(),
    us: finalUs,
  };

  // Window keeps its top (free stays free); bottom may deepen to the duration's finest unit.
  const deepest = deepestDurationField(d);
  const bottom = deepest === null ? t.bottom : Math.max(t.bottom, deepest);

  const values: Partial<Record<TimeField, number>> = {};
  for (let i = t.top; i <= bottom; i++) {
    const field = TIME_FIELDS[i];
    values[field] = resolved[field];
  }
  return { kind: "time", top: t.top, bottom, values };
}

/**
 * Time − Time → Duration. Requires equal `top` (same free/hierarchy window).
 * If the window reaches the day field or finer, the difference is fixed-length
 * (absolute calendar difference); otherwise it is expressed in whole months.
 */
export function diffTimes(end: Time, start: Time): Duration {
  if (end.top !== start.top) {
    throw new IncompatibleHierarchyError(
      `Cannot range between times of different hierarchy (${windowLabel(start)} vs ${windowLabel(end)})`,
    );
  }
  const commonBottom = Math.max(end.bottom, start.bottom);
  const dayIdx = fieldIndex("d");

  if (commonBottom >= dayIdx) {
    // Day or finer present → fixed-length difference via the calendar.
    const fixedUs = brokenToUs(canonicalize(end)) - brokenToUs(canonicalize(start));
    return makeDuration(0, fixedUs);
  }

  // Only year/month present → whole-month difference.
  const be = canonicalize(end);
  const bs = canonicalize(start);
  const months = (be.y * 12 + (be.M - 1)) - (bs.y * 12 + (bs.M - 1));
  return makeDuration(months, 0);
}

function windowLabel(t: Time): string {
  return `${TIME_FIELDS[t.top]}..${TIME_FIELDS[t.bottom]}`;
}

/** Truncate a Time at the given field: drop (zero) every field finer than it. */
export function truncTime(t: Time, field: TimeField): Time {
  const idx = fieldIndex(field);
  // Clamp into the window: finer than bottom = no-op; coarser than top = keep top only.
  const newBottom = Math.min(t.bottom, Math.max(t.top, idx));
  const values: Partial<Record<TimeField, number>> = {};
  for (let i = t.top; i <= newBottom; i++) {
    const f = TIME_FIELDS[i];
    values[f] = t.values[f] ?? 0;
  }
  return { kind: "time", top: t.top, bottom: newBottom, values };
}
