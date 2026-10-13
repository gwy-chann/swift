# Implementation Plan: Supabase Atomic MotoMatcher Matrix Search RPC & Fitment Verification Engine

**Feature**: `024-motomatcher-matrix-search-rpc`  
**Jira Issue**: [SIAA-54](https://the-three-devsketeers.atlassian.net/browse/SIAA-54) (STORY-4.7)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Architecture & Component Boundary Map

```
┌──────────────────────────────────────────────────────────────────┐
│              Client Layer (Admin & Staff POS Portals)            │
│  - app/admin/motomatcher/ (MotoMatcher Matrix Grid)              │
│  - app/staff/compat/ (Staff Fast-Lane Fitment Lookup)            │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ Calls Server Action
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Server Action & Resilience Layer                 │
│  - lib/motomatcher/actions.ts: getFitmentMatrixAction()         │
│  - specs/.../contracts/motomatcher-matrix.contract.ts            │
│  - Pure TS Fallback Engine (MOCK_PRODUCTS + MOCK_FITMENTS)       │
└──────────────────┬──────────────────────────────┬────────────────┘
                   │ Online                       │ Offline
                   ▼                              ▼
┌──────────────────────────────────────┐  ┌────────────────────────┐
│         Supabase PostgreSQL          │  │ In-Memory Fallback     │
│  - get_moto_matcher_matrix RPC       │  │ (Seed & Mock Data)     │
│  - public.product_fitments join      │  │                        │
│  - Sub-50ms execution                │  │                        │
└──────────────────────────────────────┘  └────────────────────────┘
```

---

## 2. Layered Implementation Units (Atomic Commits Breakdown)

### Unit 1: Specification & Design Artifacts
- **Commit**: `docs(specs): [SIAA-54] add specification, planning, data model, and contract artifacts for motomatcher matrix search rpc`
- **Scope**:
  - `specs/024-motomatcher-matrix-search-rpc/spec.md`
  - `specs/024-motomatcher-matrix-search-rpc/research.md`
  - `specs/024-motomatcher-matrix-search-rpc/data-model.md`
  - `specs/024-motomatcher-matrix-search-rpc/contracts/motomatcher-matrix.contract.ts`
  - `specs/024-motomatcher-matrix-search-rpc/checklists/requirements.md`
  - `specs/024-motomatcher-matrix-search-rpc/plan.md`
  - `specs/024-motomatcher-matrix-search-rpc/quickstart.md`
  - `specs/024-motomatcher-matrix-search-rpc/tasks.md`

### Unit 2: Database Schema & Stored Procedure Migration
- **Commit**: `feat(db): [SIAA-54] add get_moto_matcher_matrix rpc migration with oem-aftermarket partitioning and upsell delta math`
- **Scope**:
  - `supabase/migrations/20261016000000_moto_matcher_matrix_rpc.sql`
  - Grants for `anon`, `authenticated`, `service_role`.
  - Sub-50ms execution with index optimization.

### Unit 3: Domain Models, Business Logic & Automated Tests
- **Commit**: `feat(motomatcher): [SIAA-54] implement getFitmentMatrixAction server action, offline mock engine, and automated tests`
- **Scope**:
  - `lib/motomatcher/actions.ts`: `getFitmentMatrixAction()`
  - Export types and contracts in `lib/types/motomatcher.ts` or re-export from contracts.
  - Test suite in `lib/motomatcher/__tests__/matrix-actions.test.ts`.

### Unit 4: Tasks Completion & Sync
- **Commit**: `docs(specs): [SIAA-54] mark all motomatcher matrix rpc tasks complete and update verification log`
- **Scope**:
  - Check off all tasks in `specs/024-motomatcher-matrix-search-rpc/tasks.md`.

---

## 3. Verification & Acceptance Gate
- `npx tsc --noEmit` passes with 0 errors.
- `npm test` passes 100% of tests.
- Zero hardcoded colors; all badges use SWIFT design tokens.
