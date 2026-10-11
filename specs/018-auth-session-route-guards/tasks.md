# Implementation Tasks: Authenticated Session Route Guards & Login Redirects

**Feature**: Authenticated Session Route Guards & Login Redirects ([SIAA-71](https://the-three-devsketeers.atlassian.net/browse/SIAA-71))
**Branch**: `fix/SIAA-71-auth-session-route-guards` | **Date**: 2026-10-11
**Specification**: [`specs/018-auth-session-route-guards/spec.md`](spec.md) | **Plan**: [`specs/018-auth-session-route-guards/plan.md`](plan.md)

---

## Phase 1: Setup & Domain Model (Contracts & Types)

**Purpose**: Define the pure route classification and guard decision contracts in `lib/auth/session-guards.ts`.

- [ ] T001 Implement route classification, session resolution, and access evaluation engine in `lib/auth/session-guards.ts`

---

## Phase 2: Test Suite (TDD Foundation)

**Purpose**: Build unit tests covering the matrix of route categories, roles, and auth states before wiring into middleware.

- [ ] T002 Implement unit tests in `lib/auth/__tests__/session-guards.test.ts` verifying all route guard permutations

---

## Phase 3: Edge Proxy & Middleware Integration

**Purpose**: Wire the guard engine into `lib/supabase/middleware.ts` and `proxy.ts` so requests are intercepted before component rendering.

- [ ] T003 Update `lib/supabase/middleware.ts` to inspect sessions and return redirects according to `evaluateRouteAccess`
- [ ] T004 Ensure `proxy.ts` executes the enhanced `updateSession` logic across all matching non-static paths

---

## Phase 4: Server Component Defense-in-Depth

**Purpose**: Guard page entry points on the server side so direct renders or bypassed proxies still redirect appropriately.

- [ ] T005 Add server-side session check and redirect logic in `app/page.tsx`
- [ ] T006 Update `app/(auth)/login/page.tsx` with server-side session check and redirect logic
- [ ] T007 Add server-side role and session check in `app/admin/layout.tsx`
- [ ] T008 Add server-side session check in `app/staff/layout.tsx`

---

## Phase 5: Verification & Quality Gates

**Purpose**: Verify all tests pass, TypeScript compiles with zero errors, and linting passes cleanly.

- [ ] T009 Execute `npm test` to verify zero regressions and all new guard tests passing
- [ ] T010 Run `npx tsc --noEmit` to verify type safety
- [ ] T011 Run `npm run lint` to verify coding standards
