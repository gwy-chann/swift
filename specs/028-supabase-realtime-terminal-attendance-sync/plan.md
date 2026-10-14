# Implementation Plan: Supabase Realtime Terminal Attendance Sync & Multi-Station Shift Engine

**Feature**: Supabase Realtime Terminal Attendance Sync & Multi-Station Shift Engine  
**Feature Branch**: `feat/SIAA-63-supabase-realtime-terminal-attendance-sync`  
**Ticket**: [SIAA-63](https://the-three-devsketeers.atlassian.net/browse/SIAA-63) (STORY-5.8)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5)  

---

## 1. Executive Summary

This feature activates Supabase Realtime Change Data Capture (CDC) replication for the `public.staff_shifts` table and equips the client application with multi-terminal attendance synchronization. It introduces a dedicated `useStaffRealtimeShifts` hook and enhances `PunchStore` with server shift rehydration, sub-500ms multi-terminal event merging, and drift-free elapsed time tracking.

---

## 2. Technical Architecture & File Layout

```text
swift/
├── supabase/
│   └── migrations/
│       └── 20261018000000_staff_shifts_realtime.sql      <-- Migration: Publication & Full Replica Identity
├── lib/
│   ├── contracts/
│   │   └── realtime-attendance.ts                        <-- Contracts & Zod schemas
│   ├── hooks/
│   │   ├── use-staff-realtime-shifts.ts                  <-- Realtime Hook subscribing to staff_shifts_changes
│   │   └── __tests__/
│   │       └── use-staff-realtime-shifts.test.ts         <-- Realtime Hook unit tests
│   ├── store/
│   │   ├── punch-store.ts                                <-- Enhanced store with rehydrateShift & CDC handlers
│   │   └── __tests__/
│   │       └── punch-store-realtime.test.ts              <-- Store rehydration & CDC test suite
│   └── types/
│       └── logs.ts                                       <-- Augmented types if required
└── specs/
    └── 028-supabase-realtime-terminal-attendance-sync/   <-- Full 8-artifact documentation package
```

---

## 3. Design Tokens & Styling Compliance

In compliance with SWIFT Constitution Principle I:
- Active Shift Indicator: `bg-success-light text-success border border-success`
- Break Indicator: `bg-accent-light text-accent border border-accent`
- Completed / Neutral: `bg-bg-muted text-text-muted border border-border`
- Zero hardcoded colors; no arbitrary hex/RGB values.

---

## 4. Test Strategy (TDD)

- **Phase A**: Red tests for `PunchStore.rehydrateShift`, `handleRealtimeShiftInsert`, `handleRealtimeShiftUpdate`, and `getActiveStaffCount`.
- **Phase B**: Green implementation in `lib/store/punch-store.ts`.
- **Phase C**: Red tests for `useStaffRealtimeShifts` hook (subscription lifecycle, payload dispatch, channel cleanup).
- **Phase D**: Green implementation in `lib/hooks/use-staff-realtime-shifts.ts`.
- **Phase E**: SQL migration for `supabase_realtime` publication.
- **Phase F**: Verification via `npm test`, `npx tsc --noEmit`, and `npm run lint`.
