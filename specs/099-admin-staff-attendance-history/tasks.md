# Tasks: Admin Staff Shift Attendance & Time-In/Time-Out History

**Feature**: `099-admin-staff-attendance-history`  
**Date**: 2026-10-25  
**Spec Reference**: [`spec.md`](./spec.md) | **Plan**: [`plan.md`](./plan.md) | **Data Model**: [`data-model.md`](./data-model.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Register navigation items, establish TypeScript types, and provide deterministic mock fixtures.

- [X] T001 Register "Staff Attendance" navigation item with `Clock` icon in `swift/lib/admin/navigation.ts`
- [X] T002 [P] Define `AdminStaffShift`, `AttendanceSummaryMetrics`, and `AttendanceFilterState` types in `swift/lib/types/logs.ts`
- [X] T003 [P] Create deterministic multi-employee mock shift fixtures in `swift/lib/admin/mock-data/attendance-mock.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core calculation utilities, data access actions, and base page structure.

⚠️ **CRITICAL**: Complete this foundation before user story UI components are implemented.

- [X] T004 [P] Implement duration arithmetic, midnight rollover handling, and date formatting in `swift/lib/admin/attendance-utils.ts`
- [X] T005 [P] Unit tests for duration calculation and formatting in `swift/lib/admin/__tests__/attendance-utils.test.ts`
- [X] T006 Implement server action `getAdminStaffAttendanceAction()` supporting Supabase and mock fallback in `swift/lib/admin/attendance-actions.ts`
- [X] T007 [P] Unit tests for `getAdminStaffAttendanceAction` in `swift/lib/admin/__tests__/attendance-actions.test.ts`
- [X] T008 Create base page Server Component and layout wiring in `swift/app/admin/attendance/page.tsx`

**Checkpoint**: Core calculation logic, server action contracts, and base route ready.

---

## Phase 3: User Story 1 - Centralized Staff Attendance History Ledger (Priority: P1) 🎯 MVP

**Goal**: Store administrators can navigate to `/admin/attendance` and view an itemized, reverse-chronological table of past and active staff shifts showing employee name, role, date, time-in, time-out, duration, terminal, and status.

**Independent Test**: Navigate to `/admin/attendance` in the browser or execute component test. Verify that the table renders all columns with correctly formatted timestamps and durations.

### Tests for User Story 1
- [X] T009 [P] [US1] Component unit test for attendance ledger table rendering in `swift/components/admin/__tests__/attendance-ledger-table.test.ts`

### Implementation for User Story 1
- [X] T010 [P] [US1] Create itemized attendance ledger table component with semantic tokens in `swift/components/admin/attendance/attendance-ledger-table.tsx`
- [X] T011 [US1] Create main attendance dashboard container component in `swift/components/admin/attendance/attendance-view.tsx`
- [X] T012 [US1] Wire `attendance-view.tsx` into Server Component `swift/app/admin/attendance/page.tsx`
- [X] T013 [US1] Verify sidebar navigation active state and mobile drawer routing in `swift/components/admin/admin-sidebar.tsx` and `swift/components/admin/admin-mobile-drawer.tsx`

**Checkpoint**: At this point, User Story 1 is fully functional and delivers the core attendance viewing MVP.

---

## Phase 4: User Story 2 - Real-Time Active Shift Tracking & On-Duty Status (Priority: P1)

**Goal**: Prominently display active shifts (`-- Active Shift --`) with dynamic elapsed time tracking, distinctive "On Shift" / "Break" / "Completed" status badges, extended shift warnings (>16h), and a manual/automatic refresh button.

**Independent Test**: Have an employee clock in on `/staff/clock`. Verify that their shift immediately appears at the top of `/admin/attendance` with an active status badge and live elapsed duration.

### Tests for User Story 2
- [X] T014 [P] [US2] Component unit test for active shift indicators and live duration timer in `swift/components/admin/__tests__/active-shift-badge.test.ts`

### Implementation for User Story 2
- [X] T015 [US2] Implement active shift status badges, live elapsed duration timer, and extended shift warning (>16h) in `swift/components/admin/attendance/attendance-ledger-table.tsx`
- [X] T016 [US2] Implement manual revalidation refresh button with loading spinner in `swift/components/admin/attendance/attendance-view.tsx`
- [X] T017 [US2] Connect terminal shift transition revalidation to refresh admin ledger upon clock-out in `swift/components/admin/attendance/attendance-view.tsx`

**Checkpoint**: User Story 1 and User Story 2 both operate independently and in synergy.

---

## Phase 5: User Story 3 - Multi-Dimensional Search, Staff Filter & Date Range Selection (Priority: P2)

**Goal**: Empower administrators to filter shifts by staff name search, shift status dropdown, employee selector, and date presets ("Today", "Yesterday", "Last 7 Days", "Last 30 Days", "All Time") with an instant Reset button and clean empty state.

**Independent Test**: Apply search term "Mike", select "On Shift", and choose "Today". Verify that only matching shifts render; clicking "Reset Filters" restores all records.

### Tests for User Story 3
- [X] T018 [P] [US3] Unit test for search, status, and date range filtering logic in `swift/lib/admin/__tests__/attendance-filter.test.ts`

### Implementation for User Story 3
- [X] T019 [P] [US3] Create filter bar component with search input, status dropdown, date presets, and reset button in `swift/components/admin/attendance/attendance-filter-bar.tsx`
- [X] T020 [US3] Integrate filter state and reactive subset computation in `swift/components/admin/attendance/attendance-view.tsx`
- [X] T021 [US3] Implement accessible empty state with "Reset Filters" button in `swift/components/admin/attendance/attendance-ledger-table.tsx`

**Checkpoint**: Filtering and search function with zero lag (< 50ms response time).

---

## Phase 6: User Story 4 - High-Level Shift Attendance Summary & Operational Metrics (Priority: P3)

**Goal**: Display executive summary KPI cards at the top of the attendance page summarizing Active Staff On Duty, On Break, Completed Today, and Total Hours Worked Today.

**Independent Test**: Load `/admin/attendance` and verify that the 4 top summary cards display accurate counts and hours matching the underlying shift data.

### Tests for User Story 4
- [X] T022 [P] [US4] Unit test for summary metrics aggregation in `swift/lib/admin/__tests__/attendance-kpis.test.ts`

### Implementation for User Story 4
- [X] T023 [P] [US4] Create summary KPI card grid component with semantic design tokens in `swift/components/admin/attendance/attendance-kpi-cards.tsx`
- [X] T024 [US4] Wire summary KPI cards into `swift/components/admin/attendance/attendance-view.tsx`

**Checkpoint**: All 4 user stories are fully implemented, verified, and integrated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Design tokens verification, accessibility compliance, end-to-end quickstart validation, and regression tests.

- [X] T025 [P] Verify 100% adherence to SWIFT semantic design tokens and dark/light mode zero flicker across all attendance components
- [X] T026 [P] Audit WCAG AA accessibility (table headers, ARIA labels, keyboard focus rings) in `swift/components/admin/attendance/attendance-ledger-table.tsx`
- [X] T027 Execute end-to-end verification scenarios per `swift/specs/099-admin-staff-attendance-history/quickstart.md`
- [X] T028 Run TypeScript typecheck (`npx tsc --noEmit`) and Jest test suite

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1: Setup (T001-T003)
          │
          ▼
Phase 2: Foundational (T004-T008) ──► BLOCKS ALL USER STORIES
          │
          ├───────────────────────────┬───────────────────────────┐
          ▼                           ▼                           ▼
Phase 3: US1 Ledger (T009-T013)  Phase 4: US2 Real-Time    Phase 5: US3 Filters
       [MVP Core]                    (T014-T017)                (T018-T021)
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      ▼
                        Phase 6: US4 KPIs (T022-T024)
                                      │
                                      ▼
                        Phase 7: Polish (T025-T028)
```

### User Story Dependencies

- **User Story 1 (P1)**: Can begin immediately after Phase 2 (Foundational). Has no dependencies on other stories.
- **User Story 2 (P1)**: Extends User Story 1 components (`attendance-ledger-table.tsx`) with active status indicators and live timer.
- **User Story 3 (P2)**: Integrates filter controls into `attendance-view.tsx` to filter the table rendered in User Story 1.
- **User Story 4 (P3)**: Mounts KPI summary cards atop `attendance-view.tsx` using metrics computed in foundational utilities.

### Parallel Opportunities

- **Setup Phase**: T002 and T003 can execute in parallel.
- **Foundational Phase**: T004, T005, and T007 can execute in parallel.
- **User Story 1**: T009 (test) and T010 (table component) can execute in parallel.
- **User Story 2**: T014 (test) can run in parallel with foundational updates.
- **User Story 3**: T018 (test) and T019 (filter bar) can execute in parallel.
- **User Story 4**: T022 (test) and T023 (KPI cards) can execute in parallel.
- **Polish Phase**: T025, T026, and T027 can execute in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`navigation.ts`, types, fixtures).
2. Complete Phase 2: Foundational (duration math, server action, base page).
3. Complete Phase 3: User Story 1 (itemized shift table).
4. **Validate MVP**: Browse to `/admin/attendance` and verify all staff shift records render with exact times and durations.

### Incremental Delivery

1. Foundation ready (Phases 1 & 2).
2. Deliver MVP: Reverse-chronological shift history table (User Story 1).
3. Deliver Real-Time Active Shift Tracking & Live Timer (User Story 2).
4. Deliver Multi-Dimensional Filtering & Search Bar (User Story 3).
5. Deliver High-Level KPI Summary Cards (User Story 4).
6. Polish tokens, accessibility, and run quickstart verification (Phase 7).
