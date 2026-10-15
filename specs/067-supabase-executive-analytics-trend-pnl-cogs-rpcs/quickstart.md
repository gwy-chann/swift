# Quickstart & Verification Guide: Supabase Executive Analytics, 7-Day Trend & Categorized P&L COGS RPCs

**Feature**: `067-supabase-executive-analytics-trend-pnl-cogs-rpcs`  
**Jira Issue**: [SIAA-67](https://the-three-devsketeers.atlassian.net/browse/SIAA-67) (STORY-6.7)  

---

## 1. Prerequisites

- Node.js v20+
- Dependencies installed: `npm install`
- Supabase PostgreSQL schema with `transactions`, `transaction_items`, `products`, `work_orders` applied.

---

## 2. Applying Database Migration

The RPC migration is located in `supabase/migrations/20261021000000_executive_analytics_rpcs.sql`.

To verify SQL syntax and function definitions:
```bash
# Verify SQL syntax
npx prisma validate
```

---

## 3. Running Automated Tests

Run unit tests covering contract validation, RPC mappers, zero-data resilience, and calculation accuracy:

```bash
# Run analytics unit tests
node --env-file=.env.local --experimental-strip-types --test --test-concurrency=1 "lib/analytics/__tests__/*.test.ts"
```

---

## 4. Manual SQL Verification Scenarios

In Supabase SQL Editor or `psql`:

### 4.1 Executive KPIs RPC
```sql
SELECT public.get_executive_kpis(CURRENT_DATE);
```
Expected output:
```json
{
  "gross_revenue_today": 45230.00,
  "gross_revenue_yesterday": 38400.00,
  "revenue_growth_pct": 17.79,
  "active_work_orders_count": 3,
  "pending_parts_count": 1,
  "net_profit_margin_pct": 34.20,
  "gross_profit_amount": 15468.66,
  "critical_low_stock_count": 5
}
```

### 4.2 7-Day Revenue Trend RPC
```sql
SELECT * FROM public.get_revenue_trend_7d(CURRENT_DATE);
```
Expected output: 7 rows with `day_label`, `parts_amount`, `labor_amount`, `total_amount`, and proportional bar heights (0-100%).

### 4.3 Categorized P&L & COGS RPC
```sql
SELECT public.get_category_pnl(
  date_trunc('month', CURRENT_DATE)::timestamptz,
  (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 second')::timestamptz
);
```
Expected output: JSON with `categories` array (Fluids, Drivetrain, Brakes, Ignition, Engine, Tires, Accessories, Workshop Labor) and `summary` totals.

### 4.4 Boundary Zero-Data Check
```sql
SELECT public.get_executive_kpis('2099-01-01'::DATE);
SELECT * FROM public.get_revenue_trend_7d('2099-01-01'::DATE);
SELECT public.get_category_pnl('2099-01-01'::timestamptz, '2099-01-02'::timestamptz);
```
Expected output: Valid JSON and records with `0.00` numbers and `0` counts without throwing divide-by-zero SQL exceptions.
