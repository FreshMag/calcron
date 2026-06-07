// Parse a single literal (the text of an atom, juxtaposed atoms, or a quoted
// string) into a Time, Duration, or Num value, applying the inference rules.

import {
  DATE_HI,
  DATE_LO,
  DurationUnit,
  Num,
  ParseError,
  TIME_FIELDS,
  TIME_HI,
  TIME_LO,
  TimeField,
  Value,
  fieldIndex,
} from "./types";
import { durationFromUnits } from "./duration";
import { makeTime } from "./time";

const DURATION_RE = /^(?:\s*\d+\s*(?:us|ms|s|m|h|d|w|M|y)\s*)+$/;
const DURATION_PART_RE = /(\d+)\s*(us|ms|s|m|h|d|w|M|y)/g;
const NUMBER_RE = /^\d+(?:\.\d+)?$/; // integer or decimal scalar
const TERM_RE = /^(\d+)([a-zA-Z]+)?$/;

/** Specifier suffix → TIME_FIELDS field (week is rejected — not a Time position). */
const SPECIFIER: Record<string, TimeField> = {
  y: "y",
  M: "M",
  d: "d",
  h: "h",
  m: "m",
  s: "s",
  ms: "ms",
  us: "us",
};

export function parseLiteral(raw: string, pos: number, end: number): Value {
  const text = raw.trim();
  if (text === "") throw new ParseError("Empty literal", pos, end);

  if (NUMBER_RE.test(text)) {
    return { kind: "num", value: Number(text) } as Num;
  }

  if (DURATION_RE.test(text)) {
    const units: Partial<Record<DurationUnit, number>> = {};
    let mt: RegExpExecArray | null;
    DURATION_PART_RE.lastIndex = 0;
    while ((mt = DURATION_PART_RE.exec(text))) {
      const unit = mt[2] as DurationUnit;
      units[unit] = (units[unit] ?? 0) + Number(mt[1]);
    }
    return durationFromUnits(units);
  }

  return parseTimeLiteral(text, pos, end);
}

interface Term {
  value: number;
  specIdx?: number; // index into TIME_FIELDS if a specifier was given
}

function parseTerm(tok: string, pos: number, end: number): Term {
  const m = TERM_RE.exec(tok);
  if (!m) throw new ParseError(`Invalid term '${tok}'`, pos, end);
  const value = Number(m[1]);
  const spec = m[2];
  if (spec === undefined) return { value };
  const field = SPECIFIER[spec];
  if (field === undefined) {
    throw new ParseError(`Unknown unit '${spec}' in '${tok}'`, pos, end);
  }
  return { value, specIdx: fieldIndex(field) };
}

/**
 * Assign field indices to a run of terms within a hierarchy group.
 *  - lo/hi bound the allowed indices (date = 0..2, time = 3..7).
 *  - When no specifier is present, dates anchor their lowest term at `hi` (…/d)
 *    while times anchor their highest term at `lo` (h:…).
 *  - When specifiers exist, unspecified terms infer from the nearest anchor
 *    (right = lower hierarchy, left = higher).
 */
function assignFields(
  terms: Term[],
  lo: number,
  hi: number,
  mode: "endAtHi" | "startAtLo",
  pos: number,
  end: number,
): Map<number, number> {
  const n = terms.length;
  const indices: number[] = new Array(n);
  const hasSpec = terms.some((t) => t.specIdx !== undefined);

  if (!hasSpec) {
    const start = mode === "endAtHi" ? hi - (n - 1) : lo;
    for (let p = 0; p < n; p++) indices[p] = start + p;
  } else {
    for (let p = 0; p < n; p++) {
      if (terms[p].specIdx !== undefined) {
        indices[p] = terms[p].specIdx!;
        continue;
      }
      // Nearest specified anchor: prefer the closest on the left, else the right.
      let anchorPos = -1;
      for (let q = p - 1; q >= 0; q--) {
        if (terms[q].specIdx !== undefined) {
          anchorPos = q;
          break;
        }
      }
      if (anchorPos === -1) {
        for (let q = p + 1; q < n; q++) {
          if (terms[q].specIdx !== undefined) {
            anchorPos = q;
            break;
          }
        }
      }
      indices[p] = terms[anchorPos].specIdx! + (p - anchorPos);
    }
  }

  const out = new Map<number, number>();
  for (let p = 0; p < n; p++) {
    const idx = indices[p];
    if (idx < lo || idx > hi) {
      throw new ParseError(
        `Cannot infer hierarchy for term ${p + 1} ('${terms[p].value}') — out of range`,
        pos,
        end,
      );
    }
    if (out.has(idx)) {
      throw new ParseError(
        `Two terms map to the same field (${TIME_FIELDS[idx]})`,
        pos,
        end,
      );
    }
    out.set(idx, terms[p].value);
  }
  return out;
}

function parseTimeLiteral(text: string, pos: number, end: number): Value {
  const parts = text.split(/\s+/).filter(Boolean);
  const values: Partial<Record<TimeField, number>> = {};
  let termCount = 0;

  for (const part of parts) {
    if (part.includes(":")) {
      const terms = part.split(":").map((t) => parseTerm(t, pos, end));
      const assigned = assignFields(terms, TIME_LO, TIME_HI, "startAtLo", pos, end);
      for (const [idx, v] of assigned) values[TIME_FIELDS[idx]] = v;
      termCount += terms.length;
    } else if (/[/-]/.test(part)) {
      const terms = part.split(/[/-]/).map((t) => parseTerm(t, pos, end));
      const assigned = assignFields(terms, DATE_LO, DATE_HI, "endAtHi", pos, end);
      for (const [idx, v] of assigned) values[TIME_FIELDS[idx]] = v;
      termCount += terms.length;
    } else {
      throw new ParseError(
        `Cannot parse '${part}' as a time (a single term is not a valid Time)`,
        pos,
        end,
      );
    }
  }

  if (termCount < 2) {
    throw new ParseError("A Time needs at least two terms", pos, end);
  }
  return makeTime(values);
}
