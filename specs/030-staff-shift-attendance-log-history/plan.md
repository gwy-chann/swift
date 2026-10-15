# Technical Plan: Staff Shift Attendance Log History & Timesheet Tracking

**Feature**: `specs/030-staff-shift-attendance-log-history`  
**Feature Branch**: `feat/SIAA-30-staff-shift-attendance-log-history`  
**Jira Ticket**: [SIAA-30](https://the-three-devsketeers.atlassian.net/browse/SIAA-30)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5)  

---

## 1. Executive Summary & Objective

Elevate the staff shift attendance logging experience on `/staff/clock` by delivering a dedicated, accessible, and reactive `AttendanceHistoryTable` component matching `#view-staff-clock` in `../mockup/staff.html`. The table itemizes past and active shifts with exact timestamps, calculates dynamic shift durations (e.g., `08h 59m`), displays `-- Active Shift --` with accent warning cues during ongoing work, sorts entries in reverse chronological order, and enforces zero hardcoded colors using SWIFT semantic design tokens.

---

## 2. Component Hierarchy & Architectural Boundaries

```
app/staff/clock/page.tsx (Client Component / Terminal Clock Page)
 ├── Active Shift Clock Card (Punch Clock Panel & Duration Counter)
 └── AttendanceHistoryTable (components/staff/clock/attendance-history-table.tsx)
      ├── Table Header: Title ("My Attendance & Shift Log History") + Terminal Label ("Terminal #01")
      ├── Responsive Table Container (overflow-x-auto)
      │    ├── <thead> Columns: Date, Staff Name, Time-In, Time-Out, Shift Duration, Status
      │    └── <tbody> Itemized Shift Rows
      │         ├── Date Cell (Formatted YYYY-MM-DD + "(Today)" annotation)
      │         ├── Staff Name Cell
      │         ├── Time-In Cell (font-mono text-text-secondary)
      │         ├── Time-Out Cell (Active: "-- Active Shift --" in text-accent; Closed: font-mono text-text-secondary)
      │         ├── Duration Cell (font-mono font-bold text-text-primary)
      │         └── Status Badge (Active: bg-success-light text-success; Closed: bg-bg-muted text-text-secondary; Break: bg-accent-light text-accent)
      └── Empty State (When punchLogs array is empty)
```

---

## 3. SWIFT Semantic Design Tokens Mapping

| Component Area | Semantic Utility Class | Notes |
| :--- | :--- | :--- |
| Outer Card Panel | `bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden` | Standard card surface |
| Card Header | `p-4 border-b border-border flex items-center justify-between` | Header dividing line |
| Header Icon / Title | `text-primary`, `text-text-primary uppercase tracking-wider text-xs font-bold` | Brand accent icon with high-contrast text |
| Terminal Indicator | `text-xs text-text-muted font-mono` | Station label |
| Table Header Row | `bg-bg-base/60 text-text-muted font-bold border-b border-border` | Subtle base contrast |
| Row Hover | `hover:bg-bg-hover transition-colors` | Visual feedback on terminal touch/click |
| Active Time-Out | `text-accent font-semibold` | Visual warning without hardcoded hex |
| "On Shift" Badge | `bg-success-light text-success border border-success/20` | Semantic status for ongoing work |
| "Completed" Badge | `bg-bg-muted text-text-secondary border border-border` | Neutral badge for finalized shifts |
| "Break" Badge | `bg-accent-light text-accent border border-accent/20` | Accent badge for meal/rest breaks |

---

## 4. Test Strategy

Following the **Test-First Quality & Contract Verification** principle:
1. Create `components/staff/clock/__tests__/attendance-history-table.test.tsx`:
   - **Test 1**: Verify table renders with all 6 columns: Date, Staff Name, Time-In, Time-Out, Shift Duration, Status.
   - **Test 2**: Verify active shift displays `-- Active Shift --` and green `On Shift` badge.
   - **Test 3**: Verify completed shift displays formatted clock-out time, computed duration `XXh YYm`, and neutral `Completed` badge.
   - **Test 4**: Verify entries are sorted in reverse chronological order with current date marked as `(Today)`.
   - **Test 5**: Verify graceful empty state rendering when no records exist.
2. Verify all existing tests pass (`npm test`).
3. Verify type correctness (`npm run typecheck`).
4. Verify linting (`npm run lint`).
