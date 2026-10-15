# Feature Specification: Executive Analytics Next.js Server Actions, Accounting CSV Dispatcher & UI Wiring

**Feature Branch**: `feat/SIAA-69-executive-analytics-server-actions-accounting-csv-ui-wiring`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-69](https://the-three-devsketeers.atlassian.net/browse/SIAA-69) (STORY-6.9)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Prerequisites**: [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66) (STORY-6.6: Supabase Service Bay Work Orders Schema), [SIAA-67](https://the-three-devsketeers.atlassian.net/browse/SIAA-67) (STORY-6.7: Supabase Executive Analytics RPCs), [SIAA-68](https://the-three-devsketeers.atlassian.net/browse/SIAA-68) (STORY-6.8: Supabase Realtime Operational Broadcast)  
**Blocks / Enables**: [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (Executive KPI Dashboard), [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (7-Day Revenue Trend Engine), [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35) (Live Service Bay Queue Monitor), [SIAA-36](https://the-three-devsketeers.atlassian.net/browse/SIAA-36) (Categorized P&L Breakdown), [SIAA-37](https://the-three-devsketeers.atlassian.net/browse/SIAA-37) (Multi-Period Filter & Accounting CSV Export)

---

## Executive Summary & Business Intent

The SWIFT Motorcycle Parts POS and Workshop Management platform requires full end-to-end integration between the Supabase database tier (stored procedures, realtime publications) and the Admin Portal user interface. Executive business owners and shop accountants need real-time data flow from database transactions to KPI summary cards, interactive 7-day revenue trend visualizations, live workshop service bay queue updates, and a dedicated financial Reports & P&L breakdown module with accounting-grade CSV exports.

This feature implements type-safe Next.js Server Actions in `lib/analytics/actions.ts`, an RFC 4180-compliant accounting CSV export engine in `lib/analytics/export.ts`, server hydration for the Admin Dashboard (`app/admin/page.tsx`), and a rich, interactive P&L breakdown view at `/admin/reports` with dynamic multi-period filtering (Daily, Weekly, Monthly) and zero hardcoded colors.

---

## Clarifications & Edge Cases Resolved

### Session 2026-10-15
- **Q1: Period Date Range Boundaries**:
  - `daily`: Start of current local day (`00:00:00.000`) to current timestamp or end of day (`23:59:59.999`).
  - `weekly`: Rolling 7 days prior to current timestamp through end of current day.
  - `monthly`: Start of the current calendar month (`1st 00:00:00.000`) to current timestamp.
- **Q2: Session & Auth Enforcement**:
  - Server Actions validate session authentication via `getServerSession()`. When running in authenticated production or demo mode, actions return database or deterministic fallback data without crashing. Unauthorized access returns explicit typed error payloads.
- **Q3: CSV Export Formatting**:
  - Adheres strictly to RFC 4180: comma-delimited, fields containing commas or quotes enclosed in double quotes, escaped internal quotes. Includes column headers (`Category, Units Sold, Gross Revenue, COGS, Net Profit, Margin %`) and a summary footer row.
- **Q4: High-Margin Highlighting**:
  - Categories with profit margin $\ge 70.0\%$ (e.g. Workshop Labor) display prominent `text-success font-bold` styling per SWIFT design tokens.
- **Q5: Realtime & Server Hydration Cohesion**:
  - `app/admin/page.tsx` fetches initial server state via Server Actions and passes initial props to `AdminDashboardClient`, which seamlessly integrates with `useExecutiveRealtime` for optimistic updates.

---

## User Scenarios & Acceptance Criteria *(mandatory)*

### User Story 1 - Authenticated Analytics Server Actions Dispatcher (Priority: P1)

As an Administrator or Shop Accountant,  
I want type-safe Next.js Server Actions in `lib/analytics/actions.ts`,  
so that server components and client views can securely query executive KPIs, revenue trends, categorized P&L breakdowns, and manage service bay work orders with full session validation.

**Why this priority**: Server Actions form the foundational bridge between UI components and backend Supabase stored procedures / tables.

**Independent Test**: Execute unit test suite verifying `getExecutiveKpisAction()`, `getRevenueTrendAction()`, `getCategoryPnlAction()`, `getServiceBayStatusAction()`, and `updateWorkOrderStatusAction()`.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Dispatching getExecutiveKpisAction successfully
  Given an authenticated admin user or valid session
  When executing getExecutiveKpisAction()
  Then the action queries Supabase get_executive_kpis stored procedure
  And returns typed ExecutiveKpiData with gross revenue, growth variance, active work orders, and low-stock count.

Scenario: Dispatching getRevenueTrendAction successfully
  Given an authenticated session
  When executing getRevenueTrendAction()
  Then the action queries get_revenue_trend_7d
  And returns typed WeeklyRevenueData containing rolling 7-day parts and labor splits.

Scenario: Dispatching getCategoryPnlAction with period filter
  Given a requested period of "daily", "weekly", or "monthly"
  When executing getCategoryPnlAction({ period })
  Then the action computes the correct ISO date boundary
  And calls get_category_pnl RPC returning CategoryPnlData with categories and summary totals.

Scenario: Dispatching getServiceBayStatusAction
  Given active service bays and work orders in the database
  When executing getServiceBayStatusAction()
  Then the action returns an array of ServiceBayDisplayItem with bay names, assigned vehicles, mechanics, and operational status.

Scenario: Updating work order status via updateWorkOrderStatusAction
  Given a valid work_orders UUID, new status "COMPLETED", and optional notes
  When executing updateWorkOrderStatusAction(orderId, status, notes)
  Then the database record is updated with status and timestamp
  And revalidatePath is triggered for /admin and /admin/reports.
```

---

### User Story 2 - Accounting-Grade CSV Export Generation & Direct Download (Priority: P1)

As a Shop Accountant,  
I want an export dispatcher generating RFC 4180-compliant CSV financial spreadsheets,  
so that I can export categorized P&L statements directly to my accounting software with accurate totals and zero corruption.

**Why this priority**: Required for statutory reporting, financial reconciliation, and tax documentation.

**Independent Test**: Execute `exportAccountingCsvAction({ period: 'daily' })`, verify output header structure, row calculations, escaping, summary footer row, and file naming pattern `swift_financial_report_<date>.csv`.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Exporting accounting CSV for selected period
  Given an accountant viewing financial analytics
  When invoking exportAccountingCsvAction({ period: "monthly" })
  Then it returns sanitized CSV content with columns: Category, Units Sold, Gross Revenue, COGS, Net Profit, Margin %
  And appends a summary footer row with total units, gross revenue, cogs, net profit, and overall margin %
  And formats currency amounts to two decimal places without raw symbol corruption
  And suggests filename "swift_financial_report_YYYY-MM-DD.csv".
```

---

### User Story 3 - Admin Dashboard Server Hydration & Live Integration (Priority: P1)

As an Executive or Store Manager visiting `/admin`,  
I want the Admin Dashboard page to hydrate with live database metrics from Server Actions,  
so that cards, charts, and service bays reflect immediate operational reality without layout shifts or placeholder defaults.

**Why this priority**: Executive landing view must immediately communicate real operational health upon initial page load.

**Independent Test**: Load `/admin`, verify `AdminDashboardClient` receives initial props from `getExecutiveKpisAction`, `getRevenueTrendAction`, and `getServiceBayStatusAction`.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Hydrating Admin Dashboard
  Given the user navigates to /admin
  When page.tsx renders as an async Server Component
  Then it fetches KPI data, 7-day revenue trend, and service bay status concurrently
  And passes hydrated data as props to AdminDashboardClient
  And AdminKpiGrid displays live Gross Revenue, Net Margin, Active Bays, and Low-Stock counts
  And RevenueComparisonChart displays populated 7-day bar chart
  And ServiceBayStatusCard displays live workshop bay cards.
```

---

### User Story 4 - Interactive Reports & P&L Module UI (`/admin/reports`) (Priority: P1)

As an Accountant or Executive visiting `/admin/reports`,  
I want an interactive P&L breakdown table with dynamic period filters and CSV download,  
so that I can analyze profit margins per category, spot high-margin labor services, and audit cost of goods sold.

**Why this priority**: Provides the primary financial intelligence tool for SWIFT administrators.

**Independent Test**: Navigate to `/admin/reports`, click between Daily, Weekly, and Monthly tabs, verify table recalculates, high-margin rows highlight, and Export CSV button initiates download.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Switching P&L time periods
  Given the user is on /admin/reports
  When clicking "Weekly Sales" filter button
  Then the active button styling switches using semantic design tokens
  And the 4 summary cards (Gross Revenue, Total COGS, Net Profit, Margin %) update dynamically
  And the table re-renders rows for all product categories and Workshop Labor
  And rows with margin >= 70% display "text-success font-bold".

Scenario: Triggering CSV download from Reports toolbar
  Given the user on /admin/reports
  When clicking "Export CSV / Print" button
  Then a sanitized CSV file named "swift_financial_report_<date>.csv" is generated and downloaded in the browser.
```

---

## Non-Functional Requirements & Design Tokens Compliance

1. **Zero Hardcoded Colors**:
   - Backgrounds: `bg-bg-base`, `bg-bg-card`, `bg-bg-surface`, `bg-bg-muted`, `bg-primary-light`, `bg-success-light`, `bg-danger-light`.
   - Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-primary`, `text-success`, `text-danger`.
   - Borders: `border-border`, `border-border-subtle`, `border-primary-border`.
   - No arbitrary `#` hex codes or unconfigured tailwind classes.
2. **Performance**:
   - Server Action resolution < 150ms.
   - Initial page render Time to First Byte (TTFB) < 300ms.
   - Cumulative Layout Shift (CLS) = 0.
3. **Accessibility**:
   - WCAG 2.1 AA compliant table headers with `scope="col"`, `role="table"`.
   - Interactive buttons with clear accessible labels and keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-primary`).
4. **Resilience**:
   - Graceful fallback when database connection is unavailable or tables are empty.
