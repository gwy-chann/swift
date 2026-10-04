/**
 * SWIFT Design System Tokens
 * Source of truth: Based on mockup/style.css
 * Brand: SWIFT - Motorcycle Parts & Repair Shop Management System
 * Default theme: Light Mode (Utilitarian Clean Slate & Steel Blue)
 * Includes: Full dark mode palette
 */

export const BRAND = {
  name: "SWIFT",
  tagline: "Motorcycle Parts & Repair Shop Management System",
  shortDesc: "Integrated POS, Inventory & Motorcycle Repair Shop Management",
} as const;

export const DEFAULT_THEME = "light" as const;
export type ThemeMode = "light" | "dark";

export interface ColorTokens {
  // Brand Primary (Balanced Steel Blue)
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryBorder: string;

  // Secondary (Slate Tool Gray)
  secondary: string;
  secondaryHover: string;

  // Accent / Status
  accent: string;
  accentLight: string;
  success: string;
  successLight: string;
  info: string;
  infoLight: string;
  danger: string;
  dangerLight: string;

  // Surfaces & Backgrounds
  bgBase: string;
  bgSurface: string;
  bgCard: string;
  bgSidebar: string;
  bgSidebarHover: string;
  bgInput: string;
  bgHover: string;
  bgMuted: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;

  // Borders
  borderColor: string;
  borderSubtle: string;
  borderFocus: string;

  // Shadows
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

export const lightTokens: ColorTokens = {
  // Brand Primary (Balanced Steel Blue from mockup)
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  primaryLight: "#eff6ff",
  primaryBorder: "#bfdbfe",

  // Secondary (Slate Tool Gray)
  secondary: "#475569",
  secondaryHover: "#334155",

  // Status & Accents
  accent: "#d97706",       // Soft Amber Warning
  accentLight: "#fffbeb",
  success: "#059669",      // Calm Forest Green
  successLight: "#ecfdf5",
  info: "#0284c7",         // Calm Sky / OEM Blue
  infoLight: "#f0f9ff",
  danger: "#dc2626",       // Soft Coral / Alert Red
  dangerLight: "#fef2f2",

  // Clean, Eye-Friendly Light Surfaces
  bgBase: "#f1f5f9",       // Soft cool-slate workspace canvas
  bgSurface: "#ffffff",    // Pure white container
  bgCard: "#ffffff",       // Cards & tables
  bgSidebar: "#0f172a",    // Deep slate-navy sidebar for structured contrast
  bgSidebarHover: "#1e293b",
  bgInput: "#ffffff",      // Crisp white input
  bgHover: "#f8fafc",      // Gentle row hover
  bgMuted: "#f8fafc",

  // High-Legibility Typography
  textPrimary: "#0f172a",  // Deep slate charcoal
  textSecondary: "#475569",// Balanced body slate
  textMuted: "#64748b",    // Muted captions & subtitles
  textLight: "#f8fafc",    // Light text on dark sidebar

  // Hairline Borders
  borderColor: "#e2e8f0",  // Soft slate hairline borders
  borderSubtle: "#f1f5f9",
  borderFocus: "#2563eb",

  // Natural Subtle Shadows
  shadowSm: "0 1px 3px rgba(15, 23, 42, 0.06)",
  shadowMd: "0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)",
  shadowLg: "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)",
};

export const darkTokens: ColorTokens = {
  // Brand Primary (Vibrant Steel Blue for contrast on dark)
  primary: "#3b82f6",
  primaryHover: "#60a5fa",
  primaryLight: "rgba(59, 130, 246, 0.15)",
  primaryBorder: "rgba(59, 130, 246, 0.35)",

  // Secondary (Light Slate)
  secondary: "#94a3b8",
  secondaryHover: "#cbd5e1",

  // Status & Accents (Vibrant for dark mode readability)
  accent: "#f59e0b",
  accentLight: "rgba(245, 158, 11, 0.15)",
  success: "#10b981",
  successLight: "rgba(16, 185, 129, 0.15)",
  info: "#38bdf8",
  infoLight: "rgba(56, 189, 248, 0.15)",
  danger: "#ef4444",
  dangerLight: "rgba(239, 68, 68, 0.15)",

  // Deep Obsidian & Slate Surfaces
  bgBase: "#0b0f19",       // Midnight slate canvas
  bgSurface: "#111827",    // Slate-900 surface
  bgCard: "#151f32",       // Elevated card container
  bgSidebar: "#070b14",    // Pitch obsidian sidebar
  bgSidebarHover: "#162035",
  bgInput: "#0f172a",      // Dark input field
  bgHover: "#1e293b",      // Row hover
  bgMuted: "#182234",

  // Dark Mode Typography
  textPrimary: "#f8fafc",  // Crisp white slate
  textSecondary: "#94a3b8",// Medium slate
  textMuted: "#64748b",    // Low emphasis
  textLight: "#ffffff",

  // Dark Borders
  borderColor: "#1e293b",
  borderSubtle: "#141d2e",
  borderFocus: "#3b82f6",

  // Dark Shadows
  shadowSm: "0 1px 3px rgba(0, 0, 0, 0.4)",
  shadowMd: "0 4px 6px -1px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.35)",
  shadowLg: "0 10px 15px -3px rgba(0, 0, 0, 0.55), 0 4px 6px -4px rgba(0, 0, 0, 0.4)",
};

export const typographyTokens = {
  fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  fontSize: {
    xs: "0.75rem",     // 12px
    sm: "0.8125rem",   // 13px (compact POS tables)
    base: "0.875rem",  // 14px (default mockup body size)
    md: "1rem",        // 16px
    lg: "1.125rem",    // 18px
    xl: "1.25rem",     // 20px (h2)
    "2xl": "1.5rem",   // 24px (h1)
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem",  // 36px
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.45", // Mockup body line-height
    relaxed: "1.6",
  },
} as const;

export const radiiTokens = {
  sm: "4px",   // mockup button & input radius
  md: "6px",   // card & badge radius
  lg: "8px",   // container radius
  xl: "12px",  // modal & popover radius
  full: "9999px",
} as const;

export const transitionTokens = {
  fast: "all 0.15s ease-in-out", // Mockup transition
  normal: "all 0.2s ease-in-out",
} as const;

/**
 * Helper to fetch token set by mode
 */
export function getThemeTokens(mode: ThemeMode = DEFAULT_THEME): ColorTokens {
  return mode === "dark" ? darkTokens : lightTokens;
}
