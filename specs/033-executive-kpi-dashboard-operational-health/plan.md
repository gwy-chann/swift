# Technical Implementation Plan: Executive KPI Dashboard & Real-Time Operational Health Metric Cards

**Feature**: Executive KPI Dashboard & Real-Time Operational Health Metric Cards  
**Jira Issue**: [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (STORY-6.1)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6)  

---

## 1. Architectural Strategy

The Executive KPI cards banner sits at the very top of `#view-dashboard` (`app/admin/page.tsx` -> `AdminDashboardClient`).
To fulfill all 4 Jira acceptance scenarios:
1. **Gross Revenue Card**:
   - Accurately renders Philippine Peso formatted value (`₱45,230.00`).
   - Displays comparative variance badge vs previous business day (`+14.2% vs yesterday`).
   - When real-time sales arrive (`livePulse`), pulses with `LIVE` badge and sale increment notice.
2. **Work Orders Queue Card**:
   - Shows active repair bay jobs count (`8 Active`).
   - Displays subtext warning for jobs awaiting warehouse counter parts (`3 Pending Parts Assembly`).
3. **Net Profit Margin Card**:
   - Shows synthesized net profit percentage (`34.8%`).
   - Shows total gross profit in currency (`₱182,400.00 Gross Profit`).
4. **Critical Low Stock Card**:
   - Shows critical SKU count (`3 SKUs`).
   - Warning badge and text styling (`badge-danger`, `text-danger`).
   - Interactive link redirecting to `/admin/inventory?status=low_stock`.
5. **Inventory Page Wiring**:
   - `app/admin/inventory/page.tsx` parses `searchParams` (`status=low_stock` or `filter=low_stock`) and passes `initialStockFilter` down to `InventoryCatalog`.
   - `InventoryCatalog` initializes with `stockFilter = 'low_stock'` and `lowStockOnly = true`.

---

## 2. File & Component Boundary Changes

| Layer | File | Responsibilities |
| :--- | :--- | :--- |
| **Logic / Helpers** | `lib/analytics/kpi-calculator.ts` | Pure functions for formatting currency (`formatPhilippinePeso`), computing percentage variance (`calculateGrowthVariance`), and deriving low-stock card state. |
| **Component** | `components/admin/admin-kpi-grid.tsx` | Enhanced `AdminKpiGridProps` supporting dynamic props (`grossRevenueYesterday`, `revenueGrowthPct`, `netProfitMarginPct`, `grossProfitAmount`, `lowStockHref`, `onLowStockClick`). Next.js `<Link>` wrapping for low-stock card. Accessible keyboard navigation. |
| **Page / Integration** | `app/admin/admin-dashboard-client.tsx` | Passes dynamic profit metrics and yesterday revenue into `AdminKpiGrid`. |
| **Inventory View** | `app/admin/inventory/page.tsx` | Accepts `searchParams`, extracts `status` / `filter`, and passes `initialStockFilter` to `InventoryCatalog`. |
| **Inventory Catalog** | `components/admin/inventory/inventory-catalog.tsx` | Accepts `initialStockFilter?: StockFilterOption` and initializes state accordingly. |
| **Test Suite** | `lib/analytics/__tests__/kpi-calculator.test.ts` | Unit tests for currency formatting, revenue growth calculation, and low-stock card attributes verifying all 4 Gherkin scenarios. |

---

## 3. Test & Verification Plan

1. **Unit Tests (`lib/analytics/__tests__/kpi-calculator.test.ts`)**:
   - Scenario 1: Gross revenue formatting in PHP and revenue variance calculation (+14.2% vs yesterday, negative variance, zero division).
   - Scenario 2: Active work orders count formatting and pending parts assembly subtext.
   - Scenario 3: Net profit margin percentage and gross profit currency formatting.
   - Scenario 4: Critical low stock danger badge styling, SKU count label, and redirection link URL.
2. **Quality Verification**:
   - `npm test` verifying all suites pass.
   - `npx tsc --noEmit` confirming 0 type errors.
   - `npm run lint` confirming clean ESLint on touched files.
   - Adherence to SWIFT semantic design tokens.
