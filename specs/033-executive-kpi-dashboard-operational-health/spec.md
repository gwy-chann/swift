# Feature Specification: Executive KPI Dashboard & Real-Time Operational Health Metric Cards

**Feature Branch**: `feat/SIAA-33-executive-kpi-dashboard-operational-health`  
**Created**: 2026-10-15  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (STORY-6.1)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Target View**: Admin Portal Dashboard (`/admin` and container `#view-dashboard`)  
**Prerequisites**: [SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9) (Admin Portal Shell), [SIAA-12](https://the-three-devsketeers.atlassian.net/browse/SIAA-12) (Domain Models & Store), [SIAA-17](https://the-three-devsketeers.atlassian.net/browse/SIAA-17) (Low-Stock Threshold Detection), [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18) (Hybrid POS Cart Engine)  
**Blocks / Enables**: [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (STORY-6.2: 7-Day Revenue Trend Comparison Engine), [SIAA-36](https://the-three-devsketeers.atlassian.net/browse/SIAA-36) (STORY-6.4: Categorized P&L Breakdown & COGS Engine)  

---

## 1. Executive Summary & Objective

In a fast-paced motorcycle dealership, parts distributor, and service workshop, store owners and general managers need immediate, at-a-glance visibility into shop health without running complex manual SQL reports or navigating dense transactional ledger tables.

This feature delivers **Executive KPI Dashboard & Real-Time Operational Health Metric Cards (SIAA-33)**:
1. **Canonical 4-Card Executive Banner**: Prominently mounted at the top of the Admin Dashboard (`#view-dashboard` / `/admin`), providing instant operational health indicators:
   - **Gross Revenue Card**: Live aggregated parts sales and service labor billing formatted in Philippine Pesos (`₱45,230.00`), equipped with a dynamic comparative growth variance badge versus the previous business day (`+14.2% vs yesterday`).
   - **Work Orders Queue Card**: Active service bay repair throughput tracking (`8 Active`) with alert subtext indicating units awaiting warehouse parts (`3 Pending Parts Assembly`).
   - **Net Profit Margin Card**: High-level profitability synthesis displaying current month net profit margin percentage (`34.8%`) alongside cumulative gross profit in currency (`₱182,400.00 Gross Profit`).
   - **Critical Low Stock Action Alert Card**: High-visibility threshold warning displaying exact critical SKU count (`3 SKUs`), badged with high-visibility styling (`badge-danger`, `text-danger`), and functioning as an interactive direct navigation link to the low-stock filtered view in the Inventory management module.
2. **Dynamic Prop Parameterization & Resilience**: Decouples the presentation card layer (`AdminKpiGrid`) from rigid hardcoded mocks, supporting flexible props (`grossRevenue`, `grossRevenueYesterday`, `revenueGrowthPct`, `activeWorkOrders`, `pendingPartsWorkOrders`, `netProfitMarginPct`, `grossProfitAmount`, `lowStockCount`, `isLowStockDanger`, `lowStockHref`, `onLowStockClick`) with graceful fallbacks.
3. **Seamless Inventory Navigation Link**: Direct click-through from the Critical Low Stock card to `/admin/inventory?status=low_stock`, instantly filtering the catalog table to parts at or below safety stock.
4. **Strict SWIFT Design Tokens**: 100% adherence to established semantic color tokens (`bg-bg-card`, `bg-bg-surface`, `text-text-primary`, `text-text-muted`, `text-success`, `text-danger`, `text-accent`, `border-border`, etc.) with zero hardcoded hex or rgb styles.

---

## 2. Clarifications & Architectural Decisions

### Session 2026-10-15
- **Q: How should currency values be formatted across all KPI cards?**  
  → **A**: Consistently formatted using `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })` or `₱` prefix with standard 2 decimal places and comma thousand-separators (e.g. `₱45,230.00`).
- **Q: What constitutes a positive or negative revenue variance?**  
  → **A**: Percentage change relative to the previous business day: `((today - yesterday) / yesterday) * 100`. When positive, rendered with `+` sign and `text-success`. When negative, rendered with `-` sign and `text-danger`.
- **Q: How does clicking the Critical Low Stock card redirect the user?**  
  → **A**: The card acts as a Next.js navigation anchor linking to `/admin/inventory?status=low_stock`. The inventory catalog page inspects query parameters (`status=low_stock` or `filter=low_stock`) and initializes the catalog filter to show low-stock items.
- **Q: What accessibility requirements apply to the interactive KPI card?**  
  → **A**: The low-stock card provides a distinct focus ring, proper semantic `role="link"`, descriptive `aria-label`, and keyboard activation (`Enter` / `Space`).

---

## 3. User Scenarios & Acceptance Criteria (Gherkin)

### Scenario 1: Daily Gross Revenue KPI Calculation
```gherkin
Given settled customer transactions in the POS system for the current business date
When an administrator navigates to "#view-dashboard" (/admin)
Then the "Gross Revenue" card displays the exact summed total of all parts sales and service labor fees formatted in Philippine Pesos (e.g., "₱45,230.00")
And a percentage variance badge indicates comparative growth versus the previous business day (e.g., "+14.2% vs yesterday")
```

### Scenario 2: Active Service Bay Work Orders Monitoring
```gherkin
Given active repair bay tickets logged in the workshop system
When viewing the "Work Orders Queue" card on the admin dashboard
Then the card displays the count of active in-progress jobs (e.g., "8 Active")
And a subtext alert highlights jobs pending parts retrieval from the warehouse (e.g., "3 Pending Parts Assembly")
```

### Scenario 3: Net Profit Margin Synthesis
```gherkin
Given gross revenue and associated Cost of Goods Sold (COGS) and labor allocations for the active month
When the dashboard metrics calculate the net profit
Then the "Net Profit Margin" card displays the synthesized net percentage (e.g., "34.8%") alongside total gross profit in currency (e.g., "₱182,400.00 Gross Profit")
```

### Scenario 4: Critical Low-Stock Action Alert & Direct Redirection
```gherkin
Given inventory items whose current quantity is at or below their restock threshold
When the executive KPI row initializes
Then the "Critical Low Stock" card displays the exact SKU count with high-visibility warning styling ("badge-danger", "text-danger")
And clicking the card redirects the administrator directly to the low-stock filtered view in the Inventory management module ("/admin/inventory?status=low_stock")
```

---

## 4. Non-Functional Requirements & Governance

1. **Design Tokens Compliance**: All surface colors, text shades, borders, and badge accents must utilize SWIFT semantic tokens defined in `lib/tokens.ts` and `app/globals.css`.
2. **Zero Layout Shift (CLS)**: Number updates and badge state transitions must not alter the card bounding box or cause jitter.
3. **Responsive Grid**: Uses mobile-first responsive layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`).
4. **Keyboard Accessibility**: Low-stock navigation element must be focusable via `Tab` with a visible `focus-visible:ring-2 focus-visible:ring-primary` outline.
