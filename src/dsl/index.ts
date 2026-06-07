// Public entry point for the Calcron engine.

import { CalcronError, Value } from "./types";
import { parse } from "./parser";
import { evaluate } from "./evaluator";
import { formatValue } from "./format";

export * from "./types";
export { parse } from "./parser";
export { evaluate } from "./evaluator";
export { formatValue } from "./format";
export type { FormatOptions, OutputFormat } from "./format";

export interface LineResult {
  line: number; // 0-based line index in the program
  /** Character range of the error within the line, when available. */
  errorRange?: { from: number; to: number };
  ok: boolean;
  /** Present when ok: the formatted result and the typed value. */
  text?: string;
  value?: Value;
  /** Present when !ok. */
  error?: string;
  errorName?: string;
}

/** Strip a trailing `// ...` comment from a line, ignoring `//` inside quotes. */
function stripComment(line: string): string {
  let inQuote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === inQuote) inQuote = null;
    } else if (c === '"' || c === "'") {
      inQuote = c;
    } else if (c === "/" && line[i + 1] === "/") {
      return line.slice(0, i);
    }
  }
  return line;
}

/** Evaluate a single expression line. */
export function evalLine(src: string): Value {
  return evaluate(parse(src));
}

/** Evaluate a whole program; one result per non-empty, non-comment line. */
export function run(program: string): LineResult[] {
  const lines = program.split("\n");
  const results: LineResult[] = [];

  lines.forEach((rawLine, idx) => {
    const code = stripComment(rawLine);
    if (code.trim() === "") return; // blank or comment-only line

    try {
      const value = evaluate(parse(code));
      results.push({ line: idx, ok: true, text: formatValue(value), value });
    } catch (err) {
      const result: LineResult = {
        line: idx,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        errorName: err instanceof Error ? err.name : "Error",
      };
      if (err instanceof CalcronError && err.pos !== undefined) {
        result.errorRange = { from: err.pos, to: err.end ?? code.length };
      }
      results.push(result);
    }
  });

  return results;
}
