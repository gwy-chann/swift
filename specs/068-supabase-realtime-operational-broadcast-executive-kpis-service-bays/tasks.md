# Implementation Tasks: Supabase Realtime Operational Broadcast for Executive KPIs & Service Bays

**Feature**: Supabase Realtime Operational Broadcast for Executive KPIs & Service Bays  
**Ticket**: [SIAA-68](https://the-three-devsketeers.atlassian.net/browse/SIAA-68) (STORY-6.8)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6)  
**Branch**: `feat/SIAA-68-realtime-operational-broadcast-kpis-service-bays`  

---

## Task Matrix

### Phase 1: Contracts & Database Migration
- [ ] **TASK-1.1**: Define canonical contracts, Zod schemas, and TypeScript interfaces in `lib/contracts/executive-realtime.ts`
- [ ] **TASK-1.2**: Author SQL migration `supabase/migrations/20261021000000_executive_realtime_broadcast.sql` registering `work_orders`, `service_bays`, and `transactions` in publication `supabase_realtime` with `REPLICA IDENTITY FULL`

### Phase 2: Realtime Hook & Unit Tests (TDD)
- [ ] **TASK-2.1**: Author unit test suite `lib/analytics/__tests__/use-executive-realtime.test.ts` asserting channel subscription, event dispatching (`onTransaction`, `onWorkOrderChange`, `onServiceBayChange`, `onStockAlert`), status transitions, and unmount cleanup
- [ ] **TASK-2.2**: Implement `useExecutiveRealtime` in `lib/analytics/use-executive-realtime.ts` subscribing to `operational-intelligence`

### Phase 3: Dashboard UI Wiring & Integration
- [ ] **TASK-3.1**: Wire `AdminKpiGrid` and client dashboard boundary to `useExecutiveRealtime` for sub-500ms Gross Revenue pulse and Low-Stock threshold alerts
- [ ] **TASK-3.2**: Wire `ServiceBayStatusCard` to update dynamically on `work_orders` and `service_bays` events with zero layout flicker
- [ ] **TASK-3.3**: Wire `RevenueComparisonChart` to reflect live transactions in today's revenue bar without page reload
- [ ] **TASK-3.4**: Integrate reactive state in `app/admin/admin-dashboard-client.tsx` and connect `app/admin/page.tsx`

### Phase 4: Verification & Quality Gates
- [ ] **TASK-4.1**: Execute automated test verification (`npm test`), TypeScript verification (`npx tsc --noEmit`), and lint check (`npm run lint`)
- [ ] **TASK-4.2**: Execute atomic commits, push branch, and open Pull Request
