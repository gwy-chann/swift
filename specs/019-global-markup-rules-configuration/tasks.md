# Implementation Tasks: Global Markup Rules Configuration

**Feature**: `019-global-markup-rules-configuration`  
**Jira Issue**: [SIAA-39](https://the-three-devsketeers.atlassian.net/browse/SIAA-39)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  

---

## Phase 1: Domain & Mock Engine Foundation

- [ ] **Task 1.1**: Export `SWIFT_DB` alias to `SWIFT_SEED_DATABASE` in `lib/mock-data/index.ts`.
- [ ] **Task 1.2**: Update `updatePricingRulesAction` in `lib/admin/pricing-actions.ts` to sync `SWIFT_SEED_DATABASE.pricingRules` and push structured audit entries to `SWIFT_SEED_DATABASE.auditLogs`.

---

## Phase 2: Global Markup Control Panel (`GlobalMarkupCard`)

- [ ] **Task 2.1**: Update `components/admin/rates/global-markup-card.tsx` submit button label to "Save Markup Rules".
- [ ] **Task 2.2**: Update success notification and alert banner to prominently feature `"Global pricing rules saved!"`.
- [ ] **Task 2.3**: Verify strict numeric bounds validation `(0, 200]` in `GlobalMarkupCard`.

---

## Phase 3: Inventory Product Registration Dynamic Propagation

- [ ] **Task 3.1**: Update `components/admin/inventory/product-registration-modal.tsx` to dynamically format pricing sub-header labels (`Wholesale: +${wholesale}% | Retail: +${retail}%`) and calculate fallback wholesale/retail prices using active `pricingRules`.
- [ ] **Task 3.2**: Update `components/admin/inventory/inventory-catalog.tsx` to subscribe to `usePricingRulesRealtime` and pass `pricingRules` to `ProductRegistrationModal`.
- [ ] **Task 3.3**: Update `app/admin/inventory/page.tsx` to fetch `initialPricingRules` via `getPricingRulesAction()` and forward to `InventoryCatalog`.

---

## Phase 4: Automated Testing & Verification

- [ ] **Task 4.1**: Implement comprehensive test suite `lib/admin/__tests__/global-markup-configuration.test.ts` covering:
  - Scenario 1: Initial rules retrieval and margin simulation.
  - Scenario 2: Markup percentage updates with bounds validation and confirmation message.
  - Scenario 3: Propagation of updated markups to product registration calculation (₱500 cost -> ₱600 wholesale, ₱690 retail).
  - Scenario 4: Audit trail logging in `SWIFT_DB.auditLogs` and database ledger.
- [ ] **Task 4.2**: Run `node --test` suite to verify green status.
- [ ] **Task 4.3**: Run `npm run typecheck` and `npm run lint` across the project.
