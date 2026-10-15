# Research & Architecture Decisions: Supabase Executive Analytics, 7-Day Trend & Categorized P&L COGS RPCs

**Feature**: `067-supabase-executive-analytics-trend-pnl-cogs-rpcs`  
**Jira Issue**: [SIAA-67](https://the-three-devsketeers.atlassian.net/browse/SIAA-67) (STORY-6.7)  

---

## 1. Objective & Scope

Design and implement high-performance PostgreSQL stored procedures (RPCs) in Supabase for SWIFT executive analytics:
1. `get_executive_kpis`: Fast single-row operational KPI aggregator.
2. `get_revenue_trend_7d`: Rolling 7-day revenue comparison (parts counter sales vs. workshop labor services) with normalized bar height percentages.
3. `get_category_pnl`: Categorized Profit & Loss and COGS engine with overall financial summary.
4. Client RPC binding layer `lib/analytics/rpc.ts`, TypeScript domain contracts, and unit/integration test suites.

---

## 2. Existing Schema & Performance Precedents

### 2.1 Relevant Database Tables
- `public.transactions` (`20261014000000_pos_transactions.sql`):
  - Primary Key: `id UUID`
  - Created at: `created_at TIMESTAMPTZ` (indexed via `idx_transactions_created_at`)
  - Financial columns: `subtotal NUMERIC(10, 2)`, `total_due NUMERIC(10, 2)`
- `public.transaction_items` (`20261014000000_pos_transactions.sql`):
  - Transaction FK: `transaction_id UUID REFERENCES public.transactions(id)`
  - Item discriminator: `item_type TEXT CHECK (item_type IN ('part', 'service'))`
  - Item reference: `item_sku_or_code TEXT`
  - Pricing & quantity: `unit_price NUMERIC(10, 2)`, `quantity INT`, `subtotal NUMERIC(10, 2)`
- `public.products` (`20261010000000_inventory_products.sql`):
  - Identifier: `sku TEXT NOT NULL UNIQUE`
  - Classification: `category TEXT NOT NULL`
  - Valuation: `cost NUMERIC(10, 2) NOT NULL`, `retail NUMERIC(10, 2) NOT NULL`
  - Stock levels: `stock INTEGER NOT NULL`, `min_threshold INTEGER NOT NULL`
- `public.work_orders` (`20261020000000_service_bays_work_orders.sql`):
  - Status: `status TEXT CHECK (status IN ('QUEUED', 'IN PROGRESS', 'PENDING_PARTS', 'COMPLETED', 'CANCELLED'))`
  - Indexed via `idx_work_orders_status` and `idx_work_orders_status_created_at`.

---

## 3. Architecture & Query Optimization Decisions

### 3.1 Migration Filename & Timestamp Sequence
- **Decision**: Name migration `20261021000000_executive_analytics_rpcs.sql`.
- **Rationale**: Follows `20261020000000_service_bays_work_orders.sql` deterministically, maintaining strict chronological migration sequencing.

### 3.2 Aggregation Execution Strategy (<50ms Target)
- **Problem**: Querying raw transactions over HTTP and performing calculations in Node.js transfers thousands of records and causes network latency.
- **Decision**: Execute all mathematical aggregations directly inside PostgreSQL using CTEs (`WITH` clauses) and aggregate window functions.
- **RPC `get_executive_kpis`**:
  - Uses `json_build_object` to assemble the payload in a single database roundtrip.
  - Computes `today` and `yesterday` revenue in one pass using conditional filtering (`FILTER (WHERE created_at::DATE = p_date)`).
  - Calculates month-to-date (MTD) revenue and COGS using a CTE joining `transaction_items` and `products` between `DATE_TRUNC('month', p_date::timestamp)` and `p_date + interval '1 day'`.
  - Performs non-blocking index scans on `idx_work_orders_status` for active bay counts and `products` for critical low stock count.
- **RPC `get_revenue_trend_7d`**:
  - Generates a calendar series `generate_series(p_end_date - interval '6 days', p_end_date, interval '1 day')`.
  - Left joins daily sums of parts vs. service line items.
  - Finds the max combined revenue across the 7-day period using a window function `MAX(daily_total) OVER ()`.
  - Computes normalized height percentages: `ROUND((daily_parts / NULLIF(max_total, 0)) * 100, 2)`.
- **RPC `get_category_pnl`**:
  - Groups items by product `category` (Fluids, Drivetrain, Brakes, Ignition, Engine, Tires, Accessories) and Workshop Labor.
  - COGS for parts is `SUM(ti.quantity * COALESCE(p.cost, 0))`; COGS for workshop labor is `0.00`.
  - Returns a unified JSON document containing `categories` array and `summary` object:
    `{ "categories": [...], "summary": { "total_units_sold", "total_gross_revenue", "total_cogs", "total_net_profit", "overall_margin_pct" } }`.

### 3.3 Zero-Data & Safe Arithmetic Guard
- All percentage calculations use `NULLIF(denominator, 0)`:
  - If denominator is 0 or null, returns `0.00` via `COALESCE(..., 0.00)`.
  - Guarantees zero SQL `division_by_zero` exceptions.

### 3.4 Permissions & Security (RLS)
- Both RPCs run as `SECURITY DEFINER` with search path set to `public`.
- Access granted to `authenticated` and `service_role`.
- Callers must have `admin` or `manager` roles to access business analytics.
