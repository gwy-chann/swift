# Tasks: Global Light/Dark Theme Mode with Zero-Hydration-Flicker Persistence

**Feature Branch**: `feat/SIAA-11-theme-mode-persistence`
**Spec**: [`specs/004-theme-mode-zero-flicker/spec.md`](spec.md) | **Plan**: [`specs/004-theme-mode-zero-flicker/plan.md`](plan.md)

## Tasks Overview

- [x] **Task 1**: Implement shared theme utility helpers (`lib/theme.ts`) with theme storage keys, document class manipulation, and snapshot getters <!-- id: TASK-001 -->
- [x] **Task 2**: Create the zero-hydration-flicker blocking script component (`components/theme-script.tsx`) <!-- id: TASK-002 -->
- [x] **Task 3**: Update `app/layout.tsx` to include `suppressHydrationWarning`, `<head>` blocking script, and ensure zero hydration mismatch <!-- id: TASK-003 -->
- [x] **Task 4**: Upgrade `components/theme-toggle.tsx` with `lucide-react` icons (`Sun`, `Moon`), accessible ARIA attributes, and reactive cross-tab synchronization <!-- id: TASK-004 -->
- [x] **Task 5**: Verify semantic CSS variables in `app/globals.css` and `lib/tokens.ts` for 100% theme coverage <!-- id: TASK-005 -->
- [x] **Task 6**: Verify typecheck (`tsc --noEmit`), linting (`npm run lint`), build (`npm run build`), and zero-flicker reload across all portals <!-- id: TASK-006 -->
