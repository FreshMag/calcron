// Render a Value to a display string, in either a compact machine-style form
// (15:37, 31m40s, 07/10) or natural language localized to a BCP-47 locale
// (3:37 PM, "31 minutes and 40 seconds", "July 10"). Natural formatting leans on
// the platform Intl APIs for correct pluralization, joining, and month names.

import { DurationParts, durationParts } from "./duration";
import { resolveTimeFields } from "./time";
import { Duration, TIME_FIELDS, Time, TimeField, Value, fieldIndex } from "./types";

export type OutputFormat = "natural" | "compact";

export interface FormatOptions {
  format: OutputFormat;
  locale: string;
}

const DEFAULT_OPTS: FormatOptions = { format: "compact", locale: "en" };

export function formatValue(v: Value, opts: FormatOptions = DEFAULT_OPTS): string {
  const natural = opts.format === "natural";
  switch (v.kind) {
    case "num":
      return natural ? naturalNumber(v.value, opts.locale) : compactNumber(v.value);
    case "time":
      return natural ? naturalTime(v, opts.locale) : compactTime(v);
    case "duration":
      return natural ? naturalDuration(v, opts.locale) : compactDuration(v);
  }
}

// --- Numbers ----------------------------------------------------------------

function compactNumber(value: number): string {
  return String(value);
}

function naturalNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }).format(value);
}

// --- Compact (machine) format -----------------------------------------------

function pad(n: number, width: number): string {
  const neg = n < 0;
  const s = Math.abs(n).toString().padStart(width, "0");
  return neg ? "-" + s : s;
}

function compactTime(v: Time): string {
  const datePieces: string[] = [];
  const timePieces: string[] = [];

  for (let i = v.top; i <= v.bottom; i++) {
    const f = TIME_FIELDS[i];
    const val = v.values[f] ?? 0;
    switch (f) {
      case "y":
        datePieces.push(pad(val, 4));
        break;
      case "M":
      case "d":
        datePieces.push(pad(val, 2));
        break;
      case "h":
      case "m":
      case "s":
        timePieces.push(pad(val, 2));
        break;
      case "ms":
        timePieces.push(pad(val, 3));
        break;
      case "us":
        timePieces.push(pad(val, 6));
        break;
    }
  }

  const date = datePieces.join("/");
  const time = timePieces.join(":");
  return [date, time].filter(Boolean).join(" ");
}

function compactDuration(v: Duration): string {
  const p = durationParts(v);
  const out = compactOrder(p)
    .filter(([n]) => n !== 0)
    .map(([n, unit]) => `${n}${unit}`)
    .join("");
  return out === "" ? "0s" : out;
}

function compactOrder(p: DurationParts): [number, string][] {
  return [
    [p.y, "y"],
    [p.M, "M"],
    [p.d, "d"],
    [p.h, "h"],
    [p.m, "m"],
    [p.s, "s"],
    [p.ms, "ms"],
    [p.us, "us"],
  ];
}

// --- Natural language format ------------------------------------------------

// TIME_FIELDS keys → Intl.NumberFormat sanctioned units. Note: microsecond is
// NOT a sanctioned Intl unit, so it is handled separately with the µs symbol.
const INTL_UNIT: Partial<Record<TimeField, string>> = {
  y: "year",
  M: "month",
  d: "day",
  h: "hour",
  m: "minute",
  s: "second",
  ms: "millisecond",
};

function unitText(value: number, field: TimeField, locale: string): string {
  const unit = INTL_UNIT[field];
  if (unit) {
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "long",
    }).format(value);
  }
  // microseconds: no sanctioned Intl unit → use the universal symbol.
  return `${new Intl.NumberFormat(locale).format(value)} µs`;
}

function naturalDuration(v: Duration, locale: string): string {
  const p = durationParts(v);
  const negative = v.months < 0 || (v.months === 0 && v.fixedUs < 0);
  const order: [number, TimeField][] = [
    [p.y, "y"],
    [p.M, "M"],
    [p.d, "d"],
    [p.h, "h"],
    [p.m, "m"],
    [p.s, "s"],
    [p.ms, "ms"],
    [p.us, "us"],
  ];

  const items = order
    .filter(([n]) => n !== 0)
    .map(([n, field]) => unitText(Math.abs(n), field, locale));

  if (items.length === 0) return unitText(0, "s", locale);

  const joined = new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  }).format(items);

  return negative ? `-${joined}` : joined;
}

function has(t: Time, field: TimeField): boolean {
  const idx = fieldIndex(field);
  return idx >= t.top && idx <= t.bottom;
}

function naturalTime(t: Time, locale: string): string {
  const f = resolveTimeFields(t);
  const opt: Intl.DateTimeFormatOptions = { timeZone: "UTC" };

  if (has(t, "y")) opt.year = "numeric";
  if (has(t, "M")) opt.month = "long";
  if (has(t, "d")) opt.day = "numeric";
  if (has(t, "h")) opt.hour = "2-digit";
  if (has(t, "m")) opt.minute = "2-digit";
  if (has(t, "s")) opt.second = "2-digit";
  if (has(t, "ms")) opt.fractionalSecondDigits = 3;

  const date = new Date(Date.UTC(f.y, f.M - 1, f.d, f.h, f.m, f.s, f.ms));
  let str = new Intl.DateTimeFormat(locale, opt).format(date);

  if (has(t, "us") && f.us) {
    str += ` ${new Intl.NumberFormat(locale).format(f.us)} µs`;
  }
  return str;
}
