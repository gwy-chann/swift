# Tasks: Kiosk Session Granular Permissions

**Feature**: Kiosk Session Granular Permissions: Hydrate custom employee flags and enforce feature capabilities  
**Branch**: `feat/SIAA-86-kiosk-session-granular-permissions`  
**Jira Issue**: [SIAA-86](https://the-three-devsketeers.atlassian.net/browse/SIAA-86)

---

## Phase 1: Contracts, Types & State Extension
- [x] **TASK-1.1**: Update `lib/staff/types.ts` to add `permissions: StaffPermissions` to `StaffKioskProfile` and define `FetchStaffShiftResult`.
- [x] **TASK-1.2**: Create `lib/contracts/kiosk-session-permissions.ts` with Zod validation schemas.
- [x] **TASK-1.3**: Extend `PunchStoreState` and `StaffMemberShiftState` in `lib/store/punch-store.ts` to include `currentPermissions` and `permissions`. Update `switchStaff` and session resolution.

## Phase 2: Server Actions Updates
- [x] **TASK-2.1**: Update `verifyStaffPinAction` in `lib/staff/actions.ts` to fetch and return `permissions`.
- [x] **TASK-2.2**: Implement `fetchStaffShiftAction` in `lib/staff/actions.ts` to retrieve profile shift and fresh `permissions` JSONB.

## Phase 3: UI Component Wiring & Capabilities Enforcement
- [x] **TASK-3.1**: Update `StaffProfileSwitcher` (`components/staff/clock/staff-profile-switcher.tsx`) to pass `permissions` into `switchStaff`.
- [x] **TASK-3.2**: Update `HybridCartPane` (`components/pos/hybrid-cart-pane.tsx`) to guard discount selection when `can_override_discount === false` via `ManagerOverrideModal`.
- [x] **TASK-3.3**: Update `StaffSearchPage` (`app/staff/search/page.tsx`) to provide stock adjustment actions gated by `can_adjust_stock` (or Manager Override).

## Phase 4: Automated Testing & Verification
- [x] **TASK-4.1**: Create `lib/staff/__tests__/staff-kiosk-permissions.test.ts` verifying permission hydration, `verifyStaffPinAction`, `fetchStaffShiftAction`, discount override gating, and stock adjustment capability.
- [x] **TASK-4.2**: Run `npm test` and `npm run typecheck` to verify zero regressions.

