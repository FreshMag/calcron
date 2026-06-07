import { describe, it, expect } from "vitest";
import { evalLine, formatValue, run } from "./index";
import { IncompatibleHierarchyError, ParseError } from "./types";

const fmt = (src: string) => formatValue(evalLine(src));

describe("Time literals & inference", () => {
  it("parses basic colon times", () => {
    expect(fmt("15:06")).toBe("15:06");
    expect(fmt("15:06:50")).toBe("15:06:50");
    expect(fmt("15:06:50:687")).toBe("15:06:50:687");
    expect(fmt("15:05:50:569345")).toBe("15:05:50:569345");
  });

  it("treats the 8:50 spellings as equivalent", () => {
    for (const s of ["08:50", "8h:50", "08h:50", "8h:50m", "8:50m"]) {
      expect(fmt(s)).toBe("08:50");
    }
  });

  it("parses June 15th in every date spelling", () => {
    for (const s of ["06/15", "06-15", "15d/6M", "6M/15", "06/15d"]) {
      expect(fmt(s)).toBe("06/15");
    }
  });

  it("parses dates with a year", () => {
    for (const s of ["2000/06/15", "2000-06-15", "2000y/06/15", "2000y/6M/15", "2000y/06/15d"]) {
      expect(fmt(s)).toBe("2000/06/15");
    }
  });

  it("parses quoted full timestamps", () => {
    expect(fmt("'2000y/06/15 8h:50:47'")).toBe("2000/06/15 08:50:47");
    expect(fmt('"2000y/06/15 8h:50:47"')).toBe("2000/06/15 08:50:47");
  });

  it("rejects single-term times and bad inference", () => {
    expect(() => evalLine("15d/6")).toThrow(ParseError);
  });
});

describe("Duration literals", () => {
  it("parses unit durations", () => {
    expect(fmt("15y")).toBe("15y");
    expect(fmt("16m")).toBe("16m");
    expect(fmt("15m51s")).toBe("15m51s");
  });

  it("parses quoted/spaced durations", () => {
    expect(fmt('"15h 51s"')).toBe("15h51s");
    expect(fmt("'16y 15h 32s'")).toBe("16y15h32s");
  });
});

describe("Arithmetic (spec examples)", () => {
  it("time + duration -> time", () => {
    expect(fmt("15:06 + 31m")).toBe("15:37");
    expect(fmt("06/20 + 20d")).toBe("07/10");
  });

  it("duration + duration -> duration", () => {
    expect(fmt("31m + 40s")).toBe("31m40s");
    expect(fmt('31m30s + "1m 20s"')).toBe("32m50s");
  });

  it("duration scaled by a scalar", () => {
    expect(fmt("(00:15s..00:45s) / 2")).toBe("15s");
    expect(fmt("0/1M..0/2M * 5")).toBe("5M");
  });
});

describe("Ranges", () => {
  it("computes a duration between two compatible times", () => {
    expect(fmt("15:06..17:49")).toBe("2h43m");
  });

  it("rejects incompatible hierarchies", () => {
    expect(() => evalLine("(2000-06-03)..(15:07)")).toThrow(IncompatibleHierarchyError);
    expect(() => evalLine("(15:07)..(30m:51)")).toThrow(IncompatibleHierarchyError);
  });
});

describe("Specifier semantics", () => {
  it("15m:06 is minutes:seconds, not hours:minutes", () => {
    // Same display string, but distinct from 15:06 (h:m) — verify via subtraction window.
    expect(fmt("15m:06")).toBe("15:06");
    // 15m:06 .. 15m:30 = 24 seconds (minute/second window)
    expect(fmt("15m:06..15m:30")).toBe("24s");
  });
});

describe("run() program evaluation", () => {
  it("ignores comments and blank lines, reports per line", () => {
    const results = run(`15:06 + 31m  // add half an hour\n\n31m + 40s`);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ line: 0, ok: true, text: "15:37" });
    expect(results[1]).toMatchObject({ line: 2, ok: true, text: "31m40s" });
  });

  it("surfaces errors with a name and range", () => {
    const results = run("(2000-06-03)..(15:07)");
    expect(results[0].ok).toBe(false);
    expect(results[0].errorName).toBe("IncompatibleHierarchyError");
  });
});
