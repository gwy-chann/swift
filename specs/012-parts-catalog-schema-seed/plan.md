# Implementation Plan: Supabase Master Parts Catalog Schema, Indexes, RLS & Baseline Seed Data

**Branch**: `feat/SIAA-45-parts-catalog-schema-seed` | **Date**: 2026-10-11 | **Spec**: [`specs/012-parts-catalog-schema-seed/spec.md`](spec.md)

**Input**: Feature specification from `specs/012-parts-catalog-schema-seed/spec.md`

## Summary

Implement the persistent PostgreSQL motorcycle parts catalog foundation for the SWIFT workshop management system:
1. **Database Migration (`supabase/migrations/20261010000000_inventory_products.sql`)**: Create the `public.products` table with UUID primary key, unique `sku`, check constraints for non-negative monetary tiers (`cost`, `wholesale`, `retail`) and stock counts (`stock`, `min_threshold`), nullable `location`, and automated `updated_at` trigger.
2. **High-Speed B-Tree Indexes**: Establish B-tree performance indexes on `sku`, `category`, `brand`, `model`, and `location` to guarantee sub-50ms multi-attribute queries.
3. **Row-Level Security (RLS)**: Enable RLS on `public.products` permitting unrestricted `SELECT` read access for floor terminals and unauthenticated viewers, while restricting `UPDATE` and `DELETE` exclusively to authenticated users possessing the `admin` profile role.
4. **Canonical Baseline Seed Data (`supabase/seed.sql`)**: Seed the 12 canonical motorcycle parts from `mockup/app.js` with exact physical rack/shelf locations and multi-tier pricing, utilizing `ON CONFLICT (sku) DO NOTHING` for idempotency.
5. **Prisma ORM Synchronization**: Synchronize `prisma/schema.prisma` with a 1:1 `Product` model mapping snake_case PostgreSQL columns to TypeScript fields.
6. **Server Component Hydration & Store Integration**: Implement `getProductsAction()` server action to pre-fetch products in `app/admin/inventory/page.tsx`, passing them as `initialProducts` to `<InventoryCatalog />`, and hydrate `InventoryStore` on mount to retain sub-100ms client search and filtering in `CatalogFilterBar`.

## Technical Context

**Language/Version**: SQL (PostgreSQL 15+) / TypeScript 5.x / Next.js 16.3.8 App Router / React 19

**Primary Dependencies**: Supabase CLI, `@supabase/ssr` (v0.12.7), `@supabase/supabase-js` (v2.117.2), Prisma ORM (`@prisma/client`)

**Storage**: PostgreSQL (`public.products` in Supabase database)

**Testing**: Supabase SQL assertions, `supabase db reset`, `npx prisma validate`, TypeScript verification (`tsc --noEmit`), and Vitest unit tests for catalog store hydration

**Target Platform**: PostgreSQL Database (Supabase Cloud & local CLI environment) / Next.js Server Components

**Project Type**: Database Schema, Migrations, Seed Scripts, ORM Definition & UI Hydration

**Performance Goals**: Sub-50ms catalog lookups across indexed fields; sub-100ms interactive client filtering; zero layout shift on initial render

**Constraints**: Strict adherence to SWIFT Constitution (semantic tokens, single source of truth, type-safe data architecture, server-first App Router patterns) and Supabase Postgres best practices (scalar subquery wrapping for `auth.uid()`, explicit `search_path`, no `auth.role()` deprecations)

**Scale/Scope**: 12 baseline canonical motorcycle parts expandable to thousands of workshop catalog SKUs

## Constitution Check

*GATE: Passed in Phase 0; re-evaluated post-design in Phase 1.*

| Principle | Requirement | Assessment | Status |
| :--- | :--- | :--- | :---: |
| **I. Semantic Design Tokens** | UI elements displaying inventory items, stock badges, or shelf locators must strictly use semantic tokens from `app/globals.css` and `lib/tokens.ts`. | Verified. Status badges, shelf locator badges, and table views strictly use `bg-bg-*`, `text-text-*`, and status tokens (`text-success`, `bg-danger-light`). Zero hardcoded hex/RGB values. | **PASS** |
| **II. Single Source of Truth** | Parts data, pricing tiers (retail vs. wholesale), model fitment, and shelf locators must mirror Jira SIAA-45, `mockup/app.js`, and `docs/features.md`. | Verified. The 12 canonical seed parts and their exact rack/shelf coordinates strictly match `mockup/app.js` and `lib/mock-data/products.ts`. | **PASS** |
| **III. Type-Safe Data Architecture** | Schema validation with Prisma and Supabase; explicit TypeScript types for products and categories with zero `any`. | Verified. `Product` model in `prisma/schema.prisma` aligns 1:1 with `public.products`, and TypeScript interface in `lib/types/product.ts` is fully typed. | **PASS** |
| **IV. Test-First Quality** | Repeatable migration, automated seeding, RLS security boundaries, and store hydration verified via test scenarios. | Verified. Step-by-step verification commands codified in `quickstart.md` and automated assertions in `contracts/products-schema.sql`. | **PASS** |
| **V. Server-First & Accessibility** | Products table pre-fetched via Server Component in `app/admin/inventory/page.tsx` with least privilege and hydrated client stores. | Verified. `getProductsAction()` executes on server; client store hydrates on mount for sub-100ms client search with zero waterfall or CLS. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/012-parts-catalog-schema-seed/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research & architectural decisions (Phase 0)
├── data-model.md        # Entity definitions, Prisma mappings & relationships (Phase 1)
├── quickstart.md        # Migration, seed, and RLS verification guide (Phase 1)
├── contracts/           # Database schema contract & seed specification (Phase 1)
│   └── products-schema.sql
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   └── 20261010000000_inventory_products.sql  # SQL migration: products table, indexes, updated_at trigger, RLS
└── seed.sql                                   # Baseline 12-item motorcycle parts seed script

prisma/
└── schema.prisma                              # Updated with Product model mapped to public.products

lib/
├── types/
│   └── product.ts                             # Product TypeScript interface with id & timestamp attributes
├── admin/
│   └── product-actions.ts                     # getProductsAction() server action for catalog pre-fetching
└── store/
    └── inventory-store.ts                     # hydrateProducts() store method for client state hydration

app/admin/inventory/
└── page.tsx                                   # Server Component fetching products and passing to InventoryCatalog

components/admin/inventory/
└── inventory-catalog.tsx                      # Accepts optional initialProducts prop and hydrates store
```

**Structure Decision**: Database migrations and seeding reside in standard `supabase/` directory; ORM contracts reside in `prisma/schema.prisma`; server actions reside in `lib/admin/`; and client state hydration integrates into `lib/store/inventory-store.ts`.

## Complexity Tracking

> No constitution violations detected. Standard Supabase migrations, RLS patterns, Prisma mappings, and Next.js App Router Server Component hydration applied.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
