# Implementation Plan: Shift Rehydration & Active Duration Persistence

**Feature**: `079-shift-rehydration`  
**Jira Issue**: [SIAA-79](https://the-three-devsketeers.atlassian.net/browse/SIAA-79)  
**Date**: 2026-10-20  

---

## 1. Component Hierarchy & Boundary Mapping

```text
app/staff/clock/page.tsx (Staff Punch Clock Page Container)
├── useEffect (Non-destructive initial shift rehydration on mount via getStaffAttendanceHistoryAction)
├── useStaffRealtimeShifts (CDC Supabase Realtime synchronization)
├── PunchClockPanel (Shift state presentation and user controls)
│   ├── TerminalLiveClock (Current Manila time display)
│   ├── Dynamic Status Badge (On Shift / On Break / Clocked Out)
│   ├── StaffProfileSwitcher (Operator profile attribution)
│   ├── Primary Punch Buttons (Time In, Time Out, Take Break)
│   └── StaffPinModal (PIN verification modal)
└── AttendanceHistoryTable (Timesheet audit history)
```

---

## 2. File Modification Inventory

| File Path | Action | Rationale |
|:---|:---|:---|
| `lib/store/punch-store.ts` | Modify | 1. Implement non-destructive rehydration logic in `rehydrateShift()`.<br>2. Accurately calculate authoritative elapsed duration from UTC `clock_in`.<br>3. Sync `staffSessions[profileId]` upon rehydration.<br>4. Integrate client-side offline storage cache (`localStorage`) for active shift persistence across reloads.<br>5. Provide `setActiveShiftId(shiftId)` method. |
| `lib/staff/actions.ts` | Modify | Support scoping by optional `profileId` in `getStaffAttendanceHistoryAction(limit, profileId)` to return the authoritative active shift for the active operator. |
| `app/staff/clock/page.tsx` | Modify | Call `getStaffAttendanceHistoryAction(20, currentProfileId)` on mount and perform non-destructive rehydration, ensuring in-memory or cached shifts are preserved if DB query returns null. |
| `components/staff/clock/punch-clock-panel.tsx` | Modify | 1. In `handleClockInPinSuccess`, update `punchStore` with authoritative shift UUID from `clockInShiftAction`.<br>2. In `handleClockOut` and `handleToggleBreak`, pass real `activeShiftId` (removing placeholder UUID `00000000-0000-0000-0000-000000000000`). |
| `lib/store/__tests__/punch-store-realtime.test.ts` | Modify | Add automated unit test coverage for F5 rehydration, dynamic elapsed duration calculation from UTC timestamp, non-destructive hydration guard, and clock-out finalization. |

---

## 3. SWIFT Design Tokens Adherence

- All UI surfaces, badges, and feedback banners strictly utilize SWIFT semantic tokens:
  - `bg-bg-surface`, `bg-bg-card`, `bg-bg-base`, `bg-bg-hover`, `border-border`
  - `text-text-primary`, `text-text-secondary`, `text-text-muted`
  - `bg-success`, `text-success`, `bg-success-light`, `border-success`
  - `bg-accent`, `text-accent`, `bg-accent-light`, `border-accent`
  - `bg-danger`, `text-danger`, `bg-danger-light`, `border-danger`
- Zero hardcoded colors (no raw hex or non-token Tailwind palette classes).

---

## 4. Test Strategy

1. **Rehydration Tests (`punch-store-realtime.test.ts`)**:
   - Rehydrate active shift with dynamic UTC elapsed duration without clock drift.
   - Non-destructive rehydration: Ensure existing active local shift is NOT reset when `rehydrateShift(null)` is called.
   - Break status duration preservation: Break shift duration remains frozen at recorded `duration_seconds`.
   - Multi-staff session rehydration: Rehydrating updates both top-level state and `staffSessions[profileId]`.
   - Clock-out finalization: Ensure `clockOut()` succeeds with real shift ID and marks shift completed.
