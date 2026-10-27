# Phase 0 Research: Admin Staff Shift Attendance & Time-In/Time-Out History

**Feature**: `099-admin-staff-attendance-history`  
**Date**: 2026-10-25  
**Spec Reference**: [`spec.md`](./spec.md)

## Research Findings & Architecture Decisions

### 1. Route Location & Admin Navigation Integration

- **Decision**: Establish dedicated route at `/admin/attendance` rendered via Next.js App Router Server Component, integrated into the Admin Sidebar under the "Administration" category.
- **Rationale**:
  - The Admin Portal currently organizes views into "Store Intelligence" (`/admin`, `/admin/inventory`, `/admin/pos`, `/admin/history`, `/admin/motomatcher`, `/admin/reports`) and "Administration" (`/admin/users`, `/admin/rates`, `/admin/logs`).
  - Staff attendance tracking directly pertains to personnel supervision, store management, and payroll verification, making "Administration" the authoritative navigation category.
  - Uses `lucide-react`'s `Clock` icon, conforming to Constitution Principle I (Iconography standards).
- **Alternatives Considered**:
  - *Nesting inside `/admin/users` as a secondary tab*: Rejected because attendance auditing is a daily, high-frequency operational activity with distinct filtering and real-time demands; burying it as a sub-tab reduces visibility.
  - *Nesting inside `/admin/reports`*: Rejected because attendance includes live operational controls (monitoring active shifts on duty), not merely retrospective financial reports.

### 2. Data Fetching Architecture & Fallback Resilience

- **Decision**: Create a dedicated Server Action module `lib/admin/attendance-actions.ts` exposing `getAdminStaffAttendanceAction(filterOptions)`.
- **Rationale**:
  - Follows existing admin data fetching patterns (`lib/admin/user-actions.ts`, `lib/admin/stock-audit-actions.ts`, `lib/admin/audit-actions.ts`).
  - Supports multi-tier resolution:
    1. Direct Supabase PostgreSQL query against `public.staff_shifts` with ordering by `clock_in DESC`.
    2. Optional Strangler gateway invocation to Spring Boot's `/api/v1/staff/attendance-history` when enabled.
    3. Comprehensive deterministic mock dataset fallback for offline development and testing.
  - Computes top-level KPI metrics (`currentlyOnShift`, `currentlyOnBreak`, `shiftsCompletedToday`, `totalHoursLoggedToday`) alongside the itemized shift records.
- **Alternatives Considered**:
  - *Direct client-side Supabase query*: Rejected because Constitution Principle V mandates Server-First architecture by default for initial page hydration, SEO, and role-based security validation.

### 3. Active Shift Duration & Midnight Rollover Calculation

- **Decision**: Create a pure, deterministic utility module `lib/admin/attendance-utils.ts` for duration formatting, elapsed time computation, and date formatting.
- **Rationale**:
  - Format requirements: `XXh YYm` (e.g., `08h 15m`).
  - For active shifts without a `clock_out` timestamp, net working time is computed dynamically as:
    $$\text{netDuration} = \max(0, (\text{currentTime} - \text{clockInTime}) - \text{breakDuration})$$
  - Handled cleanly across midnight boundaries using standard epoch millisecond arithmetic (ISO UTC timestamps), completely avoiding timezone rollover bugs.
  - Flags anomalous shifts exceeding 16 continuous hours with an "Extended Shift / Needs Review" warning tag.
- **Alternatives Considered**:
  - *Relying only on database-stored `duration_seconds`*: Rejected because in-progress (`on_shift` or `break`) records have `duration_seconds: null` until clock-out. A client-side or computed helper is required for live updates.

### 4. Semantic Design Token & Theming Adherence

- **Decision**: Implement all UI elements exclusively with semantic design tokens defined in `app/globals.css` and `lib/tokens.ts`.
- **Rationale**:
  - Fulfills Constitution Principle I (Zero Hardcoded Colors).
  - Status Badge Token Mappings:
    - `On Shift`: `bg-success/15 text-success border border-success/30`
    - `Break`: `bg-accent/15 text-accent border border-accent/30`
    - `Completed`: `bg-bg-subtle text-text-muted border border-border-subtle`
    - `Extended Shift`: `bg-danger/15 text-danger border border-danger/30`
  - Table backgrounds, card containers, and typography use `bg-bg-card`, `border-border-subtle`, `text-text-primary`, and `text-text-muted`.

### 5. Multi-Dimensional Filter State Management

- **Decision**: Manage filter state (Search Query, Status Filter, Date Range Presets, Staff Member Selector) in the client component with URL search parameters synchronization (`useSearchParams`, `useRouter`, or local state for instantaneous filtering).
- **Rationale**:
  - Allows instant client-side filtering over the loaded shift batch (< 50ms response) while enabling full dataset queries for broader historical ranges.
  - Preset filters include: "Today", "Yesterday", "Last 7 Days", "Last 30 Days", and "All Time".
- **Alternatives Considered**:
  - *Full server roundtrip for every keystroke in search*: Rejected because it introduces unnecessary latency and database load when client-side sub-filtering of the loaded batch is instant.
