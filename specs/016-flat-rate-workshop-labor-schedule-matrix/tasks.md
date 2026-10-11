# Implementation Tasks: Flat-Rate Workshop Labor Schedule & Service Duration Matrix

**Feature**: Flat-Rate Workshop Labor Schedule & Service Duration Matrix  
**Jira Issue**: [SIAA-40](https://the-three-devsketeers.atlassian.net/browse/SIAA-40) (STORY-7.3)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  
**Status**: Ready for Implementation  

---

## Phase 1: Setup & Contracts

- [ ] **Task 1.1**: Create `specs/016-flat-rate-workshop-labor-schedule-matrix/contracts/pricing-rules.contract.ts` with validation schemas for `PricingRulesSchema`, `UpdateHourlyRateSchema`, and `ProRatedEstimateInputSchema`.
- [ ] **Task 1.2**: Align default mock labor service titles and durations in `lib/mock-data/services.ts` with the mockup: "Oil & Gear Oil Change" (`15m`), "CVT Cleaning & Regrease" (`45m`), "Tire Mounting & Sealing" (`20m`), "FI Throttle Body Reset" (`60m`), "Front Shock Re-oil" (`90m`).

## Phase 2: Domain Models & Pricing Server Actions (TDD)

- [ ] **Task 2.1**: Implement unit tests for pro-rated labor calculation and hourly rate updates in `lib/admin/__tests__/pricing-actions.test.ts`.
- [ ] **Task 2.2**: Implement `lib/admin/pricing-actions.ts` providing:
  - `getPricingRulesAction()`
  - `updatePricingRulesAction(updates)`
  - `calculateProRatedLaborCharge(durationMinutes, hourlyRate)`
  - Next.js path revalidation for `/admin/rates`.

## Phase 3: UI Components & Pro-Rated Estimator

- [ ] **Task 3.1**: Create `components/admin/rates/hourly-benchmark-card.tsx` with:
  - Base hourly rate editor (₱/hr)
  - Preset duration chips (`15m`, `30m`, `45m`, `60m`, `90m`, `120m`)
  - Freeform minutes input
  - Dynamic pro-rated charge calculation and breakdown
  - SWIFT design tokens (`bg-bg-surface`, `border-border`, `text-primary`, etc.)
- [ ] **Task 3.2**: Update `components/admin/rates/labor-rates-table.tsx` to ensure duration tags render cleanly with short format (`15m`, `45m`) and align with the "Flat-Rate Labor Schedule Matrix" panel design.

## Phase 4: Page Integration (`#view-pricing` at `/admin/rates`)

- [ ] **Task 4.1**: Update `app/admin/rates/page.tsx` with:
  - Root container `id="view-pricing"`
  - "Flat-Rate Labor Schedule Matrix" panel card wrapper
  - "Benchmark Hourly Rate" summary KPI card
  - Embedded `HourlyBenchmarkCard` component
  - Unified toast notification system for flat-rate and hourly-rate updates.

## Phase 5: Verification & Convergence

- [ ] **Task 5.1**: Run automated test suite: `npm test` across all admin service and pricing test files.
- [ ] **Task 5.2**: Run typecheck (`npm run typecheck`) and linting (`npm run lint`).
- [ ] **Task 5.3**: Run Graphify auto-sync (`graphify . --update`) and review against constitutional principles.
