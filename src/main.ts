import "./style.css";
import { createEditor } from "./editor/setup";
import { run } from "./dsl";

const EXAMPLE = `// Calcron — a tiny DSL for times & durations.
// Edit any line; results update live on the right.

// Time + Duration -> Time
15:06 + 31m
06/20 + 20d

// Duration arithmetic
31m + 40s
31m30s + "1m 20s"

// Ranges between two Times -> Duration
15:06..17:49
(00:15s..00:45s) / 2
0/1M..0/2M * 5

// Try an error: incompatible hierarchies
(2000-06-03)..(15:07)
`;

const host = document.getElementById("editor");
const status = document.getElementById("status");
if (!host) throw new Error("missing #editor");

const view = createEditor(host, EXAMPLE);

function refreshStatus() {
  if (!status) return;
  const results = run(view.state.doc.toString());
  const errors = results.filter((r) => !r.ok).length;
  status.textContent =
    errors === 0
      ? `${results.length} result${results.length === 1 ? "" : "s"}`
      : `${errors} error${errors === 1 ? "" : "s"}`;
  status.classList.toggle("status-error", errors > 0);
}

refreshStatus();
view.dom.addEventListener("keyup", refreshStatus);
view.dom.addEventListener("input", refreshStatus);
