# Implementation Plan: Automated Low-Stock Threshold Detection & Floor Restock Alerts

**Branch**: `feat/SIAA-17-low-stock-threshold-alerts` | **Date**: 2026-10-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-low-stock-threshold-alerts/spec.md`

---

## Summary

This feature delivers automated low-stock detection, high-contrast dynamic status badging, 4 top-level inventory summary health cards (Total SKUs, Total Units on Hand, Critical Low Stock count, and Valuation in ₱), a dedicated Reorder Quick-Filter toggle, and zero-stock sale prevention on the point-of-sale terminal.

---

## Technical Context

**Language/Version**: TypeScript 5.x / React 19 / Next.js 15+ (App Router)  
**Primary Dependencies**: `lucide-react`, Tailwind CSS v4, `Intl.NumberFormat`  
**Storage**: Client reactive state via `useInventoryStore()` with centralized mock data  
**Testing**: Node.js test runner (`npm test`) with zero external test bloat  
**Target Platform**: Web (Desktop & Mobile, Admin & Staff Portals)  
**Project Type**: Next.js App Router Web Application  
**Performance Goals**: Instant client-side filtering (<16ms 60fps), zero re-render thrashing  
**Constraints**: Zero hardcoded colors (strict SWIFT semantic design tokens), WCAG AA contrast compliance  
**Scale/Scope**: Real-time aggregation over hundreds of catalog SKUs across Admin and Staff portals  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| :--- | :---: | :--- |
| **I. Semantic Design Tokens & Zero Hardcoded Colors** | PASS | All badges, cards, and toggles use semantic tokens (`bg-danger-light`, `text-danger`, `bg-success-light`, `text-success`, `bg-bg-card`, `border-border`). Zero hex/arbitrary values. |
| **II. Single Source of Truth & Specification Fidelity** | PASS | Conforms to SIAA-17 user stories and acceptance criteria, matching `../mockup/admin.html` and `../mockup/staff.html`. |
| **III. Type-Safe Data Architecture & Domain Integrity** | PASS | Strict TypeScript interfaces in `contracts/threshold-alerts-contracts.ts` and `lib/inventory/catalog-filter.ts`. |
| **IV. Test-First Quality & Contract Verification** | PASS | Pure calculation functions (`calculateCatalogStats`, `getStockHealthStatus`) covered by automated unit tests. |
| **V. Server-First Performance & Accessibility** | PASS | High-contrast visual tokens, semantic ARIA labels, keyboard navigability. |

---

## Architectural Decomposition & Atomic Commit Strategy

Following the mandatory `atomic-commit` skill, implementation will be executed in 3 units:

### Unit 1: Domain Logic, Contracts & Unit Tests
- Extend `lib/inventory/catalog-filter.ts` to compute `totalUnitsOnHand` and support `lowStockOnly` filtering.
- Create or update tests in `lib/inventory/__tests__/catalog-filter.test.ts` to verify `totalUnitsOnHand`, low-stock threshold detection, and quick-filter behavior.

### Unit 2: Shared UI Badges & Admin Inventory Views
- Create reusable `<StockBadge>` in `components/inventory/stock-badge.tsx`.
- Update `components/admin/inventory/catalog-table.tsx` to use the unified badging.
- Update `components/admin/inventory/inventory-stats-cards.tsx` to display all 4 required summary cards (Total SKUs, Total Units on Hand, Critical Low Stock, Total Valuation).
- Update `components/admin/inventory/catalog-filter-bar.tsx` and `inventory-catalog.tsx` with the dedicated "Low Stock Alerts" quick-filter toggle.

### Unit 3: Staff POS Terminal Depletion Warnings & Zero-Stock Protection
- Update `app/staff/pos/page.tsx` to integrate live inventory stock, render stock badges, and disable quick-add on zero-stock items with manager override capability.
- Run typecheck (`npx tsc --noEmit`) and full test suite (`npm test`).

---

## Project Structure

### Documentation (this feature)

```text
specs/011-low-stock-threshold-alerts/
├── spec.md                  # Feature Specification
├── plan.md                  # This implementation plan
├── research.md              # Architectural decisions & research findings
├── data-model.md            # Domain models & evaluation matrices
├── contracts/
│   └── threshold-alerts-contracts.ts # TypeScript interfaces
├── quickstart.md            # Interactive & automated verification guide
└── checklists/
    └── requirements.md      # Quality checklist
```

### Source Code

```text
components/
├── inventory/
│   └── stock-badge.tsx              # Reusable status badge component
├── admin/inventory/
│   ├── catalog-filter-bar.tsx        # Added Low Stock Alerts quick-filter toggle
│   ├── catalog-table.tsx             # Enhanced status badging
│   ├── inventory-stats-cards.tsx     # 4 canonical operational KPI cards
│   └── inventory-catalog.tsx         # Quick-filter state wiring
app/
└── staff/pos/
    └── page.tsx                     # Out-of-stock disablement & low-stock tags
lib/
└── inventory/
    ├── catalog-filter.ts            # Extended CatalogStats & filter predicates
    └── __tests__/
        └── catalog-filter.test.ts   # Unit test suite
```

---

## Complexity Tracking

> **No Constitution violations detected.** Zero unjustified complexity.
