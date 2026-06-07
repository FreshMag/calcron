// Render a Value to its canonical display string.

import { durationParts } from "./duration";
import { TIME_FIELDS, Value } from "./types";

function pad(n: number, width: number): string {
  const neg = n < 0;
  const s = Math.abs(n).toString().padStart(width, "0");
  return neg ? "-" + s : s;
}

export function formatValue(v: Value): string {
  switch (v.kind) {
    case "num":
      return String(v.value);
    case "time":
      return formatTime(v);
    case "duration":
      return formatDuration(v);
  }
}

function formatTime(v: Extract<Value, { kind: "time" }>): string {
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

function formatDuration(v: Extract<Value, { kind: "duration" }>): string {
  const p = durationParts(v);
  const order: [number, string][] = [
    [p.y, "y"],
    [p.M, "M"],
    [p.d, "d"],
    [p.h, "h"],
    [p.m, "m"],
    [p.s, "s"],
    [p.ms, "ms"],
    [p.us, "us"],
  ];
  const out = order
    .filter(([n]) => n !== 0)
    .map(([n, unit]) => `${n}${unit}`)
    .join("");
  return out === "" ? "0s" : out;
}
