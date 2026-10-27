# Phase 1 Data Model: Admin Staff Shift Attendance & Time-In/Time-Out History

**Feature**: `099-admin-staff-attendance-history`  
**Date**: 2026-10-25  
**Spec Reference**: [`spec.md`](./spec.md)

## Entity Relationship Overview

```text
+------------------------------------+          +------------------------------------+
|          public.profiles           |          |        public.staff_shifts         |
+------------------------------------+          +------------------------------------+
| id (UUID, PK)                      |<----+    | id (UUID, PK)                      |
| email (VARCHAR)                    |     +----| profile_id (UUID, FK)              |
| full_name (VARCHAR)                |          | staff_name (VARCHAR)               |
| role (VARCHAR: admin/cashier/etc.) |          | terminal_id (VARCHAR)              |
+------------------------------------+          | clock_in (TIMESTAMPTZ)             |
                                                | clock_out (TIMESTAMPTZ, NULLABLE)  |
                                                | duration_seconds (INT, NULLABLE)   |
                                                | status (on_shift|break|completed)  |
                                                | notes (TEXT, NULLABLE)             |
                                                | created_at / updated_at            |
                                                +------------------------------------+
```

---

## TypeScript Domain Definitions

### 1. `AdminStaffShift` (Enriched Attendance Shift Record)

Represents an individual attendance record presented on the admin ledger:

```typescript
export type ShiftStatus = 'on_shift' | 'break' | 'completed';

export interface AdminStaffShift {
  /** Unique shift identifier (UUID) */
  id: string;

  /** Reference to employee profile ID */
  profileId: string;

  /** Full display name of the staff member */
  staffName: string;

  /** Role of the staff member (e.g., "Cashier", "Floor Staff", "Mechanic", "Store Manager") */
  staffRole?: string;

  /** Terminal or register hardware identifier where shift was initiated */
  terminalId: string;

  /** Shift date in ISO string format (YYYY-MM-DD) */
  date: string;

  /** Whether the shift took place on the current calendar day */
  isToday: boolean;

  /** Formatted wall-clock time in (e.g., "08:00:15 AM" or "08:00 AM") */
  timeIn: string;

  /** ISO 8601 UTC timestamp of clock in */
  clockInIso: string;

  /** Formatted wall-clock time out, or "-- Active Shift --" if currently on shift */
  timeOut: string;

  /** ISO 8601 UTC timestamp of clock out, or null if open */
  clockOutIso: string | null;

  /** Total elapsed / completed working duration string (e.g., "08h 15m") */
  duration: string;

  /** Raw net duration in seconds */
  durationSeconds: number;

  /** Current lifecycle status */
  status: ShiftStatus;

  /** Display label for status ("On Shift", "Break", "Completed") */
  statusLabel: 'On Shift' | 'Break' | 'Completed';

  /** Warning flag if shift has exceeded 16 hours without clock-out */
  isExtendedShift: boolean;

  /** Optional notes or administrative annotations */
  notes?: string | null;
}
```

### 2. `AttendanceSummaryMetrics` (Operational Shift KPIs)

Represents the aggregated daily staffing overview:

```typescript
export interface AttendanceSummaryMetrics {
  /** Total number of employees currently clocked in and active */
  currentlyOnShift: number;

  /** Total number of employees currently on meal or rest break */
  currentlyOnBreak: number;

  /** Total number of shifts concluded and completed today */
  shiftsCompletedToday: number;

  /** Aggregate formatted hours worked across all completed/active shifts today (e.g., "34h 45m") */
  totalHoursLoggedToday: string;

  /** Total shifts matching current query filters */
  totalRecordsCount: number;
}
```

### 3. `AttendanceFilterState` (Admin Query Filter Criteria)

Represents parameters used to filter the attendance history ledger:

```typescript
export type DatePreset = 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'custom';

export interface AttendanceFilterState {
  /** Free-text search term matching employee name, role, or terminal ID */
  searchQuery: string;

  /** Filter by shift status ('all' | 'on_shift' | 'break' | 'completed') */
  statusFilter: 'all' | ShiftStatus;

  /** Selected date range preset */
  datePreset: DatePreset;

  /** Optional custom start date boundary (YYYY-MM-DD) */
  startDate?: string;

  /** Optional custom end date boundary (YYYY-MM-DD) */
  endDate?: string;

  /** Optional filter targeting a specific staff profile ID */
  selectedStaffId?: string;
}
```

### 4. `AdminAttendanceResponse` (Server Action Contract)

```typescript
export interface AdminAttendanceResponse {
  success: boolean;
  shifts: AdminStaffShift[];
  metrics: AttendanceSummaryMetrics;
  totalCount: number;
  error?: string;
}
```

---

## State Transition Lifecycle

```text
[Employee Clocks In]
        │
        ▼
   ( ON_SHIFT )  ──► Time-Out: "-- Active Shift --" | Duration: Live elapsed
        │   ▲
[Break] │   │ [Resume]
        ▼   │
    ( BREAK )    ──► Time-Out: "-- Active Shift --" | Duration: Paused/Break time tracked
        │
        ▼ [Shift End Punch]
  ( COMPLETED )  ──► Time-Out: "HH:MM:SS AM/PM"    | Duration: Finalized "XXh YYm"
```
