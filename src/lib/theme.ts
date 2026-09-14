import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "parchment-quill-theme-v1";

/** The OS-level color scheme. */
export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Resolve the "system" preference to the current OS theme. */
export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === "system" ? getSystemTheme() : pref;
}

/** Read the saved preference, defaulting to "system". */
export function loadPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // storage blocked, fall through to the default
  }
  return "system";
}

// Must match the .theme-fade transition duration in index.css.
const FADE_MS = 300;

let fadeTimer: number | undefined;

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

/** Apply the resolved theme to the root element. */
function toggleTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

// Fallback for browsers without the View Transitions API.
function fadeToggle(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.add("theme-fade");
  window.clearTimeout(fadeTimer);
  fadeTimer = window.setTimeout(() => root.classList.remove("theme-fade"), FADE_MS);
  toggleTheme(resolved);
}

export function applyTheme(resolved: ResolvedTheme, animate = false) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Animated change, unless the user asked for reduced motion.
  if (animate && !reduce) {
    const doc = document as ViewTransitionDocument;
    // Preferred path: the View Transitions API cross-fades the whole page.
    if (typeof doc.startViewTransition === "function") {
      // Bitmap cross-fade: backgrounds, text, and currentColor icons stay in sync.
      doc.startViewTransition(() => toggleTheme(resolved));
      return;
    }
    // Fallback path: transition the theme-fade class instead.
    fadeToggle(resolved);
    return;
  }

  // No animation: switch immediately.
  toggleTheme(resolved);
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => loadPreference());
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    typeof window === "undefined" ? "light" : resolveTheme(loadPreference()),
  );

  useEffect(() => {
    // Apply the preference now and remember it for next time.
    const update = () => {
      const next = resolveTheme(preference);
      setResolved(next);
      applyTheme(next, true);
    };
    update();
    try {
      localStorage.setItem(THEME_KEY, preference);
    } catch {
      // quota or private mode, still applies in memory, just won't persist
    }

    // When following the system, re-apply whenever the OS theme changes.
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [preference]);

  return { preference, setPreference, resolved };
}
