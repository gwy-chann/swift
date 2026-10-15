# Quickstart & Verification Guide: Multi-Period Sales Filter & Accounting CSV Export Dispatcher

**Feature Directory**: `specs/037-multi-period-sales-filter-accounting-csv-export-dispatcher`  
**Jira Issue**: [SIAA-37](https://the-three-devsketeers.atlassian.net/browse/SIAA-37) (STORY-6.5)  

---

## 1. Development Server Setup

Navigate into the worktree directory:
```bash
cd .worktrees/SIAA-37
npm run dev
```
Open [http://localhost:3000/admin/reports](http://localhost:3000/admin/reports) in your browser.

---

## 2. Interactive Verification Scenarios

### Scenario 1: Multi-Period Date Filter Switching
1. Open the reports module at `/admin/reports` (`#view-reports`).
2. Observe the period filter buttons in the top toolbar: **Daily Sales**, **Weekly Sales**, and **Monthly Sales**.
3. Verify that **Daily Sales** is active by default with primary styling (`bg-primary text-text-light`).
4. Click **Weekly Sales**:
   - The button transitions to active primary styling while Daily Sales becomes secondary.
   - Gross Revenue, COGS, Net Profit, and Invoice Count smoothly re-evaluate to weekly totals (~₱318k across 260 invoices).
5. Click **Monthly Sales**:
   - The button switches to active primary styling.
   - Financial figures scale to monthly totals (~₱1.34M across 1,120 invoices).

### Scenario 2: Accounting-Grade CSV Export Generation
1. In any period view (e.g. Daily or Monthly), locate the **Export CSV** (or **Export CSV / Print**) button in the toolbar.
2. Click the button.
3. Observe that a direct browser download is triggered with filename formatted as `swift_revenue_report_YYYY-MM-DD.csv`.
4. Open the downloaded file in Excel, LibreOffice Calc, or VS Code text viewer.
5. Verify:
   - RFC 4180 headers: `Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %`
   - All categories listed with valid numeric values.
   - Summary `Total` footer row correctly summarizes all columns.

### Scenario 3: Printable Executive Summary Layout Trigger
1. Trigger print in your browser via `Ctrl+P` (or `Cmd+P` on Mac), or click the print trigger button.
2. Review the print preview window:
   - The navigation sidebar, mobile drawers, filter buttons, and action buttons are completely hidden (`print:hidden`).
   - The four financial summary cards and the Category Revenue & Margin Breakdown table are rendered cleanly on a pure white background.

### Scenario 4: Graceful Zero-Data & Empty Period Handling
1. Switch to a store or simulated period with zero transactions.
2. Observe:
   - Summary stat cards display `₱0.00` with `0 Completed Invoices`.
   - Category rows display `0` units, `₱0.00` revenue, `₱0.00` COGS, `₱0.00` profit, and `0.0%` margin.
   - Clicking Export CSV produces a valid CSV file with zero-value totals without errors.

---

## 3. Automated Test Execution

Run the dedicated test suites:
```bash
npm test -- lib/analytics/__tests__/export-dispatcher.test.ts
npm test -- components/admin/reports/__tests__/reports-view-client.test.tsx
```

Run full project verification:
```bash
npm run typecheck
npm run lint
```
