// Inline per-line results: a ViewPlugin that renders the computed value (or error)
// at the end of each line, plus a linter source that underlines errors.

import { Diagnostic, linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import {
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { run } from "../dsl";

class ResultWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly ok: boolean,
  ) {
    super();
  }

  eq(other: ResultWidget): boolean {
    return other.text === this.text && other.ok === this.ok;
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-result " + (this.ok ? "cm-result-ok" : "cm-result-err");
    span.textContent = (this.ok ? "= " : "⚠ ") + this.text;
    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const doc = view.state.doc;
  const results = run(doc.toString());
  const widgets = results.map((r) => {
    const line = doc.line(r.line + 1);
    const widget = new ResultWidget(
      r.ok ? r.text ?? "" : r.error ?? "error",
      r.ok,
    );
    return Decoration.widget({ widget, side: 1 }).range(line.to);
  });
  return Decoration.set(widgets, true);
}

export const resultsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export const calcronLinter = linter((view) => {
  const doc = view.state.doc;
  const diagnostics: Diagnostic[] = [];
  for (const r of run(doc.toString())) {
    if (r.ok) continue;
    const line = doc.line(r.line + 1);
    const from = r.errorRange ? line.from + r.errorRange.from : line.from;
    const to = r.errorRange ? line.from + r.errorRange.to : line.to;
    diagnostics.push({
      from,
      to: Math.max(to, from + 1),
      severity: "error",
      message: `${r.errorName ?? "Error"}: ${r.error ?? ""}`,
    });
  }
  return diagnostics;
});
