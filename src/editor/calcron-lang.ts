// A lightweight StreamLanguage that gives Calcron source dark-IDE syntax colours.

import {
  HighlightStyle,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const IDENT_RE = /^[A-Za-z]+/;

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

    // Range / arithmetic / member operators.
    if (stream.match("..")) return "operator";
    if (stream.match(/^[+\-*/.]/)) return "operator";

    if (ch === "(" || ch === ")") {
      stream.next();
      return "bracket";
    }

    // Numbers (with an optional decimal part).
    if (/\d/.test(ch ?? "")) {
      stream.eatWhile(/\d/);
      stream.match(/^\.\d+/);
      return "number";
    }

    // Identifiers: units, specifiers, property/method/function names.
    if (stream.match(IDENT_RE)) return "unit";

    // Separators that join literal terms / arguments.
    if (ch === ":" || ch === ",") {
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
