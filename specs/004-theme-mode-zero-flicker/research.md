# Technical Research & Architecture Decisions: Global Light/Dark Theme Mode with Zero-Hydration-Flicker Persistence

**Feature**: STORY-1.4: Global Light/Dark Theme Mode with Zero-Hydration-Flicker Persistence (Jira: SIAA-11)
**Date**: 2026-10-07

## 1. Zero-Hydration-Flicker (FOUC) Prevention Architecture

### Problem
In SSR / Next.js App Router applications, the server renders initial HTML without knowing the user's client-side `localStorage` theme preference (`swift-theme`). If the initial HTML is rendered in light mode and the theme is only resolved after React mounts in `useEffect`, dark mode users experience a glaring white flash (Flash of Unstyled Content - FOUC) for 100-300ms on every hard reload or cold navigation. Furthermore, manipulating DOM classes after hydration without `suppressHydrationWarning` triggers React hydration mismatch errors.

### Decision & Solution
1. **Inline Blocking Head Script (`ThemeScript`)**:
   Inject an inline, synchronous `<script>` tag inside `<head>` or at the very top of `<body>` in `app/layout.tsx`. Because inline scripts execute synchronously before HTML parsing reaches the body and before the first paint, it reads `localStorage.getItem('swift-theme')` and immediately applies the `.dark` class and `data-theme="dark"` attribute to `document.documentElement`.
2. **`suppressHydrationWarning` on `<html>`**:
   Add `suppressHydrationWarning` to the `<html>` element in `app/layout.tsx`. Next.js and React natively ignore server/client attribute differences on `<html>` when this attribute is present, preventing any console hydration warnings.
3. **Synchronized Reactive Client Store**:
   Use `useSyncExternalStore` in `ThemeToggle` listening to `window` `storage` events and custom local dispatch events. This provides instantaneous re-renders across multiple components and tabs without `useEffect` state lag or unnecessary rerenders.

### Alternatives Considered
- **Cookie-based Theme Detection via Next.js Middleware**: Requires parsing cookies on every SSR request and adds cookie management overhead. Local storage with an inline blocking script delivers instant, 0ms paint time with zero server latency or middleware roundtrips.
- **Third-party `next-themes` library**: Adds an external dependency and extra boilerplate. Our lightweight, native implementation directly binds to SWIFT's semantic design tokens (`lib/tokens.ts` and `app/globals.css`) with zero extra bundle weight.

---

## 2. Design Token Consistency & Color Harmony

### Decision
SWIFT uses CSS Custom Properties defined in `app/globals.css` with `@theme` Tailwind v4 mapping and TypeScript definitions in `lib/tokens.ts`:
- **Light Mode Baseline**:
  - `--bg-base: #f1f5f9` (Slate 100)
  - `--bg-surface: #ffffff` (Pure White)
  - `--bg-card: #ffffff`
  - `--bg-sidebar: #0f172a` (Admin/Staff sidebar high-contrast)
  - `--text-primary: #0f172a` (Slate 900)
  - `--text-secondary: #475569` (Slate 600)
  - `--primary: #2563eb` (Blue 600)
- **Dark Mode Obsidian Slate (`.dark` / `[data-theme="dark"]`)**:
  - `--bg-base: #0f172a` (Slate 900)
  - `--bg-surface: #1e293b` (Slate 800)
  - `--bg-card: #1e293b`
  - `--bg-sidebar: #0b1120` (Obsidian 950)
  - `--text-primary: #f8fafc` (Slate 50)
  - `--text-secondary: #94a3b8` (Slate 400)
  - `--primary: #3b82f6` (Blue 500)

All UI elements throughout Auth, Admin Portal, Staff Terminal, modals, tables, and buttons use semantic classes (`bg-bg-base`, `bg-bg-surface`, `text-text-primary`, `border-border`), ensuring 100% automatic dark mode adaptation without requiring scattered `dark:` prefixes.

---

## 3. Cross-Tab & Multi-Window Synchronization

### Decision
When a user toggles theme in one tab or window:
1. `ThemeToggle` updates `localStorage.setItem('swift-theme', next)`.
2. `applyTheme(next)` updates `document.documentElement`.
3. A `window.dispatchEvent(new Event('storage'))` is fired for the local window.
4. Other open browser windows/tabs receive the native `window.addEventListener('storage')` event and update their reactive store and `document.documentElement` simultaneously.
