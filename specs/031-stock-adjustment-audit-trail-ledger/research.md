# Technical Research & Architectural Decisions: Stock Adjustment Audit Trail Ledger Query Engine & Shrinkage Analytics

**Feature**: Stock Adjustment Audit Trail Ledger Query Engine & Shrinkage Analytics Action  
**Jira Issue**: [SIAA-65](https://the-three-devsketeers.atlassian.net/browse/SIAA-65) (STORY-7.10)  
**Spec Reference**: [`specs/031-stock-adjustment-audit-trail-ledger/spec.md`](spec.md)  

---

## 1. Architectural Strategy & Query Engine Design

### 1.1 Context & Background
In SWIFT, inventory adjustments occur across varied scenarios:
- Scheduled physical stock takes (count reconciliations)
- Damaged goods write-offs from shipping or handling
- Internal workshop consumption (oil, degreaser, bolts used during repairs)
- Vendor warranty returns
- POS checkout decrements (logged via `process_pos_checkout` RPC)

All these events write an immutable audit entry to `public.stock_adjustment_logs` (provisioned in SIAA-46 / migration `20261011000000_stock_adjustment_rpc.sql`).

### 1.2 Query Engine Pattern
The query engine is encapsulated within a Next.js Server Action in `lib/admin/stock-audit-actions.ts`:
- **Primary Source**: Queries `public.stock_adjustment_logs` via the SSR Supabase client (`createClient()` from `lib/supabase/server.ts`).
- **Dynamic Filter Composition**:
  - `sku`: Uses case-insensitive ILIKE search (`%${sku}%`) to capture prefix matches or exact barcodes.
  - `adjustmentType`: Filtered with exact equality (`.eq('adjustment_type', type)`), omitting filter when `type === 'All'`.
  - `search`: Searches across `sku`, `reason`, and `user_name` using Supabase `.or()` clause or multi-field evaluation.
  - `dateRange`: Filters via `.gte('created_at', startDate)` and `.lte('created_at', endDate)`.
  - `order`: Deterministic ordering via `.order('created_at', { ascending: false }).order('id', { ascending: false })`.
- **In-Memory & Offline Fallback**:
  - In environments without live Supabase database connections (unit tests, offline staging, storybook), the Server Action falls back to an in-memory audit store seeded from `SWIFT_DB.stockAdjustmentLogs` (`mockup/app.js`).

---

## 2. Immutability & Database-Enforced Tamper Resistance

### 2.1 Database Guarantees
- The table `public.stock_adjustment_logs` has a trigger `trigger_guard_stock_adjustment_logs`:
  ```sql
  CREATE TRIGGER trigger_guard_stock_adjustment_logs
      BEFORE UPDATE OR DELETE ON public.stock_adjustment_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_stock_adjustment_log_tampering();
  ```
  Which raises `TAMPER_FORBIDDEN: stock_adjustment_logs is an immutable append-only ledger. Updates and deletions are strictly prohibited.`
- Permissions on `public.stock_adjustment_logs`:
  - `REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.stock_adjustment_logs FROM authenticated, anon, public;`
  - `GRANT SELECT, INSERT ON TABLE public.stock_adjustment_logs TO authenticated;`

### 2.2 Presentation Layer Guarantees
- The UI in `app/admin/logs/page.tsx` renders audit rows strictly as read-only display elements.
- No buttons, dropdown menus, or keyboard shortcuts exist for modifying, soft-deleting, or archiving log entries.
- Each row displays the immutable attribution metadata (`created_at`, `user_name`, `previous_stock`, `new_stock`, `quantity_delta`, `reason`).

---

## 3. Shrinkage & Unit Delta Aggregation Analytics

### 3.1 Mathematical Formulations
- **Net Unit Delta**:
  $$\text{Net Delta} = \sum_{i=1}^{N} \text{quantity\_delta}_i$$
  A positive net delta indicates overall inventory intake or count surplus; a negative net delta indicates overall net inventory depletion.
- **Total Shrinkage (Units)**:
  $$\text{Total Shrinkage} = \sum_{i=1}^{N} |\min(0, \text{quantity\_delta}_i)| \quad \text{for loss categories (Damaged Goods, Shrinkage, Theft, Discrepancy)}$$
  Provides instant visibility into warehouse shrinkage without manual spreadsheet calculation.
- **Total Intake (Units)**:
  $$\text{Total Intake} = \sum_{i=1}^{N} \max(0, \text{quantity\_delta}_i)$$

### 3.2 Aggregation Execution
The server action computes these metrics over the filtered set in memory or via PostgreSQL aggregates, returning `StockAuditSummaryMetrics` alongside the row items to populate summary KPI cards.

---

## 4. RFC 4180 Compliance CSV Export Pipeline

### 4.1 Export Architecture
- `exportStockAdjustmentLogsAction` receives the same filter parameters as the query action.
- Fetches all matching records (up to a safe limit of 1000 records).
- Generates standard CSV with:
  - Header line: `Timestamp,SKU,Adjustment Type,Quantity Delta,Previous Stock,New Stock,Reason,Authorized User`
  - Proper escaping: fields containing commas, double quotes, or newlines are wrapped in double quotes, with internal quotes escaped as `""`.
- Formats dates in ISO 8601 UTC timestamp format (`YYYY-MM-DD HH:mm:ss UTC`).
- Returns `{ success: true, csvContent: string, filename: string, recordCount: number }`.
- Client triggers a browser download using a standard Blob / Object URL workflow.

---

## 5. UI Component Hierarchy & Token Design

### 5.1 Component Breakdown
- `app/admin/logs/page.tsx`: Top-level Server Component page wrapper.
- `components/admin/logs/stock-audit-panel.tsx`: Client boundary containing interactive filters, KPI summary bar, table, and CSV export handler.
- `components/admin/logs/stock-audit-table.tsx`: Data table with `#stockAdjLogsBody` rendering color-coded delta pills.
- `components/admin/logs/stock-audit-summary-kpis.tsx`: KPI cards displaying Total Logs, Net Delta, and Total Shrinkage.

### 5.2 Design Tokens & Semantic Styling
- Table container: `bg-bg-card border border-border rounded-lg`
- Table header: `bg-bg-surface text-text-secondary font-semibold text-xs uppercase tracking-wider`
- Table rows: `hover:bg-bg-hover transition-colors border-b border-border`
- Delta Badges:
  - Positive change (`+N`): `text-success font-bold bg-success-light px-2 py-0.5 rounded-full text-xs`
  - Negative change (`-N`): `text-danger font-bold bg-danger-light px-2 py-0.5 rounded-full text-xs`
  - Zero change: `text-text-muted text-xs`
- Type Badges:
  - `Physical Count`: `bg-info-light text-info border border-info/20`
  - `Damaged Goods`: `bg-danger-light text-danger border border-danger/20`
  - `Supplier Return`: `bg-accent-light text-accent border border-accent/20`
  - `POS Sale`: `bg-primary-light text-primary border border-primary/20`
  - Default: `bg-bg-surface text-text-secondary border border-border`
