# Implementation Plan: Centralized Domain Models & Reactive Mock Data Engine

**Branch**: `feat/SIAA-12-domain-models-mock-engine` | **Date**: 2026-10-07 | **Updated**: 2026-10-08 | **Spec**: [`specs/005-centralized-domain-models-mock-engine/spec.md`](spec.md)

**Input**: Feature specification from `specs/005-centralized-domain-models-mock-engine/spec.md`

## Summary

Implement the foundational TypeScript domain data layer and reactive mock data engine for SWIFT:
1. Complete, strictly typed TypeScript domain models in `lib/types/` for `Product`, `ProductCategory`, `LaborService`, `MotorcycleModel`, `CompatibilityRule`, `CartItem`, `CartTotals`, `PricingMode`, `Transaction`, `PricingRules`, `UserSession`, `StockAdjustmentLog`, `AuditLog`, and `PunchLog`.
2. Authoritative seed database in `lib/mock-data/` extracting all 12 motorcycle parts (with exact physical shelf locators, costs, retail/wholesale markups, OEM flags, and fitments), 6 flat-rate workshop services, 5 motorcycle models, 4 user personas, markup rules, and realistic audit/stock logs directly from `mockup/app.js`.
3. High-performance, reactive mock store in `lib/store/` (powered by React `useSyncExternalStore` / Observable Store Pattern) providing live Fast-Lane POS cart state management (line item calculations, retail vs. wholesale pricing tier switching, discounts, transaction checkout), inventory lookups, shelf location queries, stock decrements, and shift punch recording.
4. Comprehensive unit test suites and verification scripts to ensure 100% calculation accuracy and type safety.

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16.3.8 App Router / React 19.2.8

**Primary Dependencies**: React 19, TypeScript 5, Lucide React

**State Management**: Reactive in-memory store with `useSyncExternalStore` (Observable pattern) ensuring zero hydration mismatch and sub-millisecond updates

**Testing**: Unit tests, TypeScript validation (`npx tsc --noEmit`), calculation precision checks

**Target Platform**: Next.js App Router (Server & Client Components)

**Performance Goals**: <5ms cart calculation updates, 0ms latency for in-memory stock lookups, zero `any` types

**Constraints**: Strict adherence to domain definitions in `mockup/app.js`, `docs/features.md`, and SWIFT Constitution (Principle III: Type-Safe Data Architecture & Domain Integrity).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Assessment | Status |
| :--- | :--- | :--- | :---: |
| **I. Semantic Design Tokens** | UI badges, status indicators, and locator highlights in consumers must use semantic token utilities. | Verified. Domain entities output semantic status/category tokens. | **PASS** |
| **II. Single Source of Truth** | All seed data, motorcycle models, labor rates, and pricing rules derived directly from `mockup/app.js` and `docs/features.md`. | Verified. 100% fidelity with mockup schemas. | **PASS** |
| **III. Type-Safe Data Architecture** | Full TypeScript interfaces with zero `any` types, strict null-checks, and typed relationships (including `Transaction`). | Verified. Defined in `lib/types/index.ts`. | **PASS** |
| **IV. Test-First Quality** | Cart line item math, wholesale/retail switching, discount calculations, and receipt checkout covered with verification scenarios. | Verified. Test cases defined in `quickstart.md`. | **PASS** |
| **V. Server-First & Accessibility** | Types and mock data exportable cleanly for both SSR and client hooks. | Verified. Isomorphic exports without client-only leaks. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/005-centralized-domain-models-mock-engine/
├── plan.md              # Implementation plan (this file)
├── research.md          # Domain model analysis and state management patterns (Phase 0)
├── data-model.md        # TypeScript interfaces and entity relationship diagrams (Phase 1)
├── quickstart.md        # Test scenarios and usage verification guide (Phase 1)
├── contracts/           # Store and API contract definitions (Phase 1)
│   └── store.ts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Implementation tasks (Phase 2 output)
```

### Source Code (repository root)

```text
lib/
├── types/
│   ├── index.ts              # Aggregated domain model exports
│   ├── product.ts            # Product, category, fitment, and inventory types
│   ├── service.ts            # Flat-rate labor service & bay types
│   ├── cart.ts               # POS cart item, totals, and pricing mode types
│   ├── transaction.ts        # Completed checkout transaction and receipt types
│   ├── auth.ts               # UserSession, UserRole, and permission types
│   ├── pricing.ts            # Markup rules configuration types
│   └── logs.ts               # Audit logs, stock adjustments, and shift punch types
├── mock-data/
│   ├── index.ts              # Centralized seed data exports
│   ├── products.ts           # 12 motorcycle parts with shelf locators & pricing
│   ├── services.ts           # 6 flat-rate labor services
│   ├── motorcycles.ts        # 5 motorcycle models & fitment matrices
│   ├── users.ts              # 4 user accounts with roles & permissions
│   ├── pricing.ts            # Global retail, wholesale, aftermarket markup rules
│   └── logs.ts               # Sample stock adjustment, audit, and punch logs
└── store/
    ├── index.ts              # Aggregated store exports & custom React hooks
    ├── cart-store.ts         # Reactive POS cart state engine, calculations & checkout
    ├── inventory-store.ts    # Reactive mock inventory lookup & stock adjustment engine
    └── punch-store.ts        # Reactive shift punch clock engine
```
