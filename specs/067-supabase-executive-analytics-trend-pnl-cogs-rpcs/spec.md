# Feature Specification: Supabase Executive Analytics, 7-Day Trend & Categorized P&L COGS RPCs

**Feature Branch**: `feat/SIAA-67-supabase-executive-analytics-trend-pnl-cogs-rpcs`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-67](https://the-three-devsketeers.atlassian.net/browse/SIAA-67) (STORY-6.7)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Prerequisites**:
- [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66) (STORY-6.6: Supabase Service Bay Work Orders Schema)
- [SIAA-45](https://the-three-devsketeers.atlassian.net/browse/SIAA-45) (STORY-2.6: Supabase Master Parts Catalog Schema)
- [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50) (STORY-3.7: Supabase POS Transactions Schema)
- [SIAA-51](https://the-three-devsketeers.atlassian.net/browse/SIAA-51) (STORY-3.8: Supabase Atomic Checkout RPC with Stock Decrements)  
**Downstream Dependents**:
- STORY-6.9 (Executive Analytics Next.js Server Actions, Accounting CSV Dispatcher & UI Wiring)
- [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (STORY-6.1: Executive KPI Dashboard & Real-Time Operational Health Metric Cards)
- [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (STORY-6.2: 7-Day Revenue Trend Comparison Engine)
- [SIAA-36](https://the-three-devsketeers.atlassian.net/browse/SIAA-36) (STORY-6.4: Categorized Profit & Loss (P&L) Breakdown & COGS Engine)

---

## Clarifications

### Session 2026-10-15
- Q: How should zero denominator revenue growth and margin percentages be handled? → A: Return 0.00 via NULLIF without throwing SQL exceptions.
- Q: What categories should be represented in the P&L engine? → A: Catalog categories (Fluids, Drivetrain, Brakes, Ignition, Engine, Tires, Accessories) and Workshop Labor.
- Q: How should 7-day bar heights be normalized? → A: Normalized against peak daily total revenue over the 7-day window.

## Executive Summary & Business Intent

In high-volume motorcycle parts retailing and workshop operations, executive dashboards require immediate operational visibility without loading thousands of raw transaction rows, audit ledgers, and work orders over the network. 

This specification introduces three high-performance PostgreSQL stored procedures (RPCs) inside Supabase that compute database-side aggregations in under 50ms:
1. `public.get_executive_kpis(p_date DATE DEFAULT CURRENT_DATE)`: Computes daily gross revenue, growth variance vs. yesterday, month-to-date net margin % and gross profit with Cost of Goods Sold (COGS) deductions, active service bay work orders, pending parts counts, and critical low-stock inventory alerts.
2. `public.get_revenue_trend_7d(p_end_date DATE DEFAULT CURRENT_DATE)`: Aggregates a rolling 7-day revenue split between physical motorcycle parts and workshop labor services, pre-computing normalized bar height percentages (0-100%) against the weekly peak day.
3. `public.get_category_pnl(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)`: Aggregates revenue, unit volume, COGS (`quantity * unit_cost`), net profit, and profit margin percentages across motorcycle product categories and workshop labor, delivering both categorized breakdowns and overall summary totals.
4. Client-side typed bindings and schema contracts in `lib/analytics/rpc.ts` and `contracts/analytics-rpc.contract.ts` ensuring end-to-end type safety, zero-data resilience, and zero hardcoded UI styling tokens.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operational Executive KPI Aggregator (Priority: P1)

As a Motorcycle Shop Owner or General Manager,  
I want a consolidated database RPC `get_executive_kpis` that returns today's gross revenue, yesterday's comparison, active workshop bay load, MTD profit margin, and inventory stock alert counts in a single roundtrip,  
so that executive KPI cards render instantaneously (<50ms) upon loading the Admin Dashboard.

**Why this priority**: Serves as the primary operational pulse for the business owner. Without pre-aggregated server-side calculations, calculating MTD margins and revenue trends requires heavy client-side queries against multiple large transactional tables.

**Independent Test**: Execute `SELECT * FROM public.get_executive_kpis('2026-10-15')` on Supabase PostgreSQL and verify output matches expected JSON structure with zero nulls.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Calculating Operational Executive KPIs
  Given settled transactions in public.transactions and active work orders in public.work_orders
  When calling public.get_executive_kpis(p_date => '2026-10-15'::DATE)
  Then the function returns a JSON object containing:
    | field                    | type    | description                                              |
    | gross_revenue_today      | NUMERIC | Sum of completed transactions for p_date                 |
    | gross_revenue_yesterday  | NUMERIC | Sum of completed transactions for p_date - 1             |
    | revenue_growth_pct       | NUMERIC | Percentage variance vs yesterday ((today-yesterday)/yesterday*100)|
    | active_work_orders_count | INTEGER | Count of work orders with status = 'IN PROGRESS'         |
    | pending_parts_count      | INTEGER | Count of work orders with status = 'PENDING_PARTS'       |
    | net_profit_margin_pct    | NUMERIC | Month-to-date profit margin % ((revenue-cogs)/revenue*100)|
    | gross_profit_amount      | NUMERIC | Month-to-date gross profit amount (revenue - cogs)       |
    | critical_low_stock_count | INTEGER | Count of products where stock <= min_threshold           |
  And query execution completes in under 50ms.
```

---

### User Story 2 - Rolling 7-Day Revenue Trend Aggregator (Priority: P1)

As an Executive or Financial Auditor,  
I want a rolling 7-day revenue comparison function `get_revenue_trend_7d` splitting daily parts counter sales and workshop labor services with pre-computed relative heights,  
so that the dual-tone revenue comparison bar chart renders seamlessly without client-side normalization math.

**Why this priority**: Visually contrasts retail counter sales against repair service revenue, enabling management to identify peak days and workshop throughput.

**Independent Test**: Call `SELECT * FROM public.get_revenue_trend_7d('2026-10-15')` and verify 7 sequential daily buckets (Mon..Sun) returned with parts, labor, total, and height percentages normalized to the peak day.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Aggregating 7-Day Revenue Split with Normalized Bar Heights
  Given historical sales transactions spanning the last 7 calendar days
  When calling public.get_revenue_trend_7d(p_end_date => '2026-10-15'::DATE)
  Then the function returns 7 sequential date records ordered chronologically
  And each day record contains:
    | field                | type    | description                                                  |
    | date                 | DATE    | The calendar date of the bucket                              |
    | day_label            | TEXT    | 3-letter day name ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')|
    | parts_amount         | NUMERIC | Sum of item_type = 'part' line item subtotals for that date  |
    | labor_amount         | NUMERIC | Sum of item_type = 'service' line item subtotals for that date|
    | total_amount         | NUMERIC | parts_amount + labor_amount                                  |
    | parts_height_percent | NUMERIC | Relative bar height (0-100%) against highest total in 7 days |
    | labor_height_percent | NUMERIC | Relative bar height (0-100%) against highest total in 7 days |
  And the peak day has a combined height percent of 100%.
```

---

### User Story 3 - Categorized P&L & COGS Breakdown Engine (Priority: P1)

As an Operations Controller or Accountant,  
I want a comprehensive P&L breakdown stored procedure `get_category_pnl` calculating unit volume, gross revenue, COGS, net profit, and profit margin per product category and workshop labor,  
so that high-margin vs. low-margin motorcycle components can be identified across any custom date range.

**Why this priority**: Essential for understanding shop profitability. Calculating COGS by matching sold parts SKUs against product cost attributes identifies inventory shrinkage and margin leakage.

**Independent Test**: Call `SELECT * FROM public.get_category_pnl('2026-10-01T00:00:00Z', '2026-10-15T23:59:59Z')` and verify rows returned for each catalog category and workshop labor with aggregate summary.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Calculating Categorized P&L with COGS Deductions
  Given transaction line items linked to inventory products and workshop labor
  When calling public.get_category_pnl(p_start_date, p_end_date)
  Then the function returns category-level metrics covering:
    | category       | units_sold | gross_revenue | cogs                  | net_profit            | margin_pct                     |
    | Fluids         | INTEGER    | NUMERIC       | units * product_cost  | revenue - cogs        | (net_profit / gross_rev) * 100 |
    | Drivetrain     | INTEGER    | NUMERIC       | units * product_cost  | revenue - cogs        | (net_profit / gross_rev) * 100 |
    | Brakes         | INTEGER    | NUMERIC       | units * product_cost  | revenue - cogs        | (net_profit / gross_rev) * 100 |
    | Ignition       | INTEGER    | NUMERIC       | units * product_cost  | revenue - cogs        | (net_profit / gross_rev) * 100 |
    | Engine         | INTEGER    | NUMERIC       | units * product_cost  | revenue - cogs        | (net_profit / gross_rev) * 100 |
    | Tires          | INTEGER    | NUMERIC       | units * product_cost  | revenue - cogs        | (net_profit / gross_rev) * 100 |
    | Accessories    | INTEGER    | NUMERIC       | units * product_cost  | revenue - cogs        | (net_profit / gross_rev) * 100 |
    | Workshop Labor | INTEGER    | NUMERIC       | 0.00                  | revenue               | 100.00% (or direct labor rate) |
  And returns aggregate summary totals for Total Units Sold, Total Gross Revenue, Total COGS, Net Profit, and Overall Margin %.
```

---

### User Story 4 - Graceful Zero-Data & Boundary Resilience (Priority: P2)

As a System Reliability Engineer,  
I want all analytics RPCs to handle dates with zero transactions, empty date ranges, and division by zero gracefully,  
so that the application never throws unhandled database errors or renders `NaN` / `null` in the user interface.

**Why this priority**: First-day store openings, quiet shifts, and edge date ranges must not crash dashboard widgets.

**Independent Test**: Call all three RPCs with future dates (e.g., `'2099-01-01'`) and verify default `0.00` values, `0` counts, and valid JSON structures.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Invoking RPCs with zero transactional data
  Given a date period with zero transactions in public.transactions
  When calling get_executive_kpis, get_revenue_trend_7d, or get_category_pnl
  Then gross revenue returns 0.00
  And gross profit returns 0.00
  And margin percentages return 0.00 (protected by NULLIF)
  And height percentages return 0.00
  And no SQL divide-by-zero runtime exceptions occur.
```

---

## Edge Cases

- **Zero Total Revenue Across 7 Days**: If all 7 days have 0 sales, `parts_height_percent` and `labor_height_percent` MUST return `0.00` without division-by-zero error.
- **Yesterday Has Zero Sales**: If yesterday's revenue was `0.00` and today's is positive, `revenue_growth_pct` MUST return `100.00` (or `0.00` if both are 0) rather than raising `division by zero`.
- **Product Cost Missing or Unset**: If an older item has `cost IS NULL`, default cost to `0.00` during COGS aggregation.
- **Labor Service Item Matching**: Line items with `item_type = 'service'` belong to the 'Workshop Labor' category and have COGS = `0.00` (gross profit = revenue).
- **Timezone Normalization**: Transactions are stored in UTC (`TIMESTAMPTZ`). Date aggregations must align with shop local date (`Asia/Manila` / UTC+8) or standard date casting.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Database MUST provide `public.get_executive_kpis(p_date DATE DEFAULT CURRENT_DATE)` returning a JSON object with:
  - `gross_revenue_today` (NUMERIC)
  - `gross_revenue_yesterday` (NUMERIC)
  - `revenue_growth_pct` (NUMERIC)
  - `active_work_orders_count` (INTEGER)
  - `pending_parts_count` (INTEGER)
  - `net_profit_margin_pct` (NUMERIC)
  - `gross_profit_amount` (NUMERIC)
  - `critical_low_stock_count` (INTEGER)
- **FR-002**: Database MUST provide `public.get_revenue_trend_7d(p_end_date DATE DEFAULT CURRENT_DATE)` returning a table or JSON array with 7 sequential calendar days containing `date`, `day_label`, `parts_amount`, `labor_amount`, `total_amount`, `parts_height_percent`, and `labor_height_percent`.
- **FR-003**: Database MUST provide `public.get_category_pnl(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)` returning categorized metrics (`category`, `units_sold`, `gross_revenue`, `cogs`, `net_profit`, `margin_pct`) plus summary totals.
- **FR-004**: Stored procedures MUST execute with `SECURITY DEFINER` and grant `EXECUTE` privileges to `authenticated` and `service_role`.
- **FR-005**: All financial calculations MUST format amounts as two-decimal numeric values (e.g. `NUMERIC(10, 2)`) and percentages as `NUMERIC(5, 2)`.
- **FR-006**: Client library `lib/analytics/rpc.ts` MUST export strongly typed async callers invoking the Supabase RPCs with TypeScript types matching `contracts/analytics-rpc.contract.ts`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `get_executive_kpis` completes execution in under 50ms against 10,000+ transaction rows.
- **SC-002**: `get_revenue_trend_7d` completes execution in under 50ms against 10,000+ transaction rows.
- **SC-003**: `get_category_pnl` completes execution in under 100ms across 30-day reporting windows.
- **SC-004**: 100% of division operations in SQL use `NULLIF(..., 0)` to guarantee zero unhandled runtime division exceptions.
- **SC-005**: 100% test coverage for client RPC response parsing, edge cases, and zero-data fallbacks.

---

## Assumptions

- Transactions in `public.transactions` are completed/settled sales records.
- Product costs in `public.products.cost` represent standard acquisition cost for COGS.
- Workshop labor items in `public.transaction_items` have `item_type = 'service'`.
- Access to executive analytics RPCs is restricted to authenticated users with role `admin` or `manager`.
