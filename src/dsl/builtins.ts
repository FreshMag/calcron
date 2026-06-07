// Built-in property accessors and functions for the `.` member operator.
//
// Properties: `value.<unit>` (e.g. `2m.seconds`). On a Duration this re-expresses
// the whole duration in that single unit; on a Time it reads that field's value.
// Functions/methods: `fn(value, ...)` or `value.fn(...)` (e.g. `trunc(x, s)` /
// `x.trunc(s)`). Method form simply passes the receiver as the first argument.

import { DurationUnit, TimeField, TypeError_, UnitRef, Value } from "./types";
import { truncDuration } from "./duration";
import { resolveTimeFields, truncTime } from "./time";

/** Property access: `value.<unit>`. */
export function accessUnit(value: Value, unit: DurationUnit, name: string): Value {
  if (value.kind === "duration") {
    const calendar = unit === "y" || unit === "M";
    if (calendar && value.fixedUs !== 0) {
      throw new TypeError_(`Cannot express this duration in ${name} (it has sub-month parts)`);
    }
    if (!calendar && value.months !== 0) {
      throw new TypeError_(`Cannot express this duration in ${name} (it has months/years)`);
    }
    return { ...value, displayUnit: unit };
  }

  if (value.kind === "time") {
    if (unit === "w") throw new TypeError_("A Time has no 'week' component");
    const field = unit as TimeField;
    return { kind: "num", value: resolveTimeFields(value)[field] };
  }

  throw new TypeError_(`Cannot read property '.${name}' of a ${value.kind}`);
}

type Builtin = (args: Value[]) => Value;

function expectUnit(arg: Value | undefined, fn: string): UnitRef {
  if (!arg || arg.kind !== "unit") {
    throw new TypeError_(`${fn} expects a unit (e.g. s, m, h) as its unit argument`);
  }
  return arg;
}

const FUNCTIONS: Record<string, Builtin> = {
  // trunc(TIME|DURATION, UNIT): truncate up to the given unit.
  trunc(args) {
    const value = args[0];
    const unit = expectUnit(args[1], "trunc").unit;
    if (value && value.kind === "duration") return truncDuration(value, unit);
    if (value && value.kind === "time") {
      if (unit === "w") throw new TypeError_("Cannot truncate a Time to weeks");
      return truncTime(value, unit as TimeField);
    }
    throw new TypeError_("trunc expects a Time or Duration as its first argument");
  },
};

export function callBuiltin(name: string, args: Value[]): Value {
  const fn = FUNCTIONS[name];
  if (!fn) throw new TypeError_(`Unknown function '${name}'`);
  return fn(args);
}
