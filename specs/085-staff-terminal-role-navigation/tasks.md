# Implementation Tasks: Staff Terminal Role-Aware Navigation & Route View Guards

**Feature**: `085-staff-terminal-role-navigation`  
**Jira Issue**: [SIAA-85](https://the-three-devsketeers.atlassian.net/browse/SIAA-85)  
**Parent Epic**: [SIAA-77](https://the-three-devsketeers.atlassian.net/browse/SIAA-77)  
**Date**: 2026-10-20  

---

## Phase 1: Contracts & Type Definitions

- [x] **TASK-001**: Extend `StaffNavItem` with `allowedRoles?: DbUserRole[]` in `lib/staff/types.ts`.
- [x] **TASK-002**: Update `lib/staff/navigation.ts`:
  - Annotate `STAFF_NAV_ITEMS` with explicit `allowedRoles` for each navigation item.
  - Implement and export `filterNavItemsByRole(items, role)`.
  - Implement and export `getRolePrimaryRoute(role)` and `ROLE_ROUTE_CONFIG`.

---

## Phase 2: Unit Tests (TDD - Red Phase)

- [x] **TASK-003**: Create comprehensive unit tests in `lib/staff/__tests__/staff-navigation-rbac.test.ts`:
  - Test `filterNavItemsByRole` for Mechanic (sees `clock`, `compat`, `search`; hides `pos`, `history`, `pricecheck`).
  - Test `filterNavItemsByRole` for Inventory Clerk (sees `clock`, `search`, `pricecheck`; hides `pos`, `history`, `compat`).
  - Test `filterNavItemsByRole` for Cashier & Admin (sees all 6 items).
  - Test `filterNavItemsByRole` fallback when role is undefined or unrecognized.
  - Test `getRolePrimaryRoute` for mechanic (`/staff/compat`), inventory clerk (`/staff/search`), and fallback (`/staff/clock`).
  - Test `ROLE_ROUTE_CONFIG` completeness across all canonical user roles.

---

## Phase 3: Component Implementation & Reactive Wiring

- [x] **TASK-004**: Adapt `StaffSidebar` in `components/staff/staff-sidebar.tsx`:
  - Retrieve `currentStaff` and `currentStaffRole` from `usePunchStore()`.
  - Filter `STAFF_NAV_ITEMS` using `filterNavItemsByRole(STAFF_NAV_ITEMS, currentStaffRole)`.
  - Dynamically render active staff member name, role title, and avatar initials in footer.
- [x] **TASK-005**: Update `StaffTopbar` in `components/staff/staff-topbar.tsx`:
  - Guard quick-access POS cart indicator to only render for `currentStaffRole === 'cashier' || currentStaffRole === 'admin'`.

---

## Phase 4: Route Guard & Redirection

- [x] **TASK-006**: Implement route guard in `app/staff/pos/page.tsx`:
  - Check `currentStaffRole` on mount and role changes.
  - If role is not `cashier` or `admin`, redirect via `router.replace` using `getRolePrimaryRoute`.
  - Show informative toast notification (e.g. *"Redirected: Your profile is scoped to workshop repair tools."*).
  - Render an accessible redirecting banner state during redirection to eliminate UI flicker.
  - Propagate redirect notification to `/staff/compat` and `/staff/search` via `sessionStorage` toast handler.

---

## Phase 5: Verification & Verification Suite

- [x] **TASK-007**: Run automated test suite:
  - `node --env-file=.env.local --experimental-strip-types --test "lib/staff/__tests__/staff-navigation-rbac.test.ts"` (12/12 passing)
  - `npm test` (639/639 tests passing)
  - `npx tsc --noEmit` (0 errors)
  - `npm run lint` (0 errors)
- [x] **TASK-008**: Update knowledge graph via `graphify` and execute atomic commits according to `.agents/rules/atomic-commit.md`.
