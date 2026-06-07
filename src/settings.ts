// User settings, persisted in the browser (no backend). A tiny pub/sub lets the
// editor re-render results when settings change.

import type { OutputFormat } from "./dsl";

export interface Settings {
  format: OutputFormat;
  locale: string;
}

/** Locales offered in the settings dropdown (the engine works with any BCP-47 tag). */
export const LOCALES: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "it", name: "Italiano" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "nl", name: "Nederlands" },
];

const STORAGE_KEY = "calcron.settings";

function defaultLocale(): string {
  const base = (navigator.language || "en").split("-")[0];
  return LOCALES.some((l) => l.code === base) ? base : "en";
}

function load(): Settings {
  const fallback: Settings = { format: "natural", locale: defaultLocale() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      format: parsed.format === "compact" ? "compact" : "natural",
      locale: typeof parsed.locale === "string" ? parsed.locale : fallback.locale,
    };
  } catch {
    return fallback;
  }
}

let current = load();
const listeners = new Set<(s: Settings) => void>();

export function getSettings(): Settings {
  return current;
}

export function setSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore storage failures (e.g. private mode)
  }
  listeners.forEach((fn) => fn(current));
}

export function subscribeSettings(fn: (s: Settings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
