# Tasks: Staff Shop Floor Terminal Layout Shell

**Feature Branch**: `feat/SIAA-10-staff-terminal-layout-shell`
**Spec**: [`specs/003-staff-terminal-shell/spec.md`](spec.md) | **Plan**: [`specs/003-staff-terminal-shell/plan.md`](plan.md)

## Tasks Overview

- [x] **Task 1**: Create staff navigation definitions and data schemas (`lib/staff/navigation.ts`, `lib/staff/types.ts`) <!-- id: TASK-001 -->
- [x] **Task 2**: Implement staff UI building blocks: <!-- id: TASK-002 -->
  - `components/staff/staff-nav-item.tsx`
  - `components/staff/shift-duration-timer.tsx`
  - `components/staff/admin-switch-modal.tsx`
- [x] **Task 3**: Implement staff shell components: <!-- id: TASK-003 -->
  - `components/staff/staff-sidebar.tsx`
  - `components/staff/staff-topbar.tsx`
  - `components/staff/staff-mobile-drawer.tsx`
  - `components/staff/staff-layout-shell.tsx`
- [x] **Task 4**: Create staff App Router layout and pages: <!-- id: TASK-004 -->
  - `app/staff/layout.tsx`
  - `app/staff/page.tsx` (redirect / POS fast view)
  - `app/staff/pos/page.tsx`
  - `app/staff/search/page.tsx`
  - `app/staff/compat/page.tsx`
  - `app/staff/pricecheck/page.tsx`
  - `app/staff/clock/page.tsx`
- [x] **Task 5**: Verify build, typecheck, lint, and browser interactions <!-- id: TASK-005 -->
