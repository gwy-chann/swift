# Implementation Tasks: Supabase Realtime Terminal Attendance Sync & Multi-Station Shift Engine

**Feature**: Supabase Realtime Terminal Attendance Sync & Multi-Station Shift Engine  
**Ticket**: [SIAA-63](https://the-three-devsketeers.atlassian.net/browse/SIAA-63) (STORY-5.8)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5)  
**Branch**: `feat/SIAA-63-supabase-realtime-terminal-attendance-sync`  

---

## Task Matrix

- [x] **TASK-1.1**: Define contracts & Zod schemas for Realtime attendance events and hooks in `lib/contracts/realtime-attendance.ts`
- [x] **TASK-1.2**: Author SQL migration `supabase/migrations/20261018000000_staff_shifts_realtime.sql` enabling publication in `supabase_realtime` and setting `REPLICA IDENTITY FULL`
- [x] **TASK-2.1**: Author unit test suite `lib/store/__tests__/punch-store-realtime.test.ts` asserting rehydration, drift-free elapsed calculation, and CDC event handling
- [x] **TASK-2.2**: Implement `rehydrateShift`, `handleRealtimeShiftInsert`, `handleRealtimeShiftUpdate`, and `getActiveStaffCount` in `lib/store/punch-store.ts`
- [x] **TASK-3.1**: Author unit test suite `lib/hooks/__tests__/use-staff-realtime-shifts.test.ts` for channel subscription, status transitions, and unmount cleanup
- [x] **TASK-3.2**: Implement `useStaffRealtimeShifts` in `lib/hooks/use-staff-realtime-shifts.ts` subscribing to `staff_shifts_changes`
- [x] **TASK-4.1**: Execute automated test verification (`npm test`), TypeScript verification (`npx tsc --noEmit`), and lint check (`npm run lint`)
- [x] **TASK-4.2**: Execute atomic commits, push branch, and open Pull Request
