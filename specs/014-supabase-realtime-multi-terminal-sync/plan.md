# Implementation Plan: Supabase Realtime Multi-Terminal Sync & Low-Stock Alerts Engine

**Branch**: `feat/SIAA-48-supabase-realtime-multi-terminal-sync` | **Date**: 2026-10-11 | **Spec**: [`specs/014-supabase-realtime-multi-terminal-sync/spec.md`](spec.md)

**Input**: Feature specification from `specs/014-supabase-realtime-multi-terminal-sync/spec.md`

## Summary

Implement instant multi-terminal stock level propagation and reactive low-stock alert badges across all connected terminals using Supabase Realtime:
1. **Database Migration (`supabase/migrations/20261011010000_enable_realtime_products.sql`)**: Register `public.products` in the PostgreSQL `supabase_realtime` publication (`ALTER PUBLICATION supabase_realtime ADD TABLE public.products;`) and configure `REPLICA IDENTITY FULL` so updates broadcast full previous and new row context.
2. **Domain Converter Utility (`lib/inventory/realtime-mapper.ts`)**: Build a type-safe mapper that converts raw PostgreSQL snake_case payloads (`min_threshold`, `image_url`, `created_at`, `updated_at`, etc.) into canonical camelCase `Product` domain models with numeric casting.
3. **Store Method (`InventoryStore.updateProduct`)**: Extend `InventoryStore` in `lib/store/inventory-store.ts` with an `updateProduct(partialProduct)` method that updates existing products immutably and notifies subscribers (`this.notify()`).
4. **Custom Realtime Hook (`useInventoryRealtime`)**: Implement `lib/hooks/use-inventory-realtime.ts` subscribing to `postgres_changes` on `public.products`, transforming payloads, dispatching to `inventoryStore.updateProduct`, and cleaning up channel subscriptions on unmount.
5. **Component Wiring (`InventoryCatalog`)**: Initialize `useInventoryRealtime()` inside `components/admin/inventory/inventory-catalog.tsx`, enabling real-time synchronization so that `CatalogTable`, `InventoryStatsCards`, and `StockBadge` automatically reflect updates without manual refresh.
6. **Low-Stock Alerting & Feedback**: Ensure `StockBadge` dynamically toggles to amber/danger status (`bg-danger-light text-danger`) upon threshold breach, and display a non-intrusive toast alert when a part drops into low stock.
7. **Verification & Tests**: Add automated tests covering payload transformation, store update reactivity, and threshold transitions.

## Technical Context

**Language/Version**: SQL (PostgreSQL 15+) / TypeScript 5.x / Next.js 16.3.8 App Router / React 19

**Primary Dependencies**: `@supabase/ssr` (v0.12.7), `@supabase/supabase-js` (v2.117.2), `lucide-react`

**Storage**: PostgreSQL (`public.products` publication registration in Supabase)

**Testing**: Node test runner (`npm test`), TypeScript verification (`tsc --noEmit`), ESLint (`npm run lint`)

**Target Platform**: Next.js App Router Client Components & PostgreSQL Supabase Realtime Engine

**Performance Goals**: Sub-500ms broadcast from database commit to client re-render; 0 full-page reloads; 100% memory leak prevention via clean channel teardown.

**Constraints**: Strict adherence to SWIFT Design Tokens (`app/globals.css`, `lib/tokens.ts`, zero hardcoded colors) and Supabase Postgres best practices.

## Constitution Check

*GATE: Passed in Phase 0; re-evaluated post-design in Phase 1.*

| Principle | Requirement | Assessment | Status |
| :--- | :--- | :--- | :---: |
| **I. Semantic Design Tokens** | UI elements displaying inventory counts, alert badges, and status toasts must strictly use semantic tokens from `app/globals.css` and `lib/tokens.ts`. | Verified. Status badges consume `bg-success-light`, `text-success`, `bg-danger-light`, `text-danger`. Zero hardcoded hex/RGB values. | **PASS** |
| **II. Single Source of Truth** | Inventory schemas, product attributes, and realtime events must mirror Jira SIAA-48, `mockup/app.js`, and `docs/features.md`. | Verified. Domain product fields and publication rules strictly align with Jira SIAA-48. | **PASS** |
| **III. Type-Safe Data Architecture** | Full type safety on Supabase Realtime payloads, database rows, and store updates with zero untyped `any`. | Verified. Strict TypeScript interfaces for `DbProductPayload` and `Product`. | **PASS** |
| **IV. Test-First Quality** | Store reactivity, payload mapping, and threshold badge toggles verified via automated test suite. | Verified. Automated tests for mapper, store, and threshold status. | **PASS** |
| **V. Server-First & Accessibility** | Realtime hook cleanly unmounts channels; alert badges use ARIA status roles (`role="status"`, `aria-label`). | Verified. Accessible `StockBadge` with screen-reader context; proper channel lifecycle. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/014-supabase-realtime-multi-terminal-sync/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research & architectural decisions (Phase 1)
├── data-model.md        # Realtime publication, payload types & domain models (Phase 1)
├── quickstart.md        # Verification scenarios & validation guide (Phase 1)
├── checklists/
│   └── requirements.md  # Quality gate checklist (Phase 1)
├── contracts/           # Database migration & TypeScript contracts (Phase 1)
│   ├── realtime-product.ts
│   └── realtime-migration.sql
└── tasks.md             # Ordered task breakdown (Phase 2)
```

### Source Code Modifications

```text
supabase/migrations/
└── 20261011010000_enable_realtime_products.sql   # Realtime publication & replica identity

lib/
├── inventory/
│   ├── realtime-mapper.ts                       # Database row to Product domain mapper
│   └── __tests__/
│       └── realtime-mapper.test.ts              # Unit tests for mapper & store update
├── store/
│   ├── inventory-store.ts                       # Add updateProduct method
│   └── __tests__/
│       └── inventory-store.test.ts              # Store update & notification tests
└── hooks/
    └── use-inventory-realtime.ts                # Realtime subscription hook

components/admin/inventory/
└── inventory-catalog.tsx                        # Wire useInventoryRealtime hook
```
