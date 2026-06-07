// Inline per-line results: a ViewPlugin that renders the computed value (or error)
// at the end of each line, plus a linter source that underlines errors.

import { Diagnostic, linter } from "@codemirror/lint";
import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { formatValue, run } from "../dsl";
import { getSettings } from "../settings";

/** Dispatched when user settings change, to force the result widgets to re-render. */
export const settingsChanged = StateEffect.define<void>();

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
  const settings = getSettings();
  const results = run(doc.toString());
  const widgets = results.map((r) => {
    const line = doc.line(r.line + 1);
    const text =
      r.ok && r.value
        ? formatValue(r.value, { format: settings.format, locale: settings.locale })
        : r.error ?? "error";
    const widget = new ResultWidget(text, r.ok);
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
      const settingsTouched = update.transactions.some((tr) =>
        tr.effects.some((e) => e.is(settingsChanged)),
      );
      if (update.docChanged || update.viewportChanged || settingsTouched) {
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
