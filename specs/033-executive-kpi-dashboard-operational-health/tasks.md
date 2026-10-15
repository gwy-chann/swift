# Implementation Tasks: Executive KPI Dashboard & Real-Time Operational Health Metric Cards

**Feature**: Executive KPI Dashboard & Real-Time Operational Health Metric Cards  
**Jira Issue**: [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (STORY-6.1)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6)  
**Branch**: `feat/SIAA-33-executive-kpi-dashboard-operational-health`  

---

## Task Matrix

### Phase 1: Logic Helpers & Unit Tests (TDD)
- [ ] **TASK-1.1**: Implement `lib/analytics/kpi-calculator.ts` providing pure formatting and calculation functions (`formatPhilippinePeso`, `calculateGrowthVariance`, `formatWorkOrdersQueue`, `formatNetProfitMargin`, `deriveCriticalLowStockState`).
- [ ] **TASK-1.2**: Author unit test suite `lib/analytics/__tests__/kpi-calculator.test.ts` verifying all 4 Jira acceptance scenarios:
  - Scenario 1: Gross revenue formatting in PHP and revenue variance badge calculation (+14.2% vs yesterday).
  - Scenario 2: Active work orders queue count and pending parts subtext warning.
  - Scenario 3: Monthly net profit margin percentage and gross profit currency formatting.
  - Scenario 4: Critical low stock danger styling, SKU count, and redirection link attributes.

### Phase 2: Component Refactoring & Redirection Wiring
- [ ] **TASK-2.1**: Refactor `components/admin/admin-kpi-grid.tsx` to accept dynamic props (`grossRevenueYesterday`, `revenueGrowthPct`, `netProfitMarginPct`, `grossProfitAmount`, `lowStockHref`, `onLowStockClick`).
- [ ] **TASK-2.2**: Wrap the Critical Low Stock card in a Next.js `<Link>` to `lowStockHref` (defaulting to `/admin/inventory?status=low_stock`) with `role="link"`, keyboard accessibility, and danger styling.
- [ ] **TASK-2.3**: Update `app/admin/admin-dashboard-client.tsx` to pass dynamic props and ensure seamless realtime updates.

### Phase 3: Inventory Deep-Linking Support
- [ ] **TASK-3.1**: Update `app/admin/inventory/page.tsx` to accept `searchParams` and extract `status` or `filter`.
- [ ] **TASK-3.2**: Update `components/admin/inventory/inventory-catalog.tsx` to accept `initialStockFilter` and initialize with `'low_stock'` when linked from the dashboard.

### Phase 4: Verification, Quality Gates & Pull Request
- [ ] **TASK-4.1**: Execute automated unit tests (`npm test`) and confirm all pass.
- [ ] **TASK-4.2**: Execute TypeScript verification (`npx tsc --noEmit`) and ESLint check (`npm run lint`).
- [ ] **TASK-4.3**: Sync knowledge graph via `graphify . --update`.
- [ ] **TASK-4.4**: Push branch to origin and open Pull Request with Jira synchronization.
