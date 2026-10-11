# Implementation Plan: Flat-Rate Workshop Labor Schedule & Service Duration Matrix

**Feature**: Flat-Rate Workshop Labor Schedule & Service Duration Matrix  
**Jira Issue**: [SIAA-40](https://the-three-devsketeers.atlassian.net/browse/SIAA-40)  
**Date**: 2026-10-11  

---

## 1. Architectural Overview & Boundary Mapping

This feature refines and completes the Pricing & Labor Rates Matrix view (`/admin/rates`), establishing the authoritative flat-rate workshop labor schedule and standard hourly benchmark engine in full alignment with the SWIFT project specification and mockup designs (`#view-pricing`).

### Component Hierarchy:
```
app/admin/rates/page.tsx (Container: #view-pricing)
 ├── Header & Actions
 ├── Summary KPI Cards (Total Services, Active Services, Average Flat Rate, Benchmark Hourly Rate)
 ├── Flat-Rate Labor Schedule Matrix Panel
 │    ├── Filter & Bay Selector
 │    └── LaborRatesTable (with canonical service names, durations, flat rates, and actions)
 ├── Standard Hourly Labor Rate Benchmark & Dynamic Estimator Card
 │    ├── Hourly Rate Configuration Form
 │    └── Pro-Rated Bay Estimator (Presets: 15m, 30m, 45m, 60m, 90m, 120m + Custom duration input)
 ├── EditServiceModal
 └── NewServiceModal
```

---

## 2. Phased Implementation Roadmap

### Phase 1: Domain Logic & Pricing Actions
1. **Canonical Service Names**: Update `lib/mock-data/services.ts` to ensure canonical baseline names exactly match the mockup:
   - "Oil & Gear Oil Change" (`15m`, `₱100.00`)
   - "CVT Cleaning & Regrease" (`45m`, `₱350.00`)
   - "Tire Mounting & Sealing" (`20m`, `₱150.00`)
   - "FI Throttle Body Reset" (`60m`, `₱650.00`)
   - "Front Shock Re-oil" (`90m`, `₱800.00`)
2. **Pricing Actions Engine**:
   - Implement `lib/admin/pricing-actions.ts` with:
     - `getPricingRulesAction()`: Returns current `PricingRules` (including `hourlyLaborRate`).
     - `updatePricingRulesAction(updates)`: Updates pricing rules, revalidates `/admin/rates`.
     - `calculateProRatedLaborCharge(minutes, hourlyRate)`: Pure mathematical calculation helper with 2-decimal rounding.
3. **Automated Tests**:
   - Unit tests in `lib/admin/__tests__/pricing-actions.test.ts` and `lib/admin/__tests__/pro-rated-estimator.test.ts`.

### Phase 2: Hourly Benchmark & Pro-Rated Estimator UI Component
1. Implement `components/admin/rates/hourly-benchmark-card.tsx`:
   - Configurable base hourly rate input (default `₱450.00/hour`).
   - Quick preset duration chips (`15m`, `30m`, `45m`, `1h`, `1.5h`, `2h`).
   - Freeform minutes input.
   - Dynamic real-time calculation display: `durationHours` and `estimatedCharge` formatted in PHP currency (`₱`).
   - Adherence to SWIFT semantic tokens (`bg-bg-surface`, `border-border`, `text-primary`, etc.).

### Phase 3: Matrix Panel & `#view-pricing` Page Integration
1. Update `app/admin/rates/page.tsx`:
   - Enforce container `id="view-pricing"` and semantic structure matching the mockup.
   - Embed the panel titled **"Flat-Rate Labor Schedule Matrix"**.
   - Embed the **Standard Hourly Labor Rate Benchmark & Bay Estimator** panel.
   - Add KPI card for "Benchmark Hourly Rate" (`₱450.00/hr`).
   - Wire notification toast for both flat rate updates and benchmark rate updates.
2. Refine `components/admin/rates/labor-rates-table.tsx` to handle durations cleanly (`15m`, `45m`, etc.).

### Phase 4: Verification, Lint & Convergence
1. Run all unit tests with Jest.
2. Run `npm run typecheck` and `npm run lint`.
3. Auto-sync Graphify knowledge graph (`graphify-auto-sync`).
