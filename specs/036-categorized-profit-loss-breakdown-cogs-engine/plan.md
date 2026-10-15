# Implementation Plan: SIAA-36 Categorized Profit & Loss (P&L) Breakdown & COGS Engine

**Feature**: SIAA-36 (Categorized P&L Breakdown & COGS Engine)  
**Parent Epic**: SIAA-6 (Executive Analytics, Revenue & Profit Margins)  
**Date**: 2026-10-15  

---

## 1. Technical Context & Constitution Check

### Principle I: Semantic Design Tokens & Zero Hardcoded Colors
- All cards, text, badges, and table elements strictly use semantic Tailwind tokens: `bg-bg-card`, `bg-bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `bg-success-light`, `text-success`, `bg-accent-light`, `text-accent`.
- No raw hex codes (e.g., `#10b981`), raw RGB, or unmapped Tailwind classes (`text-green-600`).

### Principle II: Single Source of Truth & Specification Fidelity
- Layout directly mirrors `../mockup/admin.html` lines 380–460 (`#view-reports`).
- Site map compliance: route `/admin/reports` with root section `id="view-reports"`.

### Principle III: Type-Safe Data Architecture
- Domain models consume `lib/types/analytics.ts` (`CategoryPnlItem`, `CategoryPnlSummary`, `CategoryPnlData`).
- Zod schemas validate client/server payload boundary.

### Principle IV: Test-First Quality & Contract Verification
- Comprehensive unit tests for financial math (`lib/admin/__tests__/pnl-cogs-utils.test.ts`).
- Server action tests with mock fallback verification (`lib/admin/__tests__/pnl-actions.test.ts`).
- Component tests for table rendering and high-yield highlighting (`components/admin/reports/__tests__/category-pnl-table.test.tsx`).

### Principle V: Server-First Performance & Accessibility
- Server Component entry point at `app/admin/reports/page.tsx`.
- Table uses semantic HTML (`table`, `thead`, `tbody`, `th scope="col"`, `td`).
- Fast rendering (<50ms calculation overhead).

---

## 2. Component & Architecture Map

```
app/admin/reports/
  └── page.tsx                              [Server Component: fetches data, renders container with id="view-reports"]
components/admin/reports/
  ├── reports-view-client.tsx               [Client Component: manages period selection & reactive refresh]
  ├── financial-summary-cards.tsx           [UI Component: 4 KPI summary cards]
  ├── category-pnl-table.tsx                [UI Component: category breakdown data table]
  └── __tests__/
      └── category-pnl-table.test.tsx       [UI Tests: table rendering & high-yield highlighting]
lib/admin/
  ├── pnl-cogs-utils.ts                     [Domain Logic: calculateNetProfit, calculateMarginPct, formatCurrencyPhp]
  ├── pnl-actions.ts                        [Server Actions: getCategoryPnlBreakdown]
  └── __tests__/
      ├── pnl-cogs-utils.test.ts            [Unit Tests: pure arithmetic & zero-division safety]
      └── pnl-actions.test.ts               [Unit Tests: action data fetching & fallback logic]
```

---

## 3. Implementation Phases

1. **Phase 1: Pure Mathematical Utilities & Unit Tests (TDD)**
   - Implement `lib/admin/pnl-cogs-utils.ts` and verify with `pnl-cogs-utils.test.ts`.
2. **Phase 2: Server Actions & Seeded Mock Engine**
   - Implement `lib/admin/pnl-actions.ts` calling Supabase RPC `get_category_pnl` with mock fallback.
   - Verify with `pnl-actions.test.ts`.
3. **Phase 3: UI Components (Financial Summary Cards & Category Breakdown Table)**
   - Implement `financial-summary-cards.tsx` and `category-pnl-table.tsx`.
   - Adhere strictly to SWIFT design tokens (`text-success font-semibold`, `bg-bg-card`, etc.).
4. **Phase 4: Page Integration & Client Wiring**
   - Implement `reports-view-client.tsx` and update `app/admin/reports/page.tsx`.
   - Add automated UI tests.
5. **Phase 5: Verification & Verification Scenarios**
   - Run full TypeScript compilation, linting, and test suite.
