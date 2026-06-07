// Assemble the CodeMirror editor: dark theme, Calcron highlighting, inline results.

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { calcronLanguage } from "./calcron-lang";
import { calcronLinter, resultsPlugin } from "./results";

const darkTheme = EditorView.theme(
  {
    "&": {
      color: "#abb2bf",
      backgroundColor: "transparent",
      height: "100%",
      fontSize: "15px",
    },
    ".cm-content": {
      fontFamily:
        "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
      padding: "16px 0",
      caretColor: "#56b6c2",
    },
    ".cm-scroller": { lineHeight: "1.7", overflow: "auto" },
    "&.cm-focused": { outline: "none" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#4b5263",
      border: "none",
    },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#828a99" },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.03)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#56b6c2" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(86,182,194,0.22)",
    },
    ".cm-result": {
      marginLeft: "1.5em",
      padding: "0 8px",
      borderRadius: "5px",
      fontStyle: "normal",
    },
    ".cm-result-ok": {
      color: "#1c2230",
      backgroundColor: "#56b6c2",
      fontWeight: "600",
    },
    ".cm-result-err": {
      color: "#e06c75",
      backgroundColor: "rgba(224,108,117,0.12)",
    },
  },
  { dark: true },
);

export function createEditor(parent: HTMLElement, initialDoc: string): EditorView {
  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      drawSelection(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      calcronLanguage(),
      darkTheme,
      resultsPlugin,
      calcronLinter,
      EditorView.lineWrapping,
    ],
  });

  return new EditorView({ state, parent });
}
