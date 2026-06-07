// Tokenizer for a single Calcron expression line.
//
// Key disambiguation rule: `-` and `/` are *separators inside a literal* when they
// appear mid-atom (e.g. `2000-06-15`, `06/15`), but *operators* when they begin a
// token (preceded by whitespace, "(", or the start of input). A literal never starts
// with `-` or `/`, so a leading one is unambiguously an operator.
//
// Atoms (unquoted literals) contain no spaces; a date+time literal with an internal
// space (e.g. `2000/06/15 8:50`) must be quoted or parenthesized — matching the spec.

import { ParseError } from "./types";

export type TokenType =
  | "atom" // unquoted literal chunk (no spaces)
  | "string" // quoted literal (may contain spaces)
  | "plus"
  | "minus"
  | "star"
  | "slash"
  | "range" // ..
  | "lparen"
  | "rparen";

export interface Token {
  type: TokenType;
  value: string; // raw text (for string: the unquoted contents)
  pos: number; // start offset
  end: number; // end offset (exclusive)
  spaceBefore: boolean; // was there whitespace immediately before this token?
}

const ATOM_START = /[0-9A-Za-z]/;
const ATOM_BODY = /[0-9A-Za-z:_/\-]/;

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let spaceBefore = false;
  const n = src.length;

  const push = (type: TokenType, value: string, pos: number, end: number) => {
    tokens.push({ type, value, pos, end, spaceBefore });
    spaceBefore = false;
  };

  while (i < n) {
    const c = src[i];

    if (c === " " || c === "\t") {
      spaceBefore = true;
      i++;
      continue;
    }

    if (c === "(") {
      push("lparen", c, i, i + 1);
      i++;
      continue;
    }
    if (c === ")") {
      push("rparen", c, i, i + 1);
      i++;
      continue;
    }

    // Range operator `..` (two dots). A lone `.` is not valid syntax.
    if (c === "." && src[i + 1] === ".") {
      push("range", "..", i, i + 2);
      i += 2;
      continue;
    }
    if (c === ".") {
      throw new ParseError("Unexpected '.' (did you mean '..'?)", i, i + 1);
    }

    if (c === "'" || c === '"') {
      const start = i;
      i++; // skip opening quote
      let buf = "";
      while (i < n && src[i] !== c) {
        buf += src[i];
        i++;
      }
      if (i >= n) throw new ParseError("Unterminated quoted literal", start, n);
      i++; // skip closing quote
      push("string", buf, start, i);
      continue;
    }

    if (c === "+") {
      push("plus", c, i, i + 1);
      i++;
      continue;
    }
    if (c === "*") {
      push("star", c, i, i + 1);
      i++;
      continue;
    }

    // Leading `-` or `/` => operator (a literal never starts with these).
    if (c === "-") {
      push("minus", c, i, i + 1);
      i++;
      continue;
    }
    if (c === "/") {
      push("slash", c, i, i + 1);
      i++;
      continue;
    }

    // Otherwise: an atom. Must start with a digit or letter.
    if (ATOM_START.test(c)) {
      const start = i;
      let buf = "";
      while (i < n) {
        const d = src[i];
        if (d === ".") {
          // `..` is the range operator; a single `.` before a digit is a
          // decimal point (e.g. `2.5`); any other `.` ends the atom.
          if (src[i + 1] === ".") break;
          if (/[0-9]/.test(src[i + 1] ?? "")) {
            buf += d;
            i++;
            continue;
          }
          break;
        }
        if (!ATOM_BODY.test(d)) break;
        buf += d;
        i++;
      }
      push("atom", buf, start, i);
      continue;
    }

    throw new ParseError(`Unexpected character '${c}'`, i, i + 1);
  }

  return tokens;
}
