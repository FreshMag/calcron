// A lightweight StreamLanguage that gives Calcron source dark-IDE syntax colours.

import {
  HighlightStyle,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const UNIT_RE = /^(us|ms|s|m|h|d|w|M|y)\b/;

const calcronStream = StreamLanguage.define<{ inComment: boolean }>({
  startState: () => ({ inComment: false }),
  token(stream) {
    if (stream.eatSpace()) return null;

    // Line comment.
    if (stream.match("//")) {
      stream.skipToEnd();
      return "lineComment";
    }

    // Quoted literal.
    const ch = stream.peek();
    if (ch === '"' || ch === "'") {
      stream.next();
      while (!stream.eol()) {
        if (stream.next() === ch) break;
      }
      return "string";
    }

    // Range / arithmetic operators.
    if (stream.match("..")) return "operator";
    if (stream.match(/^[+\-*/]/)) return "operator";

    if (ch === "(" || ch === ")") {
      stream.next();
      return "bracket";
    }

    // Numbers (with optional trailing unit for durations).
    if (/\d/.test(ch ?? "")) {
      stream.eatWhile(/\d/);
      return "number";
    }

    // Bare unit / specifier letters.
    if (stream.match(UNIT_RE)) return "unit";

    // Separators that join literal terms.
    if (ch === ":") {
      stream.next();
      return "separator";
    }

    stream.next();
    return null;
  },
  tokenTable: {
    lineComment: t.lineComment,
    string: t.string,
    operator: t.operator,
    bracket: t.paren,
    number: t.number,
    unit: t.keyword,
    separator: t.punctuation,
  },
});

export const calcronHighlight = HighlightStyle.define([
  { tag: t.lineComment, color: "#5c6370", fontStyle: "italic" },
  { tag: t.string, color: "#98c379" },
  { tag: t.number, color: "#d19a66" },
  { tag: t.keyword, color: "#c678dd", fontWeight: "600" },
  { tag: t.operator, color: "#56b6c2" },
  { tag: t.paren, color: "#abb2bf" },
  { tag: t.punctuation, color: "#56b6c2" },
]);

export function calcronLanguage(): LanguageSupport {
  return new LanguageSupport(calcronStream, [syntaxHighlighting(calcronHighlight)]);
}
