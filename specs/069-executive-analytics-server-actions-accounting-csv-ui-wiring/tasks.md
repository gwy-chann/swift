# Task Breakdown: Executive Analytics Next.js Server Actions, Accounting CSV Dispatcher & UI Wiring

**Feature**: SIAA-69 (STORY-6.9)  
**Parent Epic**: SIAA-6 (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Target Branch**: `feat/SIAA-69-executive-analytics-server-actions-accounting-csv-ui-wiring`  
**Date**: 2026-10-15  

---

## Task Matrix & Dependency Ordering

- [ ] **Phase 1: Accounting CSV Export Engine & Unit Tests**
  - [ ] Task 1.1: Author `lib/analytics/__tests__/export.test.ts` testing RFC 4180 CSV formatting, header structure, escaping, summary footer row, and date-stamped filename.
  - [ ] Task 1.2: Implement `lib/analytics/export.ts` with `generateAccountingCsvString` and `exportAccountingCsvAction`.

- [ ] **Phase 2: Executive Analytics Server Actions & Unit Tests**
  - [ ] Task 2.1: Author `lib/analytics/__tests__/actions.test.ts` covering `getExecutiveKpisAction`, `getRevenueTrendAction`, `getCategoryPnlAction`, `getServiceBayStatusAction`, and `updateWorkOrderStatusAction`.
  - [ ] Task 2.2: Implement `lib/analytics/actions.ts` with Supabase server client resolution, session guards, date boundary computations, and resilient fallbacks.

- [ ] **Phase 3: Admin Dashboard Server Hydration**
  - [ ] Task 3.1: Refactor `app/admin/admin-dashboard-client.tsx` to accept optional initial props (`initialKpis`, `initialRevenueTrend`, `initialServiceBays`), synchronizing with `useExecutiveRealtime`.
  - [ ] Task 3.2: Refactor `app/admin/page.tsx` as an async Server Component fetching live initial data in parallel via Server Actions.

- [ ] **Phase 4: Reports & P&L Module Interactive UI**
  - [ ] Task 4.1: Create `app/admin/reports/admin-reports-client.tsx` with period filters (Daily, Weekly, Monthly), 4 executive summary metric cards, categorized P&L table with high-margin green accent highlighting, and CSV export trigger.
  - [ ] Task 4.2: Wire `app/admin/reports/page.tsx` as an async Server Component loading initial daily P&L data and rendering `AdminReportsClient`.

- [ ] **Phase 5: Verification & Quality Gates**
  - [ ] Task 5.1: Run all unit tests (`lib/analytics/__tests__/*.test.ts`) ensuring 100% pass rate.
  - [ ] Task 5.2: Execute `npx tsc --noEmit` and `npx eslint lib/analytics/ app/admin/` with zero errors.
  - [ ] Task 5.3: Sync knowledge graph via `graphify . --update`.
