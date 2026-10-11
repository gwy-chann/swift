# Implementation Tasks: Dual-Tier Pricing Switcher (Retail vs. Wholesale)

**Feature**: Dual-Tier Pricing Switcher (Retail vs. Wholesale) with Dynamic Cart Recalculation  
**Branch**: `feat/SIAA-19-dual-tier-pricing-switcher`  
**Ticket**: [SIAA-19](https://the-three-devsketeers.atlassian.net/browse/SIAA-19)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3)  

---

## Task Overview & Progress

- [x] **Phase 1: Setup & Contracts**
  - [x] Task 1.1: SpecKit 8-Artifact Specification & Data Models (`specs/020-dual-tier-pricing-switcher/`)
  - [x] Task 1.2: Pricing Contracts & Pure Recalculation Engine (`contracts/pricing-switcher-contracts.ts`)

- [x] **Phase 2: Test Suite & Store Verification (TDD)**
  - [x] Task 2.1: Write Comprehensive Dual-Tier Pricing Test Suite (`lib/pos/__tests__/dual-tier-pricing-switcher.test.ts`)
  - [x] Task 2.2: Verify and enhance `cartStore.setPricingMode` to ensure 100% quantity preservation, product wholesale price fallback, and labor invariance

- [x] **Phase 3: UI Components & High-Contrast Visual Warning Indicator**
  - [x] Task 3.1: Add `WHOLESALE TIER ACTIVE` High-Contrast Warning Banner above Checkout Button in `HybridCartPane`
  - [x] Task 3.2: Enhance `HybridCatalogPane` to display active pricing tier context and wholesale tag badges on item cards

- [x] **Phase 4: Verification & Quality Gates**
  - [x] Task 4.1: Run targeted unit & integration tests (`npm test`)
  - [x] Task 4.2: Run TypeScript typecheck (`npx tsc --noEmit`)
  - [x] Task 4.3: Verify zero hardcoded color tokens and Tailwind v4 compatibility

- [x] **Phase 5: Git Commits & Convergence**
  - [x] Task 5.1: Stage and commit layered atomic commits with `[SIAA-19]` ticket key
  - [x] Task 5.2: Sync Knowledge Graph (`graphify-auto-sync`)
  - [x] Task 5.3: Push branch and open Pull Request (`create-pr`)
