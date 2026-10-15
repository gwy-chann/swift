# Implementation Tasks: Multi-Period Sales Filter & Accounting CSV Export Dispatcher

**Feature Directory**: `specs/037-multi-period-sales-filter-accounting-csv-export-dispatcher`  
**Feature Branch**: `feat/SIAA-37-multi-period-sales-filter-accounting-csv-export-dispatcher`  
**Jira Ticket**: [SIAA-37](https://the-three-devsketeers.atlassian.net/browse/SIAA-37) (STORY-6.5)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  

---

## Task List & Execution Status

### Phase 1: Contracts & Domain Models
- [x] **Task 1.1**: Define contracts & schemas in `specs/037-multi-period-sales-filter-accounting-csv-export-dispatcher/contracts/accounting-export.contract.ts` and sync with `lib/types/analytics.ts`.
- [x] **Task 1.2**: Write unit tests for contracts and boundary validation in `lib/analytics/__tests__/export-dispatcher-contracts.test.ts`.

### Phase 2: Accounting CSV Dispatcher & Period Math (TDD)
- [x] **Task 2.1**: Implement unit tests for RFC 4180 CSV generation, cell sanitization, period calculations, and zero-data handling in `lib/analytics/__tests__/export-dispatcher.test.ts`.
- [x] **Task 2.2**: Implement `lib/analytics/export.ts` with `sanitizeCsvCell`, `generateAccountingCsvString`, `computePeriodDateRange`, and Server Action `exportAccountingCsvAction`.
- [x] **Task 2.3**: Update `lib/admin/pnl-actions.ts` to support multi-period analytics querying (`daily`, `weekly`, `monthly`) with completed invoice counts and zero-data fallbacks.

### Phase 3: UI Components & Print Stylesheet (TDD)
- [x] **Task 3.1**: Update `components/admin/reports/financial-summary-cards.tsx` to display Completed Invoices count, Gross Revenue, COGS, Net Profit, and Margin % adhering strictly to design tokens.
- [x] **Task 3.2**: Update `components/admin/reports/category-pnl-table.tsx` with itemized category figures, units sold (integer parts count vs. `X Jobs`), and high-margin visual highlighting (`text-success font-semibold`).
- [x] **Task 3.3**: Enhance `components/admin/reports/reports-view-client.tsx` with:
  - Multi-period filter buttons (`Daily Sales`, `Weekly Sales`, `Monthly Sales`) toggling `btn-primary` vs `btn-secondary` styles.
  - Interactive non-blocking transitions via React 19 `useTransition`.
  - Accounting-grade RFC 4180 CSV export download dispatcher (`swift_revenue_report_YYYY-MM-DD.csv`).
  - Printable executive layout trigger (`window.print()`).
  - Clean `@media print` / `print:hidden` styling that hides sidebars, topbars, buttons, and navigation controls.
  - Graceful zero-data handling with `₱0.00` across 0 invoices.
- [x] **Task 3.4**: Implement component tests in `components/admin/reports/__tests__/reports-view-client.test.tsx` verifying filter switching, active styling, CSV dispatch, and zero-data state.

### Phase 4: Route Assembly & Integration
- [x] **Task 4.1**: Wire `app/admin/reports/page.tsx` as a Server Component fetching initial daily report data and rendering `ReportsViewClient` under `#view-reports`.
- [x] **Task 4.2**: Verify print layout styles in `app/globals.css` ensuring `print:hidden` properly suppresses sidebars and administrative chrome.

### Phase 5: Verification & Quality Gates
- [x] **Task 5.1**: Execute automated test suite (`npm test`).
- [x] **Task 5.2**: Run strict TypeScript compiler verification (`npx tsc --noEmit`).
- [x] **Task 5.3**: Run linter checks (`npx eslint`).
- [x] **Task 5.4**: Execute Atomic Commits following `.agents/rules/atomic-commit.md`.
