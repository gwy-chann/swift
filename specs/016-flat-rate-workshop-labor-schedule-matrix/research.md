# Research & Architecture Decisions: Flat-Rate Workshop Labor Schedule & Service Duration Matrix

**Feature**: Flat-Rate Workshop Labor Schedule & Service Duration Matrix  
**Jira Issue**: [SIAA-40](https://the-three-devsketeers.atlassian.net/browse/SIAA-40) (STORY-7.3)  
**Date**: 2026-10-11  

---

## 1. Technical Context & Existing Architecture

### 1.1 Existing SIAA-49 & SIAA-59 Foundation
- Database schema: `public.labor_services` (UUID, code, name, bay, rate, duration, description, active, created_at, updated_at).
- Audit ledger: `public.service_rate_audit_logs` (id, service_id, service_code, old_rate, new_rate, reason, user_name, created_at).
- Server Actions: `lib/admin/service-actions.ts` provides `getAdminLaborServicesAction`, `updateLaborServiceAction`, `createLaborServiceAction`, `toggleServiceStatusAction`, `deleteLaborServiceAction`.
- Realtime hook: `useLaborServicesRealtime` (`lib/hooks/use-labor-services-realtime.ts`) listens to Postgres CDC events on `public:labor_services`.
- POS Cart Integration: `/staff/pos` consumes `useLaborServicesRealtime` to dynamically update in-memory catalog items.

### 1.2 Gaps Addressed by SIAA-40
1. **Mockup & Jira Alignment**:
   - The mockup `#view-pricing` specifically specifies:
     - "Flat-Rate Labor Schedule Matrix" panel card
     - Canonical services: "Oil & Gear Oil Change" (`15m`, `₱100.00`), "CVT Cleaning & Regrease" (`45m`, `₱350.00`), "Tire Mounting & Sealing" (`20m`, `₱150.00`), "FI Throttle Body Reset" (`60m`, `₱650.00`), "Front Shock Re-oil" (`90m`, `₱800.00`).
   - The UI container in `app/admin/rates/page.tsx` must explicitly carry `id="view-pricing"` and semantic structure matching `#view-pricing`.
2. **Standard Hourly Labor Rate Benchmark**:
   - Jira Scenario 4 requires configuring the shop base hourly labor rate (e.g. `₱450.00/hour`) and dynamically estimating time-pro-rated charges for custom fabrication or unlisted diagnostic jobs based on technician bay duration.
   - Currently, `hourlyLaborRate` exists only as static mock data in `lib/mock-data/pricing.ts` without server actions or UI controls.
   - We need:
     - `lib/admin/pricing-actions.ts` to retrieve and persist shop pricing configuration (including `hourlyLaborRate`, `retailMarkup`, `wholesaleMarkup`, `aftermarketMarkup`).
     - A modern, interactive **Standard Hourly Labor Rate Benchmark & Estimator** component (`components/admin/rates/hourly-benchmark-card.tsx`) embedded within `/admin/rates`.

---

## 2. Dynamic Pro-Rated Calculation Specification

### 2.1 Formula
$$\text{Estimated Charge} = \text{round}\left(\frac{\text{Duration in Minutes}}{60} \times \text{Hourly Labor Rate}, 2\right)$$

### 2.2 Presets & Durations
- Standard quick-preset durations:
  - `15m` (0.25 hrs) $\rightarrow$ `₱112.50` at ₱450/hr
  - `30m` (0.50 hrs) $\rightarrow$ `₱225.00` at ₱450/hr
  - `45m` (0.75 hrs) $\rightarrow$ `₱337.50` at ₱450/hr
  - `60m` (1.00 hr)  $\rightarrow$ `₱450.00` at ₱450/hr
  - `90m` (1.50 hrs) $\rightarrow$ `₱675.00` at ₱450/hr
  - `120m` (2.00 hrs) $\rightarrow$ `₱900.00` at ₱450/hr
- Free-form custom duration input in minutes or hours for custom repair bay jobs.

---

## 3. Storage Strategy for Base Hourly Labor Rate

1. **In-Memory & Configuration Persistence**:
   - `lib/admin/pricing-actions.ts` maintains reactive shop pricing settings.
   - If Supabase / Postgres table `public.shop_settings` or `public.pricing_rules` exists or can be read, it loads from there; otherwise falls back gracefully to `MOCK_PRICING_RULES` with in-memory persistence.
   - Server action `updatePricingRulesAction(updates)` validates and persists the updated `hourlyLaborRate` and notifies revalidation of `/admin/rates`.

---

## 4. UI/UX & Design Tokens

- Container: `<section id="view-pricing" className="space-y-6">`
- Panel 1: **Flat-Rate Labor Schedule Matrix** (`components/admin/rates/labor-rates-table.tsx` wrapped in panel card with header, search, filter, and add button).
- Panel 2: **Standard Hourly Labor Rate Benchmark & Bay Estimator** (`components/admin/rates/hourly-benchmark-card.tsx`).
- Color Tokens: Strictly use semantic tokens (`bg-bg-surface`, `bg-bg-card`, `text-text-primary`, `text-primary`, `border-border`, etc.). Zero hardcoded hex/rgb.

---

## 5. Verification Plan

1. **Unit Tests**:
   - `lib/admin/__tests__/pricing-actions.test.ts`: Test `getPricingRulesAction` and `updatePricingRulesAction` validation and calculations.
   - `lib/admin/__tests__/pro-rated-estimator.test.ts`: Test mathematical pro-rating for 15m, 45m, 60m, 90m against base rates.
2. **Component Tests / Integration**:
   - Verify `/admin/rates` renders `#view-pricing` with both the Flat-Rate Schedule Matrix and the Hourly Labor Rate Benchmark card.
   - Verify updating a flat rate persists and triggers toast confirmation.
   - Verify updating base hourly labor rate recalculates dynamic estimates instantly.
