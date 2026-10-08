# Tasks: Centralized Domain Models & Reactive Mock Data Engine

**Feature**: `Centralized Domain Models & Reactive Mock Data Engine`
**Ticket**: `SIAA-12`
**Spec**: [`specs/005-centralized-domain-models-mock-engine/spec.md`](spec.md)
**Plan**: [`specs/005-centralized-domain-models-mock-engine/plan.md`](plan.md)

---

## Task Breakdown

### Phase 1: TypeScript Domain Model Definitions (`lib/types`)

- [X] **Task 1.1**: Define product, category, inventory, and compatibility types in `lib/types/product.ts`.
- [X] **Task 1.2**: Define flat-rate workshop labor service and bay types in `lib/types/service.ts`.
- [X] **Task 1.3**: Define POS cart item, cart totals, and pricing mode types in `lib/types/cart.ts`.
- [X] **Task 1.4**: Define checkout transaction, payment method, and receipt types in `lib/types/transaction.ts`.
- [X] **Task 1.5**: Define user session, role, and permission types in `lib/types/auth.ts`.
- [X] **Task 1.6**: Define pricing markup rules, stock adjustment logs, audit logs, and punch logs in `lib/types/logs.ts` and `lib/types/pricing.ts`.
- [X] **Task 1.7**: Create aggregated exports in `lib/types/index.ts`.

---

### Phase 2: Canonical Seed Database Extraction (`lib/mock-data`)

- [X] **Task 2.1**: Extract 12 motorcycle parts catalog with exact rack/shelf locators and pricing in `lib/mock-data/products.ts`.
- [X] **Task 2.2**: Extract 6 flat-rate labor services in `lib/mock-data/services.ts`.
- [X] **Task 2.3**: Extract motorcycle models and compatibility data in `lib/mock-data/motorcycles.ts`.
- [X] **Task 2.4**: Extract user personas and markup rules in `lib/mock-data/users.ts` and `lib/mock-data/pricing.ts`.
- [X] **Task 2.5**: Extract sample stock adjustment, audit trail, and shift punch logs in `lib/mock-data/logs.ts`.
- [X] **Task 2.6**: Create unified seed database export in `lib/mock-data/index.ts`.

---

### Phase 3: Reactive Mock Store & POS State Engine (`lib/store`)

- [X] **Task 3.1**: Implement reactive POS cart store (`lib/store/cart-store.ts`) with `useSyncExternalStore` / hook support, retail vs. wholesale recalculation, discount rate engine, and checkout transaction generation.
- [X] **Task 3.2**: Implement mock inventory query & stock adjustment store (`lib/store/inventory-store.ts`) with keyword search, model filtering, and stock decrement.
- [X] **Task 3.3**: Implement mock shift punch clock store (`lib/store/punch-store.ts`) with live duration interval counter, clock in/out toggle, and attendance logs.
- [X] **Task 3.4**: Export aggregated store hooks and utilities in `lib/store/index.ts`.

---

### Phase 4: Verification & Integration Verification

- [X] **Task 4.1**: Execute TypeScript verification (`npx tsc --noEmit`) to confirm zero type errors across `@/lib/types`, `@/lib/mock-data`, and `@/lib/store`.
- [X] **Task 4.2**: Verify seed data integrity (12 parts, 6 services, 5 models, shelf locators) and mathematical accuracy of cart calculations and checkout transactions.
- [X] **Task 4.3**: Commit atomic changes following Conventional Commits format linked to `[SIAA-12]`.
