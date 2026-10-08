# Implementation Plan: Physical Rack & Shelf Locator Mapping & Warehouse Navigation Badges

**Branch**: `feat/SIAA-14-shelf-locator-mapping` | **Date**: 2026-10-09 | **Spec**: [specs/008-physical-rack-shelf-locator-badges/spec.md](file:///c:/Users/Roselle%20Tabuena/workspace/swift/swift/specs/008-physical-rack-shelf-locator-badges/spec.md)

**Input**: Feature specification from `/specs/008-physical-rack-shelf-locator-badges/spec.md` (Jira: `SIAA-14`)

---

## Summary

Implement standardized, high-contrast physical rack/shelf navigation tags (`.shelf-location-tag`) and location search filtering across warehouse parts tables and picking lists. When products lack physical storage coordinates, render an amber `Unassigned Bay` alert badge. Provide pure parsing utilities (`parseShelfLocation`), integrate search predicates for storage bay queries and `"unassigned"` audit lookups, and ensure 100% adherence to SWIFT semantic design tokens with WCAG AA accessibility.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: React 19, Next.js 15 (App Router), Tailwind CSS v4, `lucide-react`, Zustand  
**Storage**: In-memory reactive state (`inventoryStore`), mock product catalog (`MOCK_PRODUCTS`), future Supabase/Prisma persistence  
**Testing**: Vitest (`npm test`) with React Testing Library  
**Target Platform**: Responsive Web (Shop floor tablets, mobile mechanic terminals, desktop admin portal)  
**Project Type**: Full-stack Next.js web application  
**Performance Goals**: Pure location parsing `< 1ms`, location search filtering `< 50ms`, physical part location identification `< 5s`  
**Constraints**: Zero hardcoded colors (100% SWIFT design tokens), WCAG AA contrast ratio (> 4.5:1), no external heavy location libraries  
**Scale/Scope**: 100+ warehouse SKUs, 50+ rack/shelf bays, 3 primary consuming portals/views (`/admin/inventory`, `/staff/locator`, POS picking)  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Status | Evaluation Notes |
| :--- | :---: | :--- |
| **I. Semantic Design Tokens & Zero Hardcoded Colors** | **PASS** | Assigned tags use `bg-secondary-light`, `text-secondary`, `border-secondary/20`. Unassigned tags use `bg-accent-light`, `text-accent`, `border-accent/30`. Zero arbitrary hex/RGB values. |
| **II. Single Source of Truth & Specification Fidelity** | **PASS** | Strictly mirrors `../mockup/` and `../docs/features.md` storage locator formats (`<Zone/Rack> / <Shelf/Bin>`). |
| **III. Type-Safe Data Architecture & Domain Integrity** | **PASS** | Explicit `ParsedShelfLocation` and `ShelfLocationTagProps` contracts; typed `Product.location`; zero `any` types. |
| **IV. Test-First Quality & Contract Verification** | **PASS** | Comprehensive unit tests for `parseShelfLocation()` and `filterCatalogProducts()` with 100% branch coverage. |
| **V. Server-First Performance & Accessibility Standards** | **PASS** | Pure utility logic isolated in `lib/inventory/shelf-location.ts`. Accessible `aria-label` tags and semantic contrast ratios compliant with WCAG AA. |

---

## Project Structure

### Documentation (this feature)

```text
specs/008-physical-rack-shelf-locator-badges/
├── plan.md              # This implementation plan
├── research.md          # Technical decisions and architectural rationale
├── data-model.md        # Entities, parsed schemas, and state matrix
├── quickstart.md        # Validation scenarios and test commands
├── contracts/
│   └── shelf-locator-contracts.ts # TypeScript interfaces and contracts
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
lib/
└── inventory/
    ├── shelf-location.ts            # Pure parser and formatting utilities
    ├── catalog-filter.ts            # Multi-attribute search & location filter predicate
    └── __tests__/
        ├── shelf-location.test.ts   # Unit tests for location parsing and fallbacks
        └── catalog-filter.test.ts   # Unit tests for location and unassigned queries
components/
├── inventory/
│   └── shelf-location-tag.tsx       # Reusable high-contrast badge component
└── admin/
    └── inventory/
        └── catalog-table.tsx        # Inventory data table integrating ShelfLocationTag
```

**Structure Decision**: Web application component and domain utility integration adhering to the SWIFT repository pattern. Pure logic resides in `lib/inventory/`, shared UI components in `components/inventory/`, and consuming table views in `components/admin/inventory/`.

---

## Complexity Tracking

> No constitution violations or unjustified architectural patterns detected.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
