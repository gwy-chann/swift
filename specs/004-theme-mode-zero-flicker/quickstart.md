# Quickstart & Verification Guide: Global Light/Dark Theme Mode

**Feature**: STORY-1.4: Global Light/Dark Theme Mode with Zero-Hydration-Flicker Persistence (Jira: SIAA-11)
**Date**: 2026-10-07

## Prerequisites & Setup

1. Ensure development server is running or start it:
   ```bash
   npm run dev
   ```
2. Open browser at `http://localhost:3000` (or `http://localhost:3000/login`, `http://localhost:3000/admin`, `http://localhost:3000/staff`).

---

## Test Scenario 1: Default Clean Slate Light Mode Baseline

1. Open an Incognito / Private window or clear `localStorage.removeItem('swift-theme')`.
2. Navigate to `http://localhost:3000/`.
3. Verify:
   - Page renders in Clean Slate & Steel Blue light mode (`bg-bg-base: #f1f5f9`).
   - Root `<html class="...">` does NOT contain the `dark` class.
   - Theme toggle button reads `Light Mode` with sun icon.

---

## Test Scenario 2: Instant Theme Toggling Across Portals

1. Navigate to `/login`, `/admin`, or `/staff`.
2. Locate the `<ThemeToggle />` button.
3. Click the toggle button.
4. Verify:
   - Root `<html>` element instantly gains `class="dark"` and `data-theme="dark"`.
   - All tokenized surfaces transition immediately to obsidian dark slate (`bg-bg-base: #0f172a`, `bg-bg-surface: #1e293b`).
   - Theme toggle button updates label to `Dark Mode` with moon icon.
   - No styling breakage, contrast issues, or console errors.

---

## Test Scenario 3: Zero-Hydration-Flicker Reload Persistence

1. With Dark Mode active, press `Ctrl+F5` (Hard Reload) or press reload repeatedly.
2. Verify:
   - The page renders directly in Dark Mode on the very first frame (0ms white flash / FOUC).
   - The browser console displays zero React hydration mismatch warnings (`Warning: Text content did not match` or `Extra attributes from the server`).
3. Open a second tab at `http://localhost:3000/admin` while keeping the first tab open:
   - Toggling the theme in Tab 1 immediately synchronizes the theme in Tab 2.
