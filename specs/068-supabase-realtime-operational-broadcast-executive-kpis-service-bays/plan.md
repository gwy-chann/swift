# Implementation Plan: Supabase Realtime Operational Broadcast for Executive KPIs & Service Bays

**Feature**: Supabase Realtime Operational Broadcast for Executive KPIs & Service Bays  
**Feature Branch**: `feat/SIAA-68-realtime-operational-broadcast-kpis-service-bays`  
**Ticket**: [SIAA-68](https://the-three-devsketeers.atlassian.net/browse/SIAA-68) (STORY-6.8)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6)  

---

## 1. Executive Summary

This feature equips the SWIFT Admin Dashboard with real-time operational broadcasting via Supabase Realtime. It provisions an idempotent database migration registering `work_orders`, `service_bays`, and `transactions` in `supabase_realtime` with full replica identity, establishes the `useExecutiveRealtime` client hook subscribing to the `operational-intelligence` channel, and wires the Admin KPI grid, 7-Day Trend Chart, and Service Bay Status cards with sub-500ms reactive state updates, zero layout flicker, and full SWIFT semantic design tokens compliance.

---

## 2. Technical Architecture & File Layout

```text
swift/
├── supabase/
│   └── migrations/
│       └── 20261021000000_executive_realtime_broadcast.sql   <-- SQL Migration: Publication & Replica Identity
├── lib/
│   ├── analytics/
│   │   ├── use-executive-realtime.ts                         <-- Realtime Hook subscribing to 'operational-intelligence'
│   │   └── __tests__/
│   │       └── use-executive-realtime.test.ts                <-- Unit & integration tests for hook & channel lifecycle
│   ├── contracts/
│   │   └── executive-realtime.ts                             <-- Canonical interfaces & Zod schemas
│   └── types/
│       └── realtime.ts                                       <-- Central realtime types export
├── components/
│   └── admin/
│       ├── admin-kpi-grid.tsx                                <-- Wired to useExecutiveRealtime (Gross Revenue & Stock Alert)
│       ├── service-bay-status.tsx                            <-- Dynamic bay items & work order state updates
│       └── revenue-comparison-chart.tsx                      <-- Reactive today's revenue bar increment
├── app/
│   └── admin/
│       ├── page.tsx                                          <-- Admin Dashboard Server Page
│       └── admin-dashboard-client.tsx                        <-- Client Dashboard boundary with useExecutiveRealtime
└── specs/
    └── 068-supabase-realtime-operational-broadcast-executive-kpis-service-bays/
```

---

## 3. Design Tokens & Styling Compliance

In compliance with SWIFT Constitution Principle I:
- Live pulse badge on Gross Revenue: `bg-success-light text-success border border-success/40 animate-pulse`
- Work order badge states:
  - `IN PROGRESS`: `bg-accent-light text-accent border border-accent/30`
  - `PENDING_PARTS`: `bg-accent-light text-accent border border-accent/30`
  - `COMPLETED`: `bg-success-light text-success border border-success/30`
  - `CANCELLED`: `bg-danger-light text-danger border border-danger/30`
  - `QUEUED`: `bg-bg-muted text-text-secondary border border-border-subtle`
- Low-stock danger badge: `bg-danger-light text-danger border border-danger/30`
- Zero hardcoded colors; no arbitrary hex/RGB values.

---

## 4. Test Strategy (TDD)

- **Phase A**: Red tests for `useExecutiveRealtime` (`lib/analytics/__tests__/use-executive-realtime.test.ts`):
  - Subscription to channel `operational-intelligence`
  - Dispatches `onTransaction` on `transactions` INSERT
  - Dispatches `onWorkOrderChange` on `work_orders` UPDATE/INSERT/DELETE
  - Dispatches `onServiceBayChange` on `service_bays` UPDATE
  - Dispatches `onStockAlert` on `products` UPDATE with `stock <= min_threshold`
  - Connection lifecycle & clean unmount via `removeChannel`
  - Graceful degradation when Supabase env vars are missing
- **Phase B**: Green implementation of `lib/contracts/executive-realtime.ts` and `lib/analytics/use-executive-realtime.ts`.
- **Phase C**: Database migration `supabase/migrations/20261021000000_executive_realtime_broadcast.sql`.
- **Phase D**: UI Component integration & tests:
  - `AdminKpiGrid` consuming `useExecutiveRealtime`
  - `ServiceBayStatusCard` updating dynamically with zero layout flicker
  - `RevenueComparisonChart` reacting to live transactions
  - `app/admin/admin-dashboard-client.tsx` or `app/admin/page.tsx` integration
- **Phase E**: Static verification (`tsc --noEmit`, `npm run lint`, `npm test`).
