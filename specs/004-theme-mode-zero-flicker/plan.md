# Implementation Plan: Global Light/Dark Theme Mode with Zero-Hydration-Flicker Persistence

**Branch**: `feat/SIAA-11-theme-mode-persistence` | **Date**: 2026-10-07 | **Spec**: [`specs/004-theme-mode-zero-flicker/spec.md`](spec.md)

**Input**: Feature specification from `specs/004-theme-mode-zero-flicker/spec.md`

## Summary

Implement and harden the global Light/Dark theme mode system with zero-hydration-flicker persistence, featuring:
1. Root `<html>` setup with `suppressHydrationWarning` and blocking `<ThemeScript />` in `app/layout.tsx` to read `localStorage` before DOM paint, eliminating flash of unstyled content (FOUC).
2. Robust, accessible `<ThemeToggle />` component with `lucide-react` icons (Sun/Moon), reactive cross-tab synchronization via `useSyncExternalStore` and `storage` event dispatching.
3. Complete SWIFT semantic token binding across light and obsidian dark slate palettes.
4. Comprehensive verification across Auth Hub, Admin Portal, and Staff Terminal shells.

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16.3.8 App Router / React 19.2.8

**Primary Dependencies**: Next.js App Router, `lucide-react`, Tailwind CSS v4

**Storage**: `localStorage['swift-theme']`

**Testing**: Static type checking (`npx tsc --noEmit`), linting (`eslint`), and end-to-end browser zero-flicker validation

**Target Platform**: All desktop, tablet, and mobile browsers (Chrome, Edge, Firefox, Safari)

**Project Type**: Next.js App Router Global Theme System

**Performance Goals**: 0ms visual flash (FOUC) on dark reload, <16ms toggle response, 0 React hydration mismatch warnings

**Constraints**: Strict adherence to SWIFT semantic design tokens (`bg-bg-base`, `bg-bg-surface`, `bg-primary`, `text-text-primary`, etc.); zero hardcoded colors; WCAG AA contrast compliance in both modes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Assessment | Status |
| :--- | :--- | :--- | :---: |
| **I. Semantic Design Tokens** | Light and dark mode palettes must be strictly bound to CSS custom properties defined in `app/globals.css` and `lib/tokens.ts`. | Verified. 100% tokenized variable mapping. | **PASS** |
| **II. Single Source of Truth** | Visual tokens match `mockup/style.css` and `docs/features.md`. | Verified. Obsidian dark slate and Clean Slate themes conform to design specifications. | **PASS** |
| **III. Type-Safe Data Architecture** | ThemeMode (`"light" | "dark"`) and theme helper functions strictly typed in TypeScript. | Verified. Schemas defined in `data-model.md` and `contracts/`. | **PASS** |
| **IV. Test-First Quality** | Zero-flicker script, toggle interactions, and reload scenarios verified against quickstart scenarios. | Verified. Test journeys defined in `quickstart.md`. | **PASS** |
| **V. Server-First & Accessibility** | `suppressHydrationWarning` on `<html>`, accessible ARIA labels, semantic icon rendering, and keyboard accessibility. | Verified. ARIA labels and keyboard focus states included. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/004-theme-mode-zero-flicker/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research and architecture decisions (Phase 0)
├── data-model.md        # Theme domain types, storage mapping, and state diagram (Phase 1)
├── quickstart.md        # End-to-end verification and testing guide (Phase 1)
├── contracts/           # Component and script interface contracts (Phase 1)
│   └── theme-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Implementation tasks (Phase 2 output via /speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                # Root layout with ThemeScript & suppressHydrationWarning
└── globals.css               # Semantic CSS design tokens for light & dark palettes

components/
├── theme-script.tsx          # Blocking inline script preventing FOUC
└── theme-toggle.tsx          # Accessible reactive theme toggle component with lucide-react icons

lib/
├── theme.ts                  # Shared theme utility functions & storage helpers
└── tokens.ts                 # Authoritative token constants & ThemeMode types
```
