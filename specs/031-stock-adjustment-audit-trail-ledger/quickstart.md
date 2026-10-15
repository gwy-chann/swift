# Quickstart & Verification Guide: Stock Adjustment Audit Trail Ledger & Shrinkage Analytics

**Feature**: Stock Adjustment Audit Trail Ledger Query Engine & Shrinkage Analytics Action  
**Jira Issue**: [SIAA-65](https://the-three-devsketeers.atlassian.net/browse/SIAA-65) (STORY-7.10)  
**Target View**: `/admin/logs`  

---

## 1. Quick Local Execution

1. Start the Next.js development server inside the feature worktree:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to the Admin Audit Logs view:
   `http://localhost:3000/admin/logs`

---

## 2. Walkthrough Scenarios & Verification Steps

### Scenario A: Inspecting the Audit Trail Ledger & KPI Metrics
1. Navigate to `http://localhost:3000/admin/logs`.
2. Locate the panel **Stock Adjustment Audit Trail** with the badge `Immutable Records`.
3. **Observe**:
   - The summary KPI cards render at the top:
     - **Total Adjustments**: Total count of recorded adjustment transactions.
     - **Net Unit Delta**: Aggregate net unit change across inventory.
     - **Total Shrinkage**: Aggregate negative units lost or damaged (e.g. `14 units`).
   - The audit table renders rows inside `#stockAdjLogsBody`:
     - Timestamp in monospace font.
     - SKU in bold monospace font.
     - Adjustment Type formatted with distinct category badges (`Physical Count`, `Damaged Goods`, `POS Sale`).
     - Unit Change formatted with high-contrast pills: positive changes (`+5`) in `text-success` with green background, negative changes (`-2`) in `text-danger` with red background.
     - Reason / Reference explaining the adjustment cause.
     - Authorized By displaying the operator's name.

### Scenario B: Filtering by SKU and Adjustment Type
1. In the search input (`#stockAuditFilterSku`), type `YAM-NMAX-BL01`.
2. **Observe**: The table immediately filters to show only records associated with the Yamaha NMAX brake pad SKU.
3. In the type dropdown (`#stockAuditFilterType`), select `Damaged Goods`.
4. **Observe**:
   - Only damaged goods write-offs for `YAM-NMAX-BL01` are rendered.
   - The KPI summary metrics recalculate to display only the deltas and shrinkage for the filtered records.

### Scenario C: Audit Trail CSV Export
1. With or without filters applied, click the **Export Stock Audit Trail** button (`#exportStockAuditBtn`).
2. **Observe**:
   - The button shows an active loading state.
   - A download is initiated for `stock-adjustment-audit-<timestamp>.csv`.
   - Open the downloaded CSV file in Excel, Numbers, or a text editor.
   - Confirm proper headers: `Timestamp,SKU,Adjustment Type,Quantity Delta,Previous Stock,New Stock,Reason,Authorized User`.
   - Verify all rows match the active filtered dataset with proper character escaping.

### Scenario D: Immutability & Read-Only Protection Verification
1. Inspect the table rows and surrounding container.
2. Confirm that there are **zero** edit, delete, modify, or archive buttons exposed to the user.
3. Test attempting a direct update query on `public.stock_adjustment_logs`:
   ```sql
   UPDATE public.stock_adjustment_logs SET quantity_delta = 999 WHERE id = '...';
   ```
4. Confirm PostgreSQL rejects the transaction with error:
   `TAMPER_FORBIDDEN: stock_adjustment_logs is an immutable append-only ledger. Updates and deletions are strictly prohibited.`

---

## 3. Automated Test Suite Execution

Run the automated test suites validating Server Actions, CSV generation, and UI rendering:

```bash
# Run Server Action & utility tests
npm test -- lib/admin/__tests__/stock-audit-actions.test.ts
npm test -- lib/admin/__tests__/stock-audit-utils.test.ts

# Run UI component tests
npm test -- components/admin/logs/__tests__/stock-audit-panel.test.tsx

# Run full project type checking
npx tsc --noEmit
```
