# Tasks: Supabase Atomic Shift Punch RPCs & Concurrency Guards

**Input**: Design documents from `/specs/027-atomic-shift-punch-rpcs/`  
**Prerequisites**: `spec.md`, `research.md`, `data-model.md`, `contracts/punch-clock-rpcs.ts`, `plan.md`  
**Jira Ticket**: [SIAA-61](https://the-three-devsketeers.atlassian.net/browse/SIAA-61) (STORY-5.7)  

---

## Phase 1: Setup & Domain Contracts

**Purpose**: Establish type-safe contracts, Zod schemas, error types, and project contracts for punch RPCs.

- [ ] T001 Export TypeScript schemas, interfaces, and error classes in `lib/contracts/punch-clock-rpcs.ts`
- [ ] T002 Reconcile and export helper utilities for duration formatting and error code mapping in `lib/contracts/punch-clock-rpcs.ts`

---

## Phase 2: Database Migration & Schema Foundations

**Purpose**: Provision immutable audit ledger, unique partial index, and anti-tamper triggers in PostgreSQL.

- [ ] T003 Create migration `supabase/migrations/20261017000000_staff_shift_punch_rpcs.sql` with table `public.staff_shift_audit_logs`, foreign keys, and RLS policies
- [ ] T004 Add anti-tamper trigger function `public.prevent_staff_shift_audit_tampering()` and trigger on `public.staff_shift_audit_logs`
- [ ] T005 Create unique partial index `idx_staff_shifts_one_active_per_employee` on `public.staff_shifts(profile_id)` where `status IN ('on_shift', 'break')`
- [ ] T006 Synchronize Prisma schema in `prisma/schema.prisma` with `StaffShiftAuditLog` model and index definitions

---

## Phase 3: User Story 1 - Atomic Clock-In RPC with Concurrency Guard (Priority: P1) 🎯 MVP

**Goal**: Atomic `public.clock_in_shift()` stored procedure preventing double punches.

- [ ] T007 Implement `public.clock_in_shift(p_terminal_id TEXT, p_notes TEXT)` stored procedure in migration file with caller auth resolution, active shift validation, row insertion, and `clock_in` audit log generation
- [ ] T008 Add unit tests in `test/punch-clock-rpcs.test.ts` validating `clock_in_shift` contract inputs, success responses, and `ACTIVE_SHIFT_EXISTS` exception handling

---

## Phase 4: User Story 2 - Atomic Clock-Out RPC & Duration Calculation (Priority: P1)

**Goal**: Atomic `public.clock_out_shift()` stored procedure with server-enforced duration computation.

- [ ] T009 Implement `public.clock_out_shift(p_shift_id UUID, p_notes TEXT)` in migration file with ownership/admin check, row locking (`FOR UPDATE`), server epoch duration computation, `status = 'completed'`, and `clock_out` audit log generation
- [ ] T010 Add unit tests in `test/punch-clock-rpcs.test.ts` verifying `clock_out_shift` duration calculation formula and formatted string output (`HHh MMm`)

---

## Phase 5: User Story 3 - Break Toggle Transition (Priority: P2)

**Goal**: Atomic `public.toggle_shift_break()` stored procedure for active shift break cycles.

- [ ] T011 Implement `public.toggle_shift_break(p_shift_id UUID)` in migration file with status toggling between `'on_shift'` and `'break'`, and recording `break_start` / `break_end` audit events
- [ ] T012 Add unit tests in `test/punch-clock-rpcs.test.ts` verifying break toggle transitions and rejecting completed shifts

---

## Phase 6: User Story 4 - Immutable Attendance Audit Ledger (Priority: P2)

**Goal**: Complete anti-tamper validation and RLS permissions on attendance audit logs.

- [ ] T013 Grant explicit API permissions and RLS policies for `public.staff_shift_audit_logs` in migration file
- [ ] T014 Add verification assertions ensuring direct updates or deletes to `staff_shift_audit_logs` are rejected with `TAMPER_FORBIDDEN`

---

## Phase 7: User Story 5 - Client-Side Store Guard & Concurrency Error Alerts (Priority: P3)

**Goal**: Intercept `ACTIVE_SHIFT_EXISTS` in `lib/store/punch-store.ts` and dispatch clean user alerts.

- [ ] T015 Update `lib/store/punch-store.ts` to support error interception, active shift conflict detection, and user-friendly error state tracking
- [ ] T016 Add unit tests in `test/punch-store-guard.test.ts` validating store error handling and notification emission for `ACTIVE_SHIFT_EXISTS`

---

## Phase 8: Verification & Quality Gates

**Purpose**: Execute end-to-end typechecks, test suites, and knowledge graph synchronization.

- [ ] T017 Execute static analysis and type verification: `npm run typecheck`
- [ ] T018 Execute full test suite: `npm test`
- [ ] T019 Trigger `graphify-auto-sync` (`graphify . --update`)
