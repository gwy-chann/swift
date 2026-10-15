# Quickstart & Verification Guide: Immutable Stock Adjustment Audit Trail & Shrinkage Logging

**Feature**: `033-immutable-stock-adjustment-audit-trail-shrinkage-logging`  
**Jira Issue**: [SIAA-41](https://the-three-devsketeers.atlassian.net/browse/SIAA-41) (STORY-7.4)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  

---

## 1. Environment & Setup

Ensure you are operating within the isolated worktree:
```bash
cd .worktrees/SIAA-41
npm install
```

---

## 2. Verification Walkthrough Scenarios

### Scenario 1: Verify Audit Trail Ledger Rendering & 6-Column Layout
1. Navigate to `/admin/logs` in the browser or run automated component tests.
2. Verify that container `#view-settings` is present in the DOM.
3. Verify that table `#stockAdjLogsBody` is populated with adjustment records.
4. Verify the 6 columns:
   - **Timestamp**: monospaced, formatted date and time.
   - **SKU**: monospaced bold (e.g. `YAM-NMAX-BL01`).
   - **Type**: badge pill with appropriate semantic colors (`Restock Inbound`, `Damaged Goods`, `Physical Count`).
   - **Change**: color-coded pill (`+24 Units` in green, `-2 Units` in red).
   - **Reason / Reference**: descriptive text with tooltip.
   - **Authorized By**: staff name attribution.

### Scenario 2: Verify Real-time Append on Stock Adjustment Execution
1. Open the Admin portal in two views or execute `inventoryStore.adjustStock` via console:
   ```javascript
   inventoryStore.adjustStock({
     sku: 'YAM-NMAX-BL01',
     type: 'Damaged Goods',
     units: -2,
     reason: 'Damaged in transit',
     user: 'Alex Tan (Staff)'
   });
   ```
2. Inspect the audit trail panel on `/admin/logs`.
3. Notice that the new entry appears immediately at the top of `#stockAdjLogsBody` (<16ms) without a full page reload.
4. Verify the Shrinkage KPI card increments by `+2 units`.

### Scenario 3: Verify Filter & Search by SKU or Adjustment Type
1. In the search input `#stockAuditFilterSku`, type `YAM-NMAX-BL01`.
2. Notice the table filters down to rows matching this SKU.
3. In the dropdown `#stockAuditFilterType`, select `Damaged Goods`.
4. Verify that only damaged goods records are displayed.
5. Notice the total logs count and KPI metrics adjust to reflect the filtered dataset.

### Scenario 4: Verify Immutability & Edit Protection
1. Inspect the table rows in `#stockAdjLogsBody`.
2. Verify that NO edit, delete, or checkbox selection buttons are rendered.
3. Verify that records cannot be retroactively modified or deleted via UI controls.

---

## 3. Automated Test Verification

Run all test suites:
```bash
npm test -- lib/admin/__tests__/stock-audit-actions.test.ts lib/admin/__tests__/stock-audit-utils.test.ts components/admin/logs/__tests__/stock-audit-reactive.test.tsx
```

Run TypeScript compilation check:
```bash
npx tsc --noEmit
```
