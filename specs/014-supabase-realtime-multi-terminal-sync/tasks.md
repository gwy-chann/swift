# Implementation Tasks: Supabase Realtime Multi-Terminal Sync & Low-Stock Alerts Engine

**Feature**: Supabase Realtime Multi-Terminal Sync & Low-Stock Alerts Engine ([SIAA-48](https://the-three-devsketeers.atlassian.net/browse/SIAA-48))  
**Branch**: `feat/SIAA-48-supabase-realtime-multi-terminal-sync` | **Date**: 2026-10-11  
**Specification**: [`specs/014-supabase-realtime-multi-terminal-sync/spec.md`](spec.md) | **Plan**: [`specs/014-supabase-realtime-multi-terminal-sync/plan.md`](plan.md)  

---

## Phase 1: Setup & Foundational (Database Publication & Contracts)

**Purpose**: Register `public.products` with Supabase Realtime and establish TypeScript contracts for Realtime payloads.

- [ ] T001 Create database migration registering `public.products` in `supabase_realtime` publication and enabling `REPLICA IDENTITY FULL` in `supabase/migrations/20261011010000_enable_realtime_products.sql`
- [ ] T002 Define Realtime database row interfaces and event payload types in `lib/types/realtime.ts`

**Checkpoint**: Database migration ready to broadcast `postgres_changes` on `public.products`.

---

## Phase 2: Domain Engine & Store Synchronization (Priority: P1)

**Purpose**: Provide domain payload mapping and store mutation capabilities to update products reactively.

- [ ] T003 Implement `mapRealtimeDbProductToProduct` converter mapping snake_case PostgreSQL rows to camelCase `Product` domain models in `lib/inventory/realtime-mapper.ts`
- [ ] T004 Implement `updateProduct` method on `InventoryStore` in `lib/store/inventory-store.ts` updating products immutably and notifying subscribers
- [ ] T005 [TDD] Create automated test suite verifying `mapRealtimeDbProductToProduct` and `inventoryStore.updateProduct` reactivity in `lib/inventory/__tests__/realtime-sync.test.ts`

**Checkpoint**: Unit tests pass; `inventoryStore` reacts immediately to incoming product updates.

---

## Phase 3: Custom Realtime Hook & UI Wiring (Priority: P1)

**Purpose**: Subscribe to Supabase Realtime `postgres_changes`, integrate hook with `InventoryCatalog`, and enable reactive low-stock alerts.

- [ ] T006 Implement custom React hook `useInventoryRealtime` managing channel lifecycle and store updates in `lib/hooks/use-inventory-realtime.ts`
- [ ] T007 Integrate `useInventoryRealtime` inside `InventoryCatalog` in `components/admin/inventory/inventory-catalog.tsx`
- [ ] T008 Verify dynamic `StockBadge` status toggle and low-stock notification triggers upon threshold breach in `components/admin/inventory/inventory-catalog.tsx`

**Checkpoint**: Real-time multi-terminal stock updates and automatic low-stock alerts active on UI.

---

## Phase 4: Convergence & Verification

**Purpose**: Full regression suite validation, TypeScript strictness, and knowledge graph sync.

- [ ] T009 Run TypeScript typecheck (`npx tsc --noEmit`) to verify 0 type errors
- [ ] T010 Run automated test suite (`npm test`) to ensure 100% test pass rate
- [ ] T011 Run `graphify . --update` to synchronize AST knowledge graph
