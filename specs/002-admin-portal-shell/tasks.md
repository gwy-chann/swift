# Implementation Tasks: Admin Portal Navigation Shell & Collapsible Sidebar

**Feature**: Admin Portal Navigation Shell & Collapsible Sidebar ([SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9))
**Branch**: `feat/SIAA-9-admin-portal-shell` | **Date**: 2026-10-06
**Specification**: [`specs/002-admin-portal-shell/spec.md`](spec.md) | **Plan**: [`specs/002-admin-portal-shell/plan.md`](plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish navigation interfaces, badge schemas, and centralized route registry.

- [X] T001 Create admin navigation types, badge schemas, and user profile interfaces in `lib/admin/types.ts`
- [X] T002 [P] Implement authoritative admin menu registry and route title mapping in `lib/admin/navigation.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Session logout server action and reusable navigation menu components.

**⚠️ CRITICAL**: No layout or view construction can begin until this foundational phase is complete.

- [X] T003 Implement `logoutAction` session termination handler in `lib/auth/actions.ts`
- [X] T004 [P] Create reusable `NavMenuItem` component with active indicator and badge support in `components/admin/nav-menu-item.tsx`

**Checkpoint**: Core navigation definitions and menu link components ready.

---

## Phase 3: User Story 1 - Full Module Navigation & Active View Highlighting (Priority: P1) 🎯 MVP

**Goal**: Enable store administrators to access the persistent dark sidebar with categorized menu groups and active view highlighting.

**Independent Test**: Load `/admin`, click sidebar links (Inventory, POS, MotoMatcher, Reports, Users, Rates, Logs), and verify URL transitions with instant active pill highlighting.

### Implementation for User Story 1

- [X] T005 [US1] Create desktop `AdminSidebar` component with brand header and categorized navigation in `components/admin/admin-sidebar.tsx`
- [X] T006 [US1] Create admin root layout shell connecting sidebar and content viewport in `app/admin/layout.tsx`
- [X] T007 [US1] Build Admin Dashboard overview page with 4 KPI stat cards and layout structure in `app/admin/page.tsx`
- [X] T008 [P] [US1] Create module placeholder views for `/admin/inventory`, `/admin/pos`, `/admin/motomatcher`, `/admin/reports`, `/admin/users`, `/admin/rates`, and `/admin/logs` in `app/admin/`

**Checkpoint**: Core desktop navigation and admin sub-views are functional and testable independently.

---

## Phase 4: User Story 2 - Admin Topbar & Store Operational Status (Priority: P1)

**Goal**: Display dynamic view titles, live terminal status badge `[ONLINE] Terminal #01`, and portal switching controls in the topbar.

**Independent Test**: Verify topbar title matches the active route, inspect the `[ONLINE]` status badge, and click "Switch to Staff Portal" to navigate to `/staff/pos`.

### Implementation for User Story 2

- [X] T009 [US2] Implement `AdminTopbar` with dynamic view title, terminal status badge, and "Switch to Staff Portal" action in `components/admin/admin-topbar.tsx`
- [X] T010 [US2] Wire topbar and sidebar into the orchestrator component in `components/admin/admin-layout-shell.tsx`

**Checkpoint**: Topbar status and portal switcher fully functional.

---

## Phase 5: User Story 3 - User Profile Display & Admin Logout (Priority: P2)

**Goal**: Render the administrator profile badge in the sidebar footer and provide a 1-click logout action.

**Independent Test**: View the user avatar, name (`Carlos Rodriguez` / `System Admin`) in sidebar footer, click "Log Out Account", and confirm session cookies clear and route redirects to `/login`.

### Implementation for User Story 3

- [X] T011 [US3] Implement user profile footer with avatar initials, role badge, and 1-click logout action in `components/admin/admin-sidebar.tsx`

**Checkpoint**: Profile display and session logout fully verified.

---

## Phase 6: User Story 4 - Responsive Navigation & Mobile Drawer (Priority: P3)

**Goal**: Adapt the navigation sidebar into a slide-out drawer on viewports under 768px with a hamburger toggle and touch backdrop.

**Independent Test**: Resize viewport < 768px, click the hamburger toggle button in the topbar, verify drawer slides open, and click the backdrop or links to dismiss.

### Implementation for User Story 4

- [X] T012 [US4] Implement `AdminMobileDrawer` slide-out navigation drawer with backdrop overlay in `components/admin/admin-mobile-drawer.tsx`
- [X] T013 [US4] Connect mobile hamburger toggle button and drawer state in `components/admin/admin-layout-shell.tsx`

**Checkpoint**: Mobile drawer operates smoothly across mobile and tablet viewports.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Design tokens audit, accessibility compliance, and verification.

- [X] T014 [P] Audit dark slate sidebar tokens (`bg-bg-sidebar`) and WCAG AA contrast across themes in `components/admin/`
- [X] T015 Run automated verification checks (`npx tsc --noEmit` and `npm run lint`) and execute quickstart scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — blocks layout construction.
- **User Story 1 (Phase 3 - MVP)**: Depends on Phase 2.
- **User Story 2 (Phase 4)**: Depends on Phase 3 layout.
- **User Story 3 (Phase 5)**: Depends on Phase 2 `logoutAction` and Phase 3 sidebar.
- **User Story 4 (Phase 6)**: Depends on Phase 3 & 4 layout shell.
- **Polish (Phase 7)**: Runs after all user story implementations.

### Parallel Opportunities

- `T001` and `T002` can run in parallel.
- `T004` (`NavMenuItem`) and `T003` (`logoutAction`) can run in parallel.
- `T008` (placeholder sub-views) can be created in parallel with `T007`.
- `T014` (token audit) can run alongside final verification.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Implement Phase 3 (User Story 1: Desktop Sidebar & Dashboard Overview).
3. Validate module navigation on `http://localhost:3000/admin`.

### Incremental Delivery
1. Add User Story 2 (Topbar & Status Indicators).
2. Add User Story 3 (Profile Footer & 1-Click Logout).
3. Add User Story 4 (Mobile Slide-Out Drawer).
4. Run full Polish and verification checks.
