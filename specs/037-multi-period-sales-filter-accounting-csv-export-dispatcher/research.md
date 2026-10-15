# Technical Research & Architecture Constraints: Multi-Period Sales Filter & Accounting CSV Export Dispatcher

**Feature Directory**: `specs/037-multi-period-sales-filter-accounting-csv-export-dispatcher`  
**Jira Issue**: [SIAA-37](https://the-three-devsketeers.atlassian.net/browse/SIAA-37) (STORY-6.5)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  

---

## 1. Technical Context & Stack Alignment

### 1.1 Next.js App Router & React 19 Boundaries
- **Server Component**: `app/admin/reports/page.tsx` fetches initial P&L financial data server-side and passes it into client leaves to prevent layout shifts.
- **Client Leaf**: `components/admin/reports/reports-view-client.tsx` manages reactive period state (`'daily' | 'weekly' | 'monthly'`), interactive filter transitions via React 19 `useTransition`, CSV file dispatching, and printable summary triggers.
- **Server Action**: `lib/admin/pnl-actions.ts` / `lib/analytics/export.ts` executes server-side period calculations and secure data retrieval via Supabase RPC `get_category_pnl`.

### 1.2 RFC 4180 CSV Export Specifications
- **MIME Type**: `text/csv;charset=utf-8;`
- **Line Breaks**: CRLF (`\r\n`) according to RFC 4180 section 2.1.
- **Escaping Protocol**:
  - Fields containing commas (`,`), line breaks (`\r`, `\n`), or double quotes (`"`) MUST be wrapped in double quotes.
  - Double quotes within field values MUST be escaped by doubling them (`""`).
- **Required Column Headers**:
  1. `Category`
  2. `Units Sold`
  3. `Gross Revenue`
  4. `COGS`
  5. `Net Profit`
  6. `Margin %`
- **Summary Row**: Final row summarizing total units sold, total gross revenue, total COGS, total net profit, and overall margin percentage.
- **Client Dispatching**:
  - Encoded `Blob` or UTF-8 data URI triggered via temporary anchor element with HTML5 `download` attribute.
  - Standardized filename pattern: `swift_revenue_report_YYYY-MM-DD.csv` (or with period suffix `swift_revenue_report_<period>_YYYY-MM-DD.csv`).

### 1.3 Print Stylesheet & Executive Layout Architecture
- **Tailwind CSS v4 Print Utilities**:
  - Apply `print:hidden` to administrative chrome: sidebar (`AdminSidebar`), topbar (`AdminTopbar`), mobile drawer, interactive period filter buttons, and export buttons.
  - Ensure parent containers have `print:p-0 print:m-0 print:border-none print:shadow-none`.
  - Override body and background cards in `@media print` to ensure crisp high-contrast black text on pure white paper backgrounds.
  - Suppress page-break splits inside table rows and summary stat cards using `print:break-inside-avoid`.

### 1.4 Date Boundaries for Timeframe Filtering
- **Daily Sales**: Start of current calendar day (`00:00:00.000`) to current time or end of day (`23:59:59.999`).
- **Weekly Sales**: Rolling 7-day interval (current time minus 6 days, start of day `00:00:00.000`) to current timestamp.
- **Monthly Sales**: Start of current calendar month (`YYYY-MM-01 00:00:00.000`) to current timestamp.
- **Deterministic Mock Engine**: When Supabase is running offline or unseeded, a deterministic multi-period mock engine calculates proportionally scaled realistic figures:
  - Daily: ~₱45,230.00 gross revenue across 38 invoices
  - Weekly: ~₱318,500.00 gross revenue across 260 invoices
  - Monthly: ~₱1,340,000.00 gross revenue across 1,120 invoices

---

## 2. SWIFT Design Tokens & Visual Fidelity
- **Strict Prohibition**: ZERO hardcoded hex (`#...`) or rgb values.
- **Button Styling States**:
  - **Active Filter Button**: `bg-primary text-text-light shadow-xs` (derived from `.btn-primary` in `mockup/style.css`).
  - **Inactive Filter Button**: `text-text-secondary hover:text-text-primary hover:bg-bg-hover` (derived from `.btn-secondary`).
- **Cards & Badges**:
  - Cards: `bg-bg-card border border-border rounded-xl`
  - High-margin accent: `text-success font-semibold`
  - Sub-target margin: `text-text-secondary`
- **Print Trigger Action**:
  - Direct `window.print()` trigger from an "Export CSV / Print" dropdown or dedicated action buttons.

---

## 3. Graceful Zero-Data Fallback Guarantees
- If no transactions exist for the selected interval:
  - Metric cards display `₱0.00` across `0 Completed Invoices`.
  - Categories display with `0` units, `₱0.00` revenue, `₱0.00` COGS, `₱0.00` profit, and `0.0%` margin.
  - CSV export generates valid RFC 4180 headers with zero-filled category rows and summary row, guaranteeing third-party accounting software imports never fail due to malformed headers.
