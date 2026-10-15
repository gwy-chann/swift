# Technical Research & Architecture Decisions: SIAA-36 P&L Breakdown & COGS Engine

**Feature**: SIAA-36 (Categorized Profit & Loss Breakdown & Cost of Goods Sold Engine)  
**Parent Epic**: SIAA-6 (Executive Analytics, Revenue & Profit Margins)  
**Date**: 2026-10-15  

---

## 1. Technical Stack & Invariants

- **Framework**: Next.js App Router (React Server Components by default, `"use client"` for interactive filter buttons and table sort state).
- **Styling**: Tailwind CSS v4 using semantic design tokens (`bg-bg-card`, `bg-bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-success`, `bg-success-light`, `text-accent`, `bg-accent-light`). **Zero hardcoded colors**.
- **Iconography**: `lucide-react` icons (`TrendingUp`, `Coins`, `Percent`, `ReceiptText`, `AlertCircle`, `BarChart3`).
- **Database & RPC**: PostgreSQL stored procedure `public.get_category_pnl(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)` established in migration `20261021000000_executive_analytics_rpcs.sql`.
- **Testing**: Jest / Vitest + React Testing Library covering pure math calculation utilities, server actions, and table rendering.

---

## 2. Key Architecture Decisions

### Decision 1: Pure Mathematical Engine (`lib/admin/pnl-cogs-utils.ts`)
Financial arithmetic must be strictly isolated from React components into pure, deterministic functions:
- `calculateNetProfit(grossRevenue: number, cogs: number): number`
- `calculateMarginPct(grossRevenue: number, cogs: number): number`
- `isHighYieldMargin(marginPct: number, targetThreshold?: number): boolean`
- `formatCurrencyPhp(amount: number): string`
- `formatUnitCount(category: string, units: number): string` (appends `Jobs` for workshop labor).

Zero-denominator handling ensures that if `grossRevenue <= 0`, `marginPct` safely evaluates to `0.0%` without returning `NaN` or `Infinity`.

### Decision 2: Server Action with Resilient Mock Fallback (`lib/admin/pnl-actions.ts`)
To support both production Supabase deployments and local/offline demo environments:
- The Server Action `getCategoryPnlBreakdown(period = 'daily')` attempts to invoke the Supabase RPC `get_category_pnl` with calculated timestamp ranges.
- If Supabase is unavailable or returns empty data, the action automatically falls back to an enriched mock data engine seeded from `../mockup/app.js` and `lib/types/analytics.ts`, guaranteeing zero blank screens.

### Decision 3: Modular Component Hierarchy
- `app/admin/reports/page.tsx` — Server component page wrapping reports view with `id="view-reports"`.
- `components/admin/reports/financial-summary-cards.tsx` — 4-card metric grid for Gross Sales, COGS, Net Profit, and Margin %.
- `components/admin/reports/category-pnl-table.tsx` — Itemized table rendering category breakdowns with high-yield green highlighting.
- `components/admin/reports/reports-view-client.tsx` — Client component orchestrating time period toggles (`Daily Sales`, `Weekly Sales`, `Monthly Sales`) and data binding.

### Decision 4: Design Token Compliance Matrix
| Mockup Element | Hardcoded / Legacy | Canonical SWIFT Token |
| :--- | :--- | :--- |
| Metric Card Background | `.stat-card-solid` | `bg-bg-card border border-border rounded-xl p-5 shadow-xs` |
| Primary Number | `#111827` / `#ffffff` | `text-2xl font-bold text-text-primary` |
| Secondary Subtext | `#6b7280` / `#9ca3af` | `text-xs text-text-secondary` |
| Profit Green Accent | `#10b981` / `text-success` | `text-success font-semibold` |
| Target Badge Indicator | green pill | `bg-success-light text-success text-xs px-2 py-0.5 rounded-full font-medium` |
| Attention / Warning Badge | amber pill | `bg-accent-light text-accent text-xs px-2 py-0.5 rounded-full font-medium` |
| Table Header Row | `#f9fafb` | `bg-bg-surface text-text-secondary font-medium text-xs uppercase border-b border-border` |
