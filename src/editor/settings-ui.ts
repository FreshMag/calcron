// Gear button → settings popover. Reads/writes the persisted settings store.

import { LOCALES, getSettings, setSettings, type Settings } from "../settings";

const FORMATS: { value: Settings["format"]; label: string; hint: string }[] = [
  { value: "natural", label: "Natural language", hint: "2 hours and 43 minutes" },
  { value: "compact", label: "Compact", hint: "2h43m" },
];

/** Build the settings popover and wire the gear button to toggle it. */
export function mountSettings(button: HTMLElement): void {
  const panel = document.createElement("div");
  panel.className = "settings-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Settings");

  panel.innerHTML = `
    <h2 class="settings-title">Settings</h2>

    <fieldset class="settings-group">
      <legend>Output format</legend>
      <div class="settings-formats">
        ${FORMATS.map(
          (f) => `
          <label class="settings-radio">
            <input type="radio" name="format" value="${f.value}" />
            <span class="settings-radio-text">
              <span class="settings-radio-label">${f.label}</span>
              <span class="settings-radio-hint">${f.hint}</span>
            </span>
          </label>`,
        ).join("")}
      </div>
    </fieldset>

    <fieldset class="settings-group">
      <legend><label for="settings-locale">Output language</label></legend>
      <select id="settings-locale" class="settings-select">
        ${LOCALES.map((l) => `<option value="${l.code}">${l.name}</option>`).join("")}
      </select>
    </fieldset>
  `;

  document.body.appendChild(panel);

  const localeSelect = panel.querySelector<HTMLSelectElement>("#settings-locale")!;
  const formatRadios = Array.from(
    panel.querySelectorAll<HTMLInputElement>('input[name="format"]'),
  );

  function syncFromStore(): void {
    const s = getSettings();
    for (const r of formatRadios) r.checked = r.value === s.format;
    // If the stored locale isn't in the list, leave the select unset.
    localeSelect.value = s.locale;
  }

  for (const r of formatRadios) {
    r.addEventListener("change", () => {
      if (r.checked) setSettings({ format: r.value as Settings["format"] });
    });
  }
  localeSelect.addEventListener("change", () => {
    setSettings({ locale: localeSelect.value });
  });

  function position(): void {
    const rect = button.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 8}px`;
    // Right-align the panel to the button.
    panel.style.right = `${window.innerWidth - rect.right}px`;
  }

  function open(): void {
    syncFromStore();
    position();
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
  }

  function close(): void {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
  }

  function onOutside(e: PointerEvent): void {
    const target = e.target as Node;
    if (!panel.contains(target) && target !== button && !button.contains(target)) {
      close();
    }
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") close();
  }

  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", () => {
    if (panel.hidden) open();
    else close();
  });
  window.addEventListener("resize", () => {
    if (!panel.hidden) position();
  });
}
