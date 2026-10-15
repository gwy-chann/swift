# Implementation Tasks: 7-Day Revenue Trend Comparison Engine

**Feature**: 7-Day Revenue Trend Comparison Engine (Parts Sales vs. Bay Labor Services)  
**Jira Issue**: [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (STORY-6.2)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6)  
**Branch**: `feat/SIAA-34-7-day-revenue-trend-comparison-engine`  

---

## Task Matrix

### Phase 1: Logic Engine & Unit Tests (TDD)
- [ ] **TASK-1.1**: Implement `lib/analytics/revenue-trend-engine.ts` with pure calculation functions (`formatCompactCurrencyPhp`, `computeHeightPercent`, `normalizeRevenueTrend`, `filterDailyRevenue`).
- [ ] **TASK-1.2**: Author unit tests in `lib/analytics/__tests__/revenue-trend-engine.test.ts` verifying:
  - Scenario 1: Grouped 7-day data generation and channel split.
  - Scenario 2: Compact currency display strings (`₱48.0k`, `₱12.0k`) and `data-val` badge generation.
  - Scenario 3: Date range header calculation and legend labels.
  - Scenario 4: Proportional scale normalization up to 100%, 0-amount handling, and 4% minimum height protection.

### Phase 2: Component Refactoring & DOM Attributes
- [ ] **TASK-2.1**: Update `app/globals.css` to define `.chart-bar-group`, `.chart-bar`, `.bar-parts`, and `.bar-labor` ensuring token inheritance (`var(--primary)`, `var(--info)`) and CSS hover tooltip support.
- [ ] **TASK-2.2**: Refactor `components/admin/revenue-comparison-chart.tsx` to:
  - Consume `normalizeRevenueTrend` from `lib/analytics/revenue-trend-engine.ts`.
  - Accept dynamic props (`data`, `dateRange`, `todayPartsIncrement`, `todayLaborIncrement`, `initialFilter`).
  - Render `.chart-bar-group`, `.chart-bar.bar-parts`, and `.chart-bar.bar-labor` elements with `data-val` attributes.
  - Implement accessible hover tooltips and interactive channel filter toggles.
- [ ] **TASK-2.3**: Author component tests in `components/admin/__tests__/revenue-comparison-chart.test.tsx` verifying:
  - Render of 7 bar groups (`.chart-bar-group`).
  - Presence of `.bar-parts` and `.bar-labor` on each day.
  - Presence of `data-val` attributes matching formatted amounts.
  - Date range badge rendering (`Sept 22 - 28, 2026`).

### Phase 3: Integration & Dashboard Verification
- [ ] **TASK-3.1**: Verify `app/admin/admin-dashboard-client.tsx` integration with `RevenueComparisonChart` for real-time sales increments.

### Phase 4: Verification, Quality Gates & Pull Request
- [ ] **TASK-4.1**: Execute automated unit tests (`npm test`) and confirm 100% pass.
- [ ] **TASK-4.2**: Execute TypeScript verification (`npx tsc --noEmit`) and ESLint check (`npm run lint`).
- [ ] **TASK-4.3**: Sync knowledge graph via `graphify . --update`.
- [ ] **TASK-4.4**: Push branch to origin and open Pull Request with Jira synchronization.
