# Implementation Plan: Global Markup Rules Configuration (Retail, Wholesale & Aftermarket)

**Feature**: `019-global-markup-rules-configuration`  
**Jira Issue**: [SIAA-39](https://the-three-devsketeers.atlassian.net/browse/SIAA-39)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  

---

## 1. Architectural Summary & File Changes

| File | Change Type | Purpose |
|------|-------------|---------|
| `lib/mock-data/index.ts` | **Update** | Export `SWIFT_DB` alias to `SWIFT_SEED_DATABASE` |
| `lib/admin/pricing-actions.ts` | **Update** | Sync `SWIFT_SEED_DATABASE.pricingRules` & append to `SWIFT_SEED_DATABASE.auditLogs` on updates |
| `components/admin/rates/global-markup-card.tsx` | **Update** | Update button text to "Save Markup Rules", add "Global pricing rules saved!" confirmation alert |
| `components/admin/inventory/product-registration-modal.tsx` | **Update** | Use dynamic markup rules in calculation note and fallback math |
| `components/admin/inventory/inventory-catalog.tsx` | **Update** | Hook up `usePricingRulesRealtime` and pass `pricingRules` into `ProductRegistrationModal` |
| `app/admin/inventory/page.tsx` | **Update** | Fetch `initialPricingRules` and pass to `InventoryCatalog` for SSR hydration |
| `lib/admin/__tests__/global-markup-configuration.test.ts` | **New** | Test suite covering Scenarios 1, 2, 3, and 4 |

---

## 2. Component & Data Flow Hierarchy

```
[app/admin/rates/page.tsx (#view-pricing)]
   └── <GlobalMarkupCard initialRules={pricingRules} />
          ├── Button: "Save Markup Rules"
          ├── Validation: (0, 200]
          └── On submit -> updatePricingRulesAction()
                  ├── Supabase: public.pricing_rules (row 1)
                  ├── Supabase: public.pricing_rules_audit_logs
                  ├── In-Memory: SWIFT_DB.pricingRules
                  └── In-Memory: SWIFT_DB.auditLogs

[app/admin/inventory/page.tsx]
   └── <InventoryCatalog initialProducts={...} initialPricingRules={...}>
          ├── Realtime hook: usePricingRulesRealtime()
          └── <ProductRegistrationModal pricingRules={pricingRules} />
                 ├── Cost Input (e.g. ₱500.00)
                 ├── Wholesale: ₱500 * (1 + 20%) = ₱600.00
                 └── Retail: ₱500 * (1 + 38%) = ₱690.00
```

---

## 3. Phased Execution Schedule

1. **Phase 1: Domain & Mock Engine Foundation**
   - Export `SWIFT_DB` in `lib/mock-data/index.ts`.
   - Update `updatePricingRulesAction` to sync `SWIFT_SEED_DATABASE.pricingRules` and `SWIFT_SEED_DATABASE.auditLogs`.
2. **Phase 2: Global Markup Card Refinements**
   - Ensure button label explicitly states "Save Markup Rules".
   - Include confirmation alert "Global pricing rules saved!".
3. **Phase 3: Inventory Registration Wiring**
   - Provide `pricingRules` from `app/admin/inventory/page.tsx` and `InventoryCatalog` to `ProductRegistrationModal`.
   - Make markup indicator and calculation dynamic.
4. **Phase 4: Test Suite & Verification**
   - Create unit/integration tests in `lib/admin/__tests__/global-markup-configuration.test.ts`.
   - Execute verification commands.
