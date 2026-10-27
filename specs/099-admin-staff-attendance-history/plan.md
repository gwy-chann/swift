# Implementation Plan: Admin Staff Shift Attendance & Time-In/Time-Out History

**Branch**: `099-admin-staff-attendance-history` | **Date**: 2026-10-25 | **Spec**: [`spec.md`](./spec.md)

**Input**: Feature specification from `/specs/099-admin-staff-attendance-history/spec.md`

## Summary

Build a dedicated, high-visibility Staff Attendance & Time-In/Time-Out History page in the SWIFT Admin Portal (`/admin/attendance`) integrated into the Admin navigation menu. The page delivers an authoritative, itemized shift history ledger showing employee names, roles, exact time-in and time-out timestamps, calculated shift durations (`XXh YYm`), terminal stations, and lifecycle status badges (`On Shift`, `Break`, `Completed`). It includes real-time active shift tracking (`-- Active Shift --`), multi-dimensional search/filtering (by staff member, status, and date range presets), and executive summary KPI cards (Active On Duty, On Break, Completed Today, Total Hours Worked).

---

## Technical Context

**Language/Version**: TypeScript 5.8+ / Node.js 20+ LTS  
**Primary Dependencies**: Next.js 15 (App Router, React 19), Tailwind CSS v4, Lucide React (`Clock`, `Calendar`, `Search`, `Filter`, `RefreshCw`, `AlertCircle`, `CheckCircle2`), Supabase Client (`@supabase/supabase-js`, `@supabase/ssr`)  
**Storage**: PostgreSQL (`public.staff_shifts` table with `public.profiles` foreign key relationship), with mock baseline fallback for offline resilience  
**Testing**: Jest (`@testing-library/react`, `@testing-library/jest-dom`, `ts-jest`)  
**Target Platform**: Responsive Web (Admin Portal desktop view 1024px+ and tablet drawer)  
**Project Type**: Full-stack Next.js web application (Server Component + interactive Client leaves)  
**Performance Goals**: Page initial render < 2s; client filter / search updates < 50ms; duration calculations instantaneous  
**Constraints**: Zero hardcoded color utilities (100% adherence to SWIFT semantic design tokens in `app/globals.css` and `lib/tokens.ts`); strict WCAG AA contrast and keyboard accessibility  
**Scale/Scope**: Displaying up to hundreds of historical shifts with client-side batching and server pagination  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I: Semantic Design Tokens & Zero Hardcoded Colors (NON-NEGOTIABLE)**
  - All table rows, status badges, summary cards, and controls consume semantic tokens (`bg-bg-card`, `border-border-subtle`, `text-text-primary`, `bg-success/15`, `text-success`, `bg-accent/15`, `text-accent`, etc.).
  - Zero hardcoded hex, RGB, or default Tailwind palette classes used.
- [x] **Principle II: Single Source of Truth & Specification Fidelity**
  - Navigation fits canonical Admin menu structure (`lib/admin/navigation.ts`).
  - Shift statuses (`on_shift`, `break`, `completed`) and table columns strictly match specification requirements and `public.staff_shifts` schema.
- [x] **Principle III: Type-Safe Data Architecture & Domain Integrity**
  - All interfaces (`AdminStaffShift`, `AttendanceSummaryMetrics`, `AttendanceFilterState`) explicitly typed with strict TypeScript. Zero `any` types.
- [x] **Principle IV: Test-First Quality & Contract Verification**
  - Comprehensive unit and component tests covering duration math, midnight rollover, filter combinations, and empty/error states.
- [x] **Principle V: Server-First Performance & Accessibility Standards**
  - Route `/admin/attendance/page.tsx` implemented as a Server Component fetching initial shift records.
  - Interactive leaves (`AttendanceView`, `AttendanceTable`, `AttendanceFilterBar`, `AttendanceKpiCards`) handle client state.
  - Semantic HTML (`<table>`, `<thead>`, `<tbody>`, `<button>`, `<input>`) with descriptive ARIA attributes and keyboard navigable controls.

*Post-Design Evaluation*: All gates **PASS** without any constitutional violations or compromises.

---

## Project Structure

### Documentation (this feature)

```text
specs/099-admin-staff-attendance-history/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 architecture research and decisions
├── data-model.md        # Phase 1 data models and TypeScript types
├── quickstart.md        # Phase 1 quickstart and verification runbook
├── contracts/           # Phase 1 interface contracts
│   └── admin-attendance-contract.ts
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code (repository root)

```text
swift/
├── app/
│   └── admin/
│       └── attendance/
│           └── page.tsx                         # Dedicated Admin Attendance Page (Server Component)
├── components/
│   └── admin/
│       ├── admin-sidebar.tsx                    # Updated navigation sidebar
│       └── attendance/
│           ├── attendance-view.tsx              # Main interactive attendance dashboard container
│           ├── attendance-kpi-cards.tsx         # Top summary metrics (Active, Break, Completed, Hours)
│           ├── attendance-filter-bar.tsx        # Search, status dropdown, date presets & reset
│           └── attendance-ledger-table.tsx      # Reverse chronological itemized shift table
├── lib/
│   ├── admin/
│   │   ├── navigation.ts                        # Added "Staff Attendance" item to ADMIN_NAV_ITEMS
│   │   ├── attendance-actions.ts                # Server action getAdminStaffAttendanceAction()
│   │   ├── attendance-utils.ts                  # Pure utilities: duration math, formatting, filters
│   │   └── mock-data/
│   │       └── attendance-mock.ts               # Authoritative deterministic shift fixtures
│   └── types/
│       └── logs.ts                              # Exported DbStaffShift and PunchLog models
└── lib/admin/__tests__/
    ├── attendance-actions.test.ts               # Server action & data retrieval tests
    └── attendance-utils.test.ts                 # Duration calculation & filter tests
```

**Structure Decision**:
Follows the established Next.js App Router and SWIFT Admin portal architecture. Reuses `lib/admin/navigation.ts` for sidebar registration, isolates business and data access logic into `lib/admin/attendance-actions.ts` and `lib/admin/attendance-utils.ts`, and organizes UI into modular components under `components/admin/attendance/`.

---

## Complexity Tracking

> *No constitutional violations. Table left blank.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A |
