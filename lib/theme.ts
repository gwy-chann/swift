import { ThemeMode, DEFAULT_THEME } from "@/lib/tokens";

export const THEME_STORAGE_KEY = "swift-theme";

/**
 * Applies class and data-theme attribute directly to document.documentElement
 */
export function applyDocumentTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}

/**
 * Safely reads the theme stored in localStorage
 */
export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "dark" ? "dark" : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Persists theme preference and updates DOM and broadcasts storage event
 */
export function setStoredTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyDocumentTheme(mode);
    window.dispatchEvent(new Event("storage"));
  } catch {
    applyDocumentTheme(mode);
  }
}

/**
 * Toggles the current theme mode
 */
export function toggleTheme(): ThemeMode {
  const current = getStoredTheme();
  const next: ThemeMode = current === "light" ? "dark" : "light";
  setStoredTheme(next);
  return next;
}

/**
 * Subscribe callback for useSyncExternalStore and storage events
 */
export function subscribeTheme(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Client snapshot for useSyncExternalStore
 */
export function getThemeSnapshot(): ThemeMode {
  return getStoredTheme();
}

/**
 * Server snapshot for useSyncExternalStore
 */
export function getServerThemeSnapshot(): ThemeMode {
  return DEFAULT_THEME;
}
