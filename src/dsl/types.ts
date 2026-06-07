// Core data model for the Calcron DSL.
//
// Two value families exist:
//   - Time:     a point in time with a *window* of specified fields. Fields below
//               the window are zero-filled; fields above it are "free" (wildcards).
//   - Duration: an elapsed amount of time, stored as two independent signed scalars
//               so that the variable-length month/year boundary is never crossed.
// A bare integer literal is a Num (scalar), used only to scale Durations.

/** Time position fields, ordered high → low hierarchy. `w` (week) is NOT here — it is a duration unit only. */
export const TIME_FIELDS = ["y", "M", "d", "h", "m", "s", "ms", "us"] as const;
export type TimeField = (typeof TIME_FIELDS)[number];

/** Index of a field within TIME_FIELDS (0 = year … 7 = microsecond). */
export function fieldIndex(f: TimeField): number {
  return TIME_FIELDS.indexOf(f);
}

/** The date-part fields (year..day) occupy indices 0..2; time-of-day fields 3..7. */
export const DATE_LO = 0; // y
export const DATE_HI = 2; // d
export const TIME_LO = 3; // h
export const TIME_HI = 7; // us

/**
 * A point in time. `top`/`bottom` are indices into TIME_FIELDS bounding the
 * specified window (inclusive). `values` holds every field in that window.
 * Fields with index < top are free; fields with index > bottom are 0.
 */
export interface Time {
  kind: "time";
  top: number;
  bottom: number;
  values: Partial<Record<TimeField, number>>;
}

/** All duration units, including week. */
export const DURATION_UNITS = ["us", "ms", "s", "m", "h", "d", "w", "M", "y"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

/**
 * An elapsed amount of time.
 *   - `months`  : signed integer count of calendar months (years folded in: 1y = 12M).
 *   - `fixedUs` : signed integer microseconds for the fixed-length cascade
 *                 (week → day → hour → minute → second → ms → us). Weeks fold to days.
 * The two scalars are kept apart because a month is not a fixed number of days.
 */
export interface Duration {
  kind: "duration";
  months: number;
  fixedUs: number;
}

/** A bare scalar literal (only meaningful as a multiplier/divisor of a Duration). */
export interface Num {
  kind: "num";
  value: number;
}

export type Value = Time | Duration | Num;

// --- Microsecond factors for the fixed-length cascade -----------------------

export const US = 1;
export const MS = 1000 * US;
export const SEC = 1000 * MS;
export const MIN = 60 * SEC;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

/** Microseconds per one unit of each fixed-cascade duration unit. */
export const FIXED_US: Record<Exclude<DurationUnit, "M" | "y">, number> = {
  us: US,
  ms: MS,
  s: SEC,
  m: MIN,
  h: HOUR,
  d: DAY,
  w: WEEK,
};

// --- Errors -----------------------------------------------------------------

/** Base class for every user-facing DSL error. `pos`/`end` are character offsets in the source line. */
export class CalcronError extends Error {
  constructor(
    message: string,
    public pos?: number,
    public end?: number,
  ) {
    super(message);
    this.name = "CalcronError";
  }
}

export class ParseError extends CalcronError {
  constructor(message: string, pos?: number, end?: number) {
    super(message, pos, end);
    this.name = "ParseError";
  }
}

export class IncompatibleHierarchyError extends CalcronError {
  constructor(message: string, pos?: number, end?: number) {
    super(message, pos, end);
    this.name = "IncompatibleHierarchyError";
  }
}

export class TypeError_ extends CalcronError {
  constructor(message: string, pos?: number, end?: number) {
    super(message, pos, end);
    this.name = "TypeError";
  }
}
