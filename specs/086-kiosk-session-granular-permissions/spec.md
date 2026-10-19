# Feature Specification: Kiosk Session Granular Permissions

**Feature Branch**: `feat/SIAA-86-kiosk-session-granular-permissions`  
**Created**: 2026-10-20  
**Status**: Ready for Planning / Implementation  
**Jira Issue**: [SIAA-86](https://the-three-devsketeers.atlassian.net/browse/SIAA-86)  
**Parent Epic**: [SIAA-77](https://the-three-devsketeers.atlassian.net/browse/SIAA-77) (Staff Terminal POS & Attendance Controls)  
**Target View**: Staff Shop Floor Terminal (`/staff/*`, `components/staff/*`, `components/pos/*`, `app/staff/pos/page.tsx`, `app/staff/search/page.tsx`, `lib/store/punch-store.ts`, `lib/staff/actions.ts`)

---

## 1. Executive Summary & Objective

In `public.profiles`, each user has a `permissions` JSONB column holding granular operational security flags:
- `can_adjust_stock`: boolean (permits warehouse/shelf stock count adjustments)
- `can_override_discount`: boolean (permits applying manual cart discount tiers without manager override)
- `can_manage_pricing`: boolean (permits changing MSRP/wholesale base prices)
- `can_view_reports`: boolean (permits viewing executive/financial reports)

However, when employees authenticate at the terminal via PIN (`verifyStaffPinAction`) or switch profiles (`switchStaff`), only their name and role string have been tracked in client state. Custom permission overrides configured by store owners in `/admin/users` (e.g. granting a trusted cashier `can_adjust_stock: true` or restricting a trainee's `can_override_discount: false`) are not hydrated into the active terminal session, preventing individual fine-tuning beyond fixed role archetypes.

This specification implements **Kiosk Session Granular Permissions**:
1. **Hydrate Granular Permissions**: Extend `PunchStoreState` and `StaffMemberShiftState` with `currentPermissions: StaffPermissions` and `permissions: StaffPermissions`, ensuring that terminal session state reflects the employee's exact database/mock profile permissions.
2. **Permission-Aware Terminal PIN Authentication & Shift Sync**:
   - Update `verifyStaffPinAction` to select and return `permissions: StaffPermissions` from `public.profiles` (and `MOCK_STAFF_PROFILES`).
   - Implement `fetchStaffShiftAction(profileId?: string)` to retrieve the current profile's active shift and authoritative permissions JSONB.
   - Update `StaffProfileSwitcher` and `StaffPinModal` to propagate permissions when switching active staff.
3. **Enforce Feature Capabilities on Shop Floor**:
   - **Discount Override Restriction**: When a cashier without `can_override_discount` (`can_override_discount === false`) attempts to apply a cart discount (e.g. 5%, 10%, 15% VIP/Bulk), prompt the `ManagerOverrideModal` before applying the discount. If elevation succeeds, the discount is granted.
   - **Stock Adjustment Capability in Catalog Search**: In `/staff/search` (Warehouse Stock & Shelf Finder), render a stock adjustment action button when the active session has `can_adjust_stock === true` (e.g. for Inventory Clerks or authorized Cashiers), launching `StockAdjustmentModal`. For employees with `can_adjust_stock === false`, clicking the action requires Manager Override elevation.
4. **Realtime Permission Re-sync**: Provide an automatic or action-boundary permission re-sync (`refreshStaffPermissionsAction` / `fetchStaffShiftAction`) so if an admin changes flags in `/admin/users`, the staff terminal session updates on the next operational action without a hard page reload.
5. **SWIFT Semantic Design Tokens**: Strict adherence to SWIFT design tokens (`bg-bg-surface`, `bg-bg-card`, `text-text-primary`, `text-text-muted`, `bg-primary`, `border-border`, `text-success`, `text-accent`) with zero hardcoded hex/rgb.

---

## 1.1 Clarifications & Decisions

### Session 2026-10-20
- **Q1: What are the fallback default permissions if a profile has no explicit permissions column value?**  
  - **A**: Use `DEFAULT_ROLE_PERMISSIONS[role]` from `lib/types/auth.ts` (e.g. admin has all true; inventory_clerk has `can_adjust_stock: true`; cashier/mechanic have false by default).
- **Q2: When `can_override_discount` is false, what triggers Manager Elevation in POS?**  
  - **A**: Clicking any non-zero discount tier button in `HybridCartPane` (`components/pos/hybrid-cart-pane.tsx`) triggers the `ManagerOverrideModal`. Once manager credentials are verified, the discount is applied to the active ticket.
- **Q3: How does stock adjustment work on `/staff/search`?**  
  - **A**: Each row in `/staff/search` displays an "Adjust Stock" button. If the active staff has `can_adjust_stock: true`, `StockAdjustmentModal` opens directly. If `can_adjust_stock: false`, `ManagerOverrideModal` is prompted first; upon successful override, `StockAdjustmentModal` opens.
- **Q4: How does realtime permission invalidation work without WebSockets?**  
  - **A**: When checking permissions or executing sensitive operations, the client store can re-verify the active employee's permissions via `fetchStaffShiftAction(profileId)` if stale, and update `punchStore.currentPermissions`.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-86)

* **As a** Store Administrator,  
* **I want** the granular permissions configured in `/admin/users` (e.g. `can_adjust_stock`, `can_override_discount`) to actively govern what the staff member can do on the shop floor,  
* **So that** employee permissions can be fine-tuned individually beyond their default role archetype.

---

### Scenario 1: Admin enables stock adjustment for a specific staff member (Priority: P1)

* **Given** an Admin grants `can_adjust_stock: true` to an employee (e.g. Cashier Mike Morales) in `/admin/users`
* **When** that staff member authenticates at the shop floor terminal via PIN or profile switch
* **Then** their session reflects `can_adjust_stock: true` in `usePunchStore().currentPermissions`
* **And** stock adjustment actions in `/staff/search` become directly accessible to them without requiring full Admin credentials.

---

### Scenario 2: Discount override restriction (Priority: P1)

* **Given** a Cashier profile has `can_override_discount: false`
* **When** they attempt to apply a custom manual cart discount or discount tier in Fast-Lane POS
* **Then** the system intercepts the action and requires Manager Elevation via `ManagerOverrideModal` before the discount is applied to the cart.
* **And** if elevation succeeds, the selected discount tier is applied.

---

### Scenario 3: Realtime permission invalidation (Priority: P2)

* **Given** a staff member with an active session on the shop floor
* **When** an Admin revokes or alters a permission flag in `/admin/users`
* **Then** the staff session re-syncs permissions via `fetchStaffShiftAction` on the next operational action without requiring a hard page refresh.

---

## 3. Functional Requirements

- **FR-001**: Extend `StaffKioskProfile` in `lib/staff/types.ts` to include `permissions: StaffPermissions`.
- **FR-002**: Extend `PunchStoreState` and `StaffMemberShiftState` in `lib/store/punch-store.ts` to include `currentPermissions: StaffPermissions` and `permissions: StaffPermissions`.
- **FR-003**: Update `verifyStaffPinAction(profileId, pin)` to select `permissions` from Supabase `public.profiles` (or `MOCK_STAFF_PROFILES`) and return `permissions` in `profile`.
- **FR-004**: Implement and export `fetchStaffShiftAction(profileId?: string)` in `lib/staff/actions.ts` returning `{ success: boolean, shift?: DbStaffShift | null, permissions: StaffPermissions, profile?: StaffKioskProfile }`.
- **FR-005**: Update `switchStaff` in `PunchStore` to accept `permissions?: StaffPermissions` and set `currentPermissions`, persisting to localStorage cache.
- **FR-006**: Update `HybridCartPane` (`components/pos/hybrid-cart-pane.tsx`) to guard discount selection with `currentPermissions.can_override_discount`. If `false`, open `ManagerOverrideModal`.
- **FR-007**: Update `StaffSearchPage` (`app/staff/search/page.tsx`) to include an "Adjust Stock" action column. If `currentPermissions.can_adjust_stock` is `true`, open `StockAdjustmentModal`. If `false`, open `ManagerOverrideModal` first.
- **FR-008**: All UI modifications must strictly adhere to SWIFT Semantic Design Tokens in `app/globals.css` and `lib/tokens.ts` (zero hardcoded hex/rgb).

---

## 4. Success Criteria & Non-Functional Requirements

- **SC-001**: Type checking passes cleanly (`npm run typecheck` exits with code 0).
- **SC-002**: Unit and integration tests verify permissions hydration, discount override interception, and stock adjustment gating.
- **SC-003**: Zero hardcoded hex colors or non-token color utilities.
