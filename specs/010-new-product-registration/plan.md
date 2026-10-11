# Implementation Plan: New Product Registration with Automated Markup & Location Assignment

**Branch**: `feat/SIAA-16-new-product-registration` | **Date**: 2026-10-11 | **Spec**: [specs/010-new-product-registration/spec.md](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/specs/010-new-product-registration/spec.md)

**Input**: Feature specification from `/specs/010-new-product-registration/spec.md` (Jira: `SIAA-16`)

---

## Summary

Implement an interactive, validated product registration modal dialog (`<ProductRegistrationModal>`) and domain calculation engine (`lib/inventory/product-registration.ts`) for store administrators and inventory managers. The feature supports comprehensive part intake, real-time dynamic wholesale (+18%) and retail (+35% OEM vs +40% Aftermarket) markup auto-calculations with manual overrides, case-insensitive SKU duplicate collision detection, immediate catalog insertion, and dual audit logging (initial inbound stock movement in `stockAdjustmentLogs` and product creation record in `auditLogs`).

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: React 19, Next.js 15 (App Router), Tailwind CSS v4, `lucide-react`, `useSyncExternalStore`  
**Storage**: In-memory reactive state (`inventoryStore`), mock product catalog (`MOCK_PRODUCTS`), prepared for Supabase PostgreSQL RPC & table persistence downstream  
**Testing**: Node.js Native Test Runner (`npm test`) with `--experimental-strip-types`  
**Target Platform**: Responsive Web (Admin Portal `/admin/inventory`, shop floor tablets, desktop workstations)  
**Project Type**: Full-stack Next.js web application  
**Performance Goals**: Pure markup calculation `< 1ms`, modal open/close response `< 16ms`, reactive catalog update `< 50ms` without page reloads  
**Constraints**: Zero hardcoded colors (100% SWIFT semantic tokens), case-insensitive SKU uniqueness, WCAG AA contrast ratio (> 4.5:1), accessible modal dialog semantics  
**Scale/Scope**: 12+ catalog categories, 6+ motorcycle models, 1 modal component, 1 domain utility module, dedicated test suite  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Evaluation Notes |
| :--- | :---: | :--- |
| **I. Semantic Design Tokens & Zero Hardcoded Colors** | **PASS** | Modal and form controls use `bg-bg-surface`, `bg-bg-input`, `bg-primary`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-danger`. Zero arbitrary hex/RGB colors. |
| **II. Single Source of Truth & Specification Fidelity** | **PASS** | Directly reflects `../mockup/admin.html` (lines 625–720), `../mockup/app.js` (lines 480–575), `docs/features.md`, and Jira `SIAA-16` acceptance criteria. |
| **III. Type-Safe Data Architecture & Domain Integrity** | **PASS** | Full TypeScript safety using contracts in `contracts/product-registration-contracts.ts` and `lib/types/product.ts`; strict typing on input payloads and audit logs; zero `any` types. |
| **IV. Test-First Quality & Contract Verification** | **PASS** | Dedicated unit test suite in `lib/inventory/__tests__/product-registration.test.ts` verifying markup auto-calculation, SKU normalization, collision detection, and validation boundaries. |
| **V. Server-First Performance & Accessibility Standards** | **PASS** | Domain math isolated in `lib/inventory/product-registration.ts`. Interactive client boundary confined to `<ProductRegistrationModal>`. Dialog semantics satisfy WAI-ARIA standards (`role="dialog"`, `aria-modal="true"`, `Escape` listener). |

---

## Project Structure

### Documentation (this feature)

```text
specs/010-new-product-registration/
├── plan.md              # This implementation plan
├── research.md          # Phase 0 output: Technical decisions, rationale & alternatives
├── data-model.md        # Phase 1 output: Entities, dynamic pricing matrix & lifecycle
├── quickstart.md        # Phase 1 output: Automated commands & browser validation steps
├── contracts/
│   └── product-registration-contracts.ts # Phase 1 output: TypeScript contracts & interfaces
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
lib/
├── inventory/
│   ├── product-registration.ts            # Pure markup calculator, SKU normalizer & validator
│   └── __tests__/
│       └── product-registration.test.ts   # Unit tests covering markup rules, collisions & validation
├── store/
│   └── inventory-store.ts                 # Store action registerProduct with unshifting and dual audit logging
components/
└── admin/
    └── inventory/
        ├── product-registration-modal.tsx # Accessible interactive registration dialog
        ├── catalog-filter-bar.tsx         # Filter toolbar displaying "+ Add Part" button trigger
        └── inventory-catalog.tsx          # Main catalog orchestrator coordinating modal & state
```

**Structure Decision**: Clean architectural separation following SWIFT standards. Pure calculation logic in `lib/inventory/product-registration.ts`, centralized application state in `lib/store/inventory-store.ts`, and interactive UI presentation in `components/admin/inventory/product-registration-modal.tsx`.

---

## Architectural Strategy & Phased Implementation Breakdown

The implementation is decomposed into 3 architectural units following the atomic commit guideline:

### Unit 1: Domain Models, Business Logic & Pure Calculation Engine
- **Files**: `lib/inventory/product-registration.ts`, `lib/inventory/__tests__/product-registration.test.ts`
- **Scope**:
  - `calculateMarkupPrices(cost, isOem, rules)` computing wholesale and retail prices with 2 decimal precision.
  - `normalizeSku(sku)` trimming whitespace and converting to uppercase.
  - `validateProductRegistration(input, existingSkus)` enforcing case-insensitive uniqueness and non-negative numbers.
  - Comprehensive unit test suite with 100% branch coverage.

### Unit 2: Interactive Modal Presentation Layer
- **Files**: `components/admin/inventory/product-registration-modal.tsx`
- **Scope**:
  - Accessible dialog (`role="dialog"`, `aria-modal="true"`, `Escape` listener).
  - Two-column responsive layout with inputs for SKU, Category, Name, Brand, Model, Shelf Location, Spec Type, Initial Stock, Low Stock Alert, Unit Cost, Wholesale Price, and Retail Price.
  - Real-time auto-calculation of Wholesale (+18%) and Retail (+35% OEM / +40% Aftermarket) on cost or spec type change, with full manual override support.
  - Inline error feedback for SKU collision or invalid fields.

### Unit 3: Catalog Wiring, State Mutation & Dual Audit Logging
- **Files**: `components/admin/inventory/inventory-catalog.tsx`, `components/admin/inventory/catalog-filter-bar.tsx`, `lib/store/inventory-store.ts`
- **Scope**:
  - Add "+ Add Part" button in `catalog-filter-bar.tsx`.
  - Add `registerProduct` method to `InventoryStore` handling case-insensitive SKU uniqueness, catalog insertion, conditional inbound restock log generation, and audit log generation.
  - Wire modal submission and dismissals in `inventory-catalog.tsx`.
  - Reactive state update `< 50ms` with zero full-page reloads.

---

## Complexity Tracking

> No constitution violations or unjustified architectural patterns detected.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
