"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ThemeMode, DEFAULT_THEME } from "@/lib/tokens";

function applyTheme(mode: ThemeMode) {
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

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): ThemeMode {
  const saved = localStorage.getItem("swift-theme");
  return saved === "dark" ? "dark" : DEFAULT_THEME;
}

function getServerSnapshot(): ThemeMode {
  return DEFAULT_THEME;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Sync initial theme to document root on mount without calling setState
  useEffect(() => {
    const saved = localStorage.getItem("swift-theme") as ThemeMode | null;
    if (saved === "dark") {
      applyTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = theme === "light" ? "dark" : "light";
    localStorage.setItem("swift-theme", next);
    applyTheme(next);
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle Theme"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-xs font-medium shadow-sm cursor-pointer ${className}`}
    >
      {theme === "light" ? (
        <>
          <span className="text-amber-500">☀️</span>
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <span className="text-blue-400">🌙</span>
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}
