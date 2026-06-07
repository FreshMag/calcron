// Walk the AST and apply the typed operation rules.
//
// Result type: any operation involving a Time yields a Time, except Time−Time
// (and the `..` range) which yields a Duration.

import { Node } from "./parser";
import { Value, TypeError_ } from "./types";
import {
  addDurations,
  divideDuration,
  scaleDuration,
  subDurations,
} from "./duration";
import { addDurationToTime, diffTimes } from "./time";

const num = (value: number): Value => ({ kind: "num", value });

export function evaluate(node: Node): Value {
  switch (node.type) {
    case "literal":
      return node.value;

    case "range": {
      const a = evaluate(node.left);
      const b = evaluate(node.right);
      if (a.kind !== "time" || b.kind !== "time") {
        throw new TypeError_("Range '..' requires a Time on both sides", node.pos, node.end);
      }
      return diffTimes(b, a);
    }

    case "binary": {
      const l = evaluate(node.left);
      const r = evaluate(node.right);
      return applyBinary(node.op, l, r, node.pos, node.end);
    }
  }
}

function applyBinary(
  op: string,
  l: Value,
  r: Value,
  pos: number,
  end: number,
): Value {
  switch (op) {
    case "+":
      if (l.kind === "num" && r.kind === "num") return num(l.value + r.value);
      if (l.kind === "duration" && r.kind === "duration") return addDurations(l, r);
      if (l.kind === "time" && r.kind === "duration") return addDurationToTime(l, r, 1);
      if (l.kind === "duration" && r.kind === "time") return addDurationToTime(r, l, 1);
      throw new TypeError_(`Cannot add ${l.kind} and ${r.kind}`, pos, end);

    case "-":
      if (l.kind === "num" && r.kind === "num") return num(l.value - r.value);
      if (l.kind === "duration" && r.kind === "duration") return subDurations(l, r);
      if (l.kind === "time" && r.kind === "duration") return addDurationToTime(l, r, -1);
      if (l.kind === "time" && r.kind === "time") return diffTimes(l, r);
      throw new TypeError_(`Cannot subtract ${r.kind} from ${l.kind}`, pos, end);

    case "*":
      if (l.kind === "num" && r.kind === "num") return num(l.value * r.value);
      if (l.kind === "duration" && r.kind === "num") return scaleDuration(l, r.value);
      if (l.kind === "num" && r.kind === "duration") return scaleDuration(r, l.value);
      throw new TypeError_(`Cannot multiply ${l.kind} by ${r.kind}`, pos, end);

    case "/":
      if (l.kind === "num" && r.kind === "num") {
        if (r.value === 0) throw new TypeError_("Division by zero", pos, end);
        return num(l.value / r.value);
      }
      if (l.kind === "duration" && r.kind === "num") return divideDuration(l, r.value);
      throw new TypeError_(`Cannot divide ${l.kind} by ${r.kind}`, pos, end);

    default:
      throw new TypeError_(`Unknown operator '${op}'`, pos, end);
  }
}
