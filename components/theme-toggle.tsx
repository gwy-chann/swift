"use client";

import { useSyncExternalStore, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { ThemeMode } from "@/lib/tokens";
import {
  subscribeTheme,
  getThemeSnapshot,
  getServerThemeSnapshot,
  setStoredTheme,
  applyDocumentTheme,
  getStoredTheme,
} from "@/lib/theme";

export interface ThemeToggleProps {
  className?: string;
  variant?: "button" | "icon-only";
}

export function ThemeToggle({
  className = "",
  variant = "button",
}: ThemeToggleProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  // Ensure DOM is in sync on initial mount
  useEffect(() => {
    const current = getStoredTheme();
    applyDocumentTheme(current);
  }, []);

  const handleToggle = () => {
    const next: ThemeMode = theme === "light" ? "dark" : "light";
    setStoredTheme(next);
  };

  const isLight = theme === "light";
  const label = isLight ? "Switch to Dark Mode" : "Switch to Light Mode";

  if (variant === "icon-only") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={label}
        title={label}
        className={`inline-flex items-center justify-center p-2 rounded-md border border-border bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      >
        {isLight ? (
          <Sun className="w-4 h-4 text-accent" />
        ) : (
          <Moon className="w-4 h-4 text-primary" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-xs font-medium shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
    >
      {isLight ? (
        <>
          <Sun className="w-3.5 h-3.5 text-accent" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-primary" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}
