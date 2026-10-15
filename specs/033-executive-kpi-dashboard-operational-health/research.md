# Technical Research & Architecture Decisions: Executive KPI Dashboard & Real-Time Operational Health Metric Cards

**Feature**: Executive KPI Dashboard & Real-Time Operational Health Metric Cards  
**Jira Issue**: [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (STORY-6.1)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6)  

---

## 1. Context & Architectural Analysis

The SWIFT Admin Dashboard (`/admin`) serves as the primary nerve center for shop managers. The top banner consists of four KPI metric cards:
1. **Gross Revenue Today** (`₱45,230.00` + variance badge)
2. **Work Orders Queue** (`8 Active` + `3 Pending Parts Assembly`)
3. **Net Profit Margin** (`34.8%` + `₱182,400.00 Gross Profit`)
4. **Critical Low Stock** (`3 SKUs` + `Below threshold limit` or `ALERT`)

### Current State:
- `components/admin/admin-kpi-grid.tsx` renders four cards.
- Some values (such as `netProfitMarginPct`, `grossProfitAmount`, variance percentage text) were hardcoded strings within the component or lacked explicit prop overrides.
- The Critical Low Stock card was rendered as a static `<div>` without interactive navigation linking to the inventory module.
- `app/admin/inventory/page.tsx` did not pass `searchParams` down to `InventoryCatalog`, preventing direct deep-linking into low-stock filtered views.

---

## 2. Design System & Tokens Mapping

In accordance with repo user rules (`AGENTS.md`):
- **Surfaces & Cards**: `bg-bg-card`, `bg-bg-surface`, `bg-bg-muted`
- **Text**: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- **Borders**: `border-border`, `border-border-subtle`, `border-border-focus`
- **Status Accents**:
  - Success: `text-success`, `bg-success-light`, `border-success/40`
  - Danger (Low Stock): `text-danger`, `bg-danger-light`, `border-danger/60`, `ring-danger/30`
  - Accent / Notice: `text-accent`

---

## 3. Technology Stack & Pattern Evaluation

| Decision | Selected Option | Rationale |
| :--- | :--- | :--- |
| **Component Boundary** | Client Component (`'use client'`) | Handles live state updates, interactive hover states, and route push/linking. |
| **Navigation Mechanism** | Next.js `<Link>` or `useRouter().push` | Client-side transition without full page reload; accessible via keyboard. |
| **Query Parameter Convention** | `/admin/inventory?status=low_stock` | Matches existing `StockFilterOption` type (`'low_stock'`). |
| **Currency Formatting** | Utility function with standard Philippine Peso symbol `₱` | Reliable across server/client hydration without locale mismatch. |
| **Growth Calculation** | Pure function `calculateRevenueGrowth(today, yesterday)` | Fully testable in isolation; handles zero division gracefully. |

---

## 4. Accessibility (WCAG 2.1 AA)

- The Critical Low Stock card must provide:
  - `role="link"` or semantic `<Link>`
  - `aria-label="Critical Low Stock: 3 SKUs below threshold limit. Click to view low-stock inventory."`
  - Visible focus outline using `focus-visible:ring-2 focus-visible:ring-primary focus:outline-none`
  - Screen reader accessible text for trend arrows and status badges.
