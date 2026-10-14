# Implementation Plan: Supabase Atomic Shift Punch RPCs & Concurrency Guards

**Branch**: `feat/SIAA-61-atomic-shift-punch-rpcs` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)  
**Jira Ticket**: [SIAA-61](https://the-three-devsketeers.atlassian.net/browse/SIAA-61) (STORY-5.7)  

---

## Summary

Implement atomic PostgreSQL stored procedures (`clock_in_shift`, `clock_out_shift`, `toggle_shift_break`) with database-level concurrency guards, unique partial indexes, server-enforced duration calculations, and an immutable attendance audit ledger (`staff_shift_audit_logs`) protected by an anti-tamper trigger. Wire client-side error interception in `lib/store/punch-store.ts` to cleanly catch `ACTIVE_SHIFT_EXISTS` and surface user-friendly alerts.

---

## Technical Context

- **Language/Version**: TypeScript 5.x, PostgreSQL 15+ (Supabase)
- **Primary Dependencies**: Supabase PostgREST client, Zod, React 19, Next.js App Router
- **Storage**: Supabase PostgreSQL (`public.staff_shifts`, `public.staff_shift_audit_logs`, `public.profiles`)
- **Testing**: Vitest (`npm test`)
- **Performance Goals**: Sub-50ms RPC execution, 0% race condition leakage
- **Constraints**: Strict UTC server time enforcement, immutable audit records, zero hardcoded colors in client notifications

---

## Constitution Check

- [x] **I. Semantic Design Tokens & Zero Hardcoded Colors**: Error toast and notification styling strictly consume SWIFT design tokens (`bg-danger`, `text-danger`, etc.).
- [x] **II. Single Source of Truth & Specification Fidelity**: Adheres to SIAA-61 acceptance criteria, EPIC-5 requirements, and mockup patterns.
- [x] **III. Type-Safe Data Architecture**: Fully typed contracts in `lib/contracts/punch-clock-rpcs.ts` and synced Prisma schema.
- [x] **IV. Test-First Quality & Contract Verification**: Vitest unit tests verifying input validation, duration calculation, and store error guards.
- [x] **V. Server-First Performance**: Stored procedures execute inside PostgreSQL transactions with row locking and index acceleration.

---

## Project Structure & Planned Changes

```text
swift/
├── supabase/migrations/
│   └── 20261017000000_staff_shift_punch_rpcs.sql   # SQL migration with RPCs, audit table, anti-tamper trigger, indexes
├── prisma/
│   └── schema.prisma                               # Prisma model sync for StaffShiftAuditLog and indexes
├── lib/
│   ├── contracts/
│   │   └── punch-clock-rpcs.ts                     # Zod input schemas, result interfaces, error constants
│   └── store/
│       └── punch-store.ts                          # Wire error handler for ACTIVE_SHIFT_EXISTS
├── test/
│   ├── punch-clock-contracts.test.ts               # Unit test for contracts, schemas, duration formatting
│   └── punch-store-guard.test.ts                   # Unit test for punchStore error handling & toast interception
└── specs/027-atomic-shift-punch-rpcs/
    ├── spec.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    ├── contracts/
    │   └── punch-clock-rpcs.ts
    ├── checklists/
    │   └── requirements.md
    ├── plan.md
    └── tasks.md
```
