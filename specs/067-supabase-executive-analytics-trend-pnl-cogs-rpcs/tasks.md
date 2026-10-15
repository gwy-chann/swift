# Task Breakdown: Supabase Executive Analytics, 7-Day Trend & Categorized P&L COGS RPCs

**Feature**: `067-supabase-executive-analytics-trend-pnl-cogs-rpcs`  
**Jira Issue**: [SIAA-67](https://the-three-devsketeers.atlassian.net/browse/SIAA-67)  
**Branch**: `feat/SIAA-67-supabase-executive-analytics-trend-pnl-cogs-rpcs`  

---

## Task Progress Summary

- [ ] Task 1: SpecKit Artifacts Authoring & Design Baseline
- [ ] Task 2: Database Migration: Executive KPIs, 7-Day Trend & Categorized P&L Stored Procedures
- [ ] Task 3: TypeScript Domain Models & Validation Contracts
- [ ] Task 4 (TDD Red): Unit Tests for Analytics Contracts, RPC Mappers & Zero-Data Boundary Resilience
- [ ] Task 5 (TDD Green): RPC Client Bindings & Data Mappers Implementation
- [ ] Task 6: Full Verification Gate & Task Sign-off

---

## Detailed Task Specifications

### Task 1: SpecKit Artifacts Authoring & Design Baseline
- **Depends on**: None
- **Scope**: Author the 8 canonical SpecKit artifacts in `specs/067-supabase-executive-analytics-trend-pnl-cogs-rpcs/`:
  - `spec.md`, `research.md`, `data-model.md`, `contracts/analytics-rpc.contract.ts`, `checklists/requirements.md`, `plan.md`, `quickstart.md`, `tasks.md`.
- **Commit**: `docs(specs): [SIAA-67] author canonical SpecKit artifacts for executive analytics rpcs`
- **Verification**: All 8 artifacts present, compliant with SpecKit standards and SWIFT Constitution.

### Task 2: Database Migration: Executive KPIs, 7-Day Trend & Categorized P&L Stored Procedures
- **Depends on**: Task 1
- **Scope**: Create `supabase/migrations/20261021000000_executive_analytics_rpcs.sql`:
  - `public.get_executive_kpis(p_date DATE DEFAULT CURRENT_DATE)`
  - `public.get_revenue_trend_7d(p_end_date DATE DEFAULT CURRENT_DATE)`
  - `public.get_category_pnl(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)`
  - Permissions: `GRANT EXECUTE ... TO authenticated, service_role`.
  - Zero-division protection: `NULLIF` guards on all denominator expressions.
- **Commit**: `feat(db): [SIAA-67] create executive analytics, 7-day trend, and pnl cogs rpcs migration`
- **Verification**: SQL syntax valid, idempotent function definitions (`CREATE OR REPLACE FUNCTION`).

### Task 3: TypeScript Domain Models & Validation Contracts
- **Depends on**: Task 2
- **Scope**: Define domain models in `lib/types/analytics.ts` and runtime validation schemas in `lib/analytics/contracts.ts`.
- **Commit**: `feat(analytics): [SIAA-67] export analytics domain models and zod validation contracts`
- **Verification**: Types compile cleanly under `npx tsc --noEmit` with zero type errors.

### Task 4 (TDD Red): Unit Tests for Analytics Contracts, RPC Mappers & Zero-Data Boundary Resilience
- **Depends on**: Task 3
- **Scope**: Create `lib/analytics/__tests__/rpc.test.ts` and `lib/analytics/__tests__/mapper.test.ts`.
  - Validate contract parsing for valid responses.
  - Test zero-data fallbacks and division-by-zero resilience.
  - Test currency and percentage formatting.
- **Commit**: `test(analytics): [SIAA-67] add unit tests for analytics rpc contracts and mappers`
- **Verification**: Tests run via `npm test` and initially fail for unwritten implementations (Red phase).

### Task 5 (TDD Green): RPC Client Bindings & Data Mappers Implementation
- **Depends on**: Task 4
- **Scope**: Implement `lib/analytics/rpc.ts` and `lib/analytics/mapper.ts`.
  - `fetchExecutiveKpis`: Typed caller invoking `public.get_executive_kpis`.
  - `fetchRevenueTrend7d`: Typed caller invoking `public.get_revenue_trend_7d`.
  - `fetchCategoryPnl`: Typed caller invoking `public.get_category_pnl`.
  - Formatters and mappers for visual display.
- **Commit**: `feat(analytics): [SIAA-67] implement typed supabase analytics rpc bindings and formatters`
- **Verification**: All unit tests in `lib/analytics/__tests__/*.test.ts` pass cleanly (Green phase).

### Task 6: Full Verification Gate & Task Sign-off
- **Depends on**: Task 5
- **Scope**: Run full suite verification (`npm test`, `npx tsc --noEmit`, `npm run lint`).
  - Update `tasks.md` with all tasks checked off.
- **Commit**: `docs(specs): [SIAA-67] mark all implementation and verification tasks complete in tasks.md`
- **Verification**: Zero lint, test, or typecheck errors.
