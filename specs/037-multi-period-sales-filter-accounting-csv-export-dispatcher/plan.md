# Technical Implementation Plan: Multi-Period Sales Filter & Accounting CSV Export Dispatcher

**Feature Directory**: `specs/037-multi-period-sales-filter-accounting-csv-export-dispatcher`  
**Feature Branch**: `feat/SIAA-37-multi-period-sales-filter-accounting-csv-export-dispatcher`  
**Jira Ticket**: [SIAA-37](https://the-three-devsketeers.atlassian.net/browse/SIAA-37) (STORY-6.5)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  

---

## 1. Architectural Overview & Boundaries

```
[Browser / User]
       │
       ▼ (Navigates to /admin/reports)
[app/admin/reports/page.tsx (Server Component)]
       │
       ├─► Calls getCategoryPnlBreakdownAction('daily') server action
       │
       ▼ (Hydrates initial state)
[components/admin/reports/reports-view-client.tsx (Client Leaf)]
       │
       ├─► [Period Filter Toolbar (Daily | Weekly | Monthly)]
       │       └─► Triggers startTransition(fetchPeriodData)
       │
       ├─► [Export CSV & Print Action Dispatcher]
       │       ├─► Generates RFC 4180 CSV blob & browser download
       │       └─► Triggers window.print() with @media print CSS
       │
       ├─► [FinancialSummaryCards.tsx (Gross Revenue, COGS, Net Profit, Margin %)]
       │
       └─► [CategoryPnlTable.tsx (Itemized Categories & Target Margin Highlighting)]
```

---

## 2. Component & Module Breakdown

### 2.1 Server Action & CSV Export Dispatcher (`lib/analytics/export.ts`)
- Functions:
  - `sanitizeCsvCell(val: string | number): string`: Enforces RFC 4180 sanitization, quotes cells with commas/quotes/newlines, escapes double quotes as `""`.
  - `generateAccountingCsvString(data: MultiPeriodReportData | CategoryPnlData): string`: Produces standard headers (`Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %`), category lines, and total summary footer with CRLF breaks.
  - `computePeriodDateRange(period: AnalyticsPeriod): { start: Date; end: Date }`: Calculates start and end timestamps for daily, weekly, and monthly periods.
  - `exportAccountingCsvAction(params)`: Next.js Server Action returning compiled CSV string and filename metadata.

### 2.2 Multi-Period Server Actions (`lib/admin/pnl-actions.ts`)
- Integrates with Supabase RPC `get_category_pnl(p_start_date, p_end_date)` when live credentials exist.
- Employs deterministic period scaling fallback when offline or during testing:
  - Daily: ~₱45,230.00 gross revenue across 38 invoices
  - Weekly: ~₱318,500.00 gross revenue across 260 invoices
  - Monthly: ~₱1,340,000.00 gross revenue across 1,120 invoices

### 2.3 Interactive Reports Client Component (`components/admin/reports/reports-view-client.tsx`)
- Container: Root `<section id="view-reports" className="space-y-6 animate-fadeIn">`.
- Period filter buttons: Grouped with ARIA attributes (`role="group"`, `aria-label="Sales Period Filter"`).
  - Active: `bg-primary text-text-light shadow-xs`
  - Inactive: `text-text-secondary hover:text-text-primary hover:bg-bg-hover`
- Action buttons:
  - Export CSV: triggers download of RFC 4180 CSV file named `swift_revenue_report_YYYY-MM-DD.csv`.
  - Print Summary: invokes `window.print()` to trigger clean printable view.
- Non-blocking state transition: React 19 `useTransition` with subtle opacity reduction (`opacity-60 pointer-events-none`) while refreshing data.

### 2.4 Print Stylesheet Optimization
- In `app/globals.css` or component utility classes:
  - Ensure all administrative elements have `print:hidden`: sidebar, topbar, mobile drawer, interactive filter toolbar, export buttons.
  - Ensure table rows and stat cards have `print:break-inside-avoid`.
  - Reset backgrounds for print compatibility: `print:bg-white print:text-black print:border-neutral-300`.

---

## 3. SWIFT Design Tokens Adherence
- Strict compliance with `lib/tokens.ts` and `app/globals.css`.
- Zero hardcoded colors.
- All colors use semantic variables:
  - Primary action: `bg-primary`, `text-primary`, `text-text-light`
  - Cards: `bg-bg-card`, `border-border`
  - Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`
  - Profit highlights: `text-success font-semibold`, `bg-success-light`

---

## 4. Test Strategy & Quality Gates
1. **Unit Tests (`lib/analytics/__tests__/export-dispatcher.test.ts`)**:
   - RFC 4180 cell sanitization (quotes, commas, newlines, empty strings, numbers).
   - Correct CSV headers and footer summary totals.
   - Zero-data / empty range graceful generation.
   - Date range boundaries for daily, weekly, and monthly periods.
2. **Component Tests (`components/admin/reports/__tests__/reports-view-client.test.tsx`)**:
   - Filter toggle interaction and active button styling (`btn-primary` vs `btn-secondary`).
   - Summary card values updating upon period switch.
   - CSV export download link dispatching.
   - Zero-data safe rendering with `₱0.00` and 0 invoices.
3. **Static Quality Verification**:
   - `npm run typecheck` (strict TypeScript validation).
   - `npm run lint` (ESLint and style rules).
