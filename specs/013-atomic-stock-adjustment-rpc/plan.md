# Implementation Plan: Supabase Atomic Stock Adjustment RPC & Immutable Audit Ledger

**Branch**: `feat/SIAA-46-atomic-stock-adjustment-rpc` | **Date**: 2026-10-11 | **Spec**: [`specs/013-atomic-stock-adjustment-rpc/spec.md`](spec.md)

**Input**: Feature specification from `specs/013-atomic-stock-adjustment-rpc/spec.md`

## Summary

Implement atomic, zero-floor inventory quantity adjustments and an append-only immutable audit trail for the SWIFT workshop management system:
1. **Database Migration (`supabase/migrations/20261011000000_stock_adjustment_rpc.sql`)**: Create the `public.stock_adjustment_logs` table with UUID primary key, foreign key references to `public.products(sku)` and `auth.users(id)`, before/after stock balances, and creation timestamp.
2. **High-Speed B-Tree Indexes**: Establish B-tree performance indexes on `sku`, `created_at DESC`, and `user_id` to guarantee sub-50ms audit queries and shrinkage reporting.
3. **Append-Only Immutability Enforcement**: Configure PostgreSQL Row-Level Security (RLS) granting only `SELECT` and `INSERT` to authenticated users, explicitly revoking `UPDATE`, `DELETE`, and `TRUNCATE`, reinforced with a database trigger throwing `TAMPER_FORBIDDEN (55000)`.
4. **Atomic RPC Stored Procedure (`public.adjust_product_stock`)**: Provision a `SECURITY DEFINER` PL/pgSQL function executing pessimistic row locking (`FOR UPDATE`), non-negative stock validation (`INSUFFICIENT_STOCK (P0001)`), product quantity mutation, and immutable ledger insertion within a single atomic transaction, extracting operator attribution via `auth.uid()`.
5. **Prisma ORM Synchronization**: Synchronize `prisma/schema.prisma` with a `StockAdjustmentLog` model mapped 1:1 to `public.stock_adjustment_logs` and related to `Product`.
6. **Next.js Server Action (`adjustProductStockAction`)**: Implement a type-safe Server Action in `lib/admin/product-actions.ts` that invokes the Supabase RPC, falling back to mock state in offline/demo mode.
7. **Optimistic UI Wiring & Automatic Rollback**: Connect `StockAdjustmentModal` in `components/admin/inventory/inventory-catalog.tsx` to apply instant (<16ms) optimistic state updates in `InventoryStore`, automatically reverting to the previous count and rendering a danger alert toast if the transaction fails.

## Technical Context

**Language/Version**: SQL (PostgreSQL 15+) / TypeScript 5.x / Next.js 16.3.8 App Router / React 19

**Primary Dependencies**: Supabase CLI, `@supabase/ssr` (v0.12.7), `@supabase/supabase-js` (v2.117.2), Prisma ORM (`@prisma/client`)

**Storage**: PostgreSQL (`public.stock_adjustment_logs`, `public.products`, stored procedure `public.adjust_product_stock` in Supabase)

**Testing**: Vitest unit & integration tests, Supabase SQL assertions, `npx prisma validate`, TypeScript verification (`tsc --noEmit`)

**Target Platform**: PostgreSQL Database (Supabase Cloud & local CLI) / Next.js Server Components & Client Hooks

**Project Type**: Database Migration, PL/pgSQL Stored Procedure, ORM Sync, Server Action & Optimistic UI Wiring

**Performance Goals**: Sub-16ms client optimistic update; sub-100ms RPC execution in PostgreSQL; 100% atomic rollback on stock floor violation

**Constraints**: Strict adherence to SWIFT Constitution (semantic tokens, single source of truth, type-safe data architecture, server-first App Router patterns) and Supabase Postgres best practices (`(select auth.uid())`, explicit `search_path`, append-only RLS)

**Scale/Scope**: High-throughput inventory adjustments across thousands of workshop parts SKUs with zero negative stock anomalies

## Constitution Check

*GATE: Passed in Phase 0; re-evaluated post-design in Phase 1.*

| Principle | Requirement | Assessment | Status |
| :--- | :--- | :--- | :---: |
| **I. Semantic Design Tokens** | UI elements displaying inventory adjustments, toast notifications, badges, or error alerts must strictly use semantic tokens from `app/globals.css` and `lib/tokens.ts`. | Verified. Success and error toasts strictly consume `bg-success-light`, `text-success`, `bg-danger-light`, `text-danger`. Zero hardcoded hex/RGB values. | **PASS** |
| **II. Single Source of Truth** | Inventory workflows, adjustment reasons, pricing tiers, and audit models must mirror Jira SIAA-46, `mockup/app.js`, and `docs/features.md`. | Verified. Adjustment types ('Restock Inbound', 'Damaged Goods', 'Audit Adjustment', 'Shrinkage') and data columns strictly match Jira and mock schemas. | **PASS** |
| **III. Type-Safe Data Architecture** | Schema validation with Prisma and Supabase; explicit TypeScript types for adjustments with zero `any`. | Verified. `StockAdjustmentLog` model in `prisma/schema.prisma` aligns 1:1 with `public.stock_adjustment_logs`, and action contracts are fully typed. | **PASS** |
| **IV. Test-First Quality** | Transaction atomicity, zero-floor rollback (`INSUFFICIENT_STOCK`), immutability, and UI rollback verified via automated tests. | Verified. Step-by-step verification commands codified in `quickstart.md` and Vitest test scenarios planned in test suite. | **PASS** |
| **V. Server-First & Accessibility** | Server Actions for secure database mutations; accessible toast notifications (`role="status"`, `role="alert"`) with zero layout shift. | Verified. `adjustProductStockAction` executes server-side with cookie-based session extraction; UI updates are immediate with ARIA-compliant alert toasts. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/013-atomic-stock-adjustment-rpc/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research & architectural decisions (Phase 0)
├── data-model.md        # Entity definitions, Prisma mappings & relationships (Phase 1)
├── quickstart.md        # Migration, RPC, and optimistic UI verification guide (Phase 1)
├── contracts/           # Database schema contract & action specification (Phase 1)
│   ├── stock-adjustment-rpc.sql
│   └── stock-adjustment-actions.ts
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
supabase/
└── migrations/
    └── 20261011000000_stock_adjustment_rpc.sql  # SQL migration: stock_adjustment_logs table, indexes, RLS, trigger, and adjust_product_stock RPC

prisma/
└── schema.prisma                               # Updated with StockAdjustmentLog model mapped to public.stock_adjustment_logs

lib/
├── types/
│   └── stock-adjustment.ts                     # TypeScript domain interfaces, action payloads, and result types
├── admin/
│   └── product-actions.ts                      # adjustProductStockAction() server action invoking Supabase RPC
└── store/
    └── inventory-store.ts                      # Enhanced adjustStock method supporting optimistic rollback

components/admin/inventory/
├── inventory-catalog.tsx                       # Wires adjustProductStockAction with optimistic UI and automatic rollback
└── stock-adjustment-modal.tsx                  # Interactive dialog capturing adjustment type, units delta, and reason
```

**Structure Decision**: Database migrations reside in `supabase/migrations/`; ORM models reside in `prisma/schema.prisma`; Server Actions reside in `lib/admin/product-actions.ts`; and optimistic UI orchestration resides in `components/admin/inventory/inventory-catalog.tsx`.

## Complexity Tracking

> No constitution violations detected. Standard Supabase migrations, RLS patterns, PL/pgSQL stored procedures, Prisma mappings, and Next.js App Router Server Actions applied.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
