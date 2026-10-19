# Research & Architectural Analysis: Kiosk Session Granular Permissions

**Feature**: Kiosk Session Granular Permissions: Hydrate custom employee flags and enforce feature capabilities  
**Branch**: `feat/SIAA-86-kiosk-session-granular-permissions`  
**Jira Issue**: [SIAA-86](https://the-three-devsketeers.atlassian.net/browse/SIAA-86)

---

## 1. Context & Problem Statement

In the existing SWIFT terminal infrastructure:
- `public.profiles.permissions` is stored as a JSONB column containing:
  ```json
  {
    "can_adjust_stock": boolean,
    "can_override_discount": boolean,
    "can_manage_pricing": boolean,
    "can_view_reports": boolean
  }
  ```
- In `/admin/users`, store managers have the ability to toggle these flags per user profile (`components/admin/users/edit-staff-modal.tsx`).
- However, when employees authenticate at the kiosk terminal (`/staff/clock`, `StaffPinModal`, `verifyStaffPinAction`), only `id`, `full_name`, `email`, `role`, and `pin_code` are read.
- As a result:
  1. `StaffKioskProfile` does not contain `permissions`.
  2. `PunchStoreState` and `StaffMemberShiftState` only record `currentStaffRole`, without `permissions` or `currentPermissions`.
  3. Front-line actions such as discount application in `HybridCartPane` and stock adjustments in `/staff/search` cannot dynamically verify if the active employee was individually granted or denied permissions.

---

## 2. Technical Decisions & Patterns

### 2.1 State Representation in `PunchStore`
- In `lib/store/punch-store.ts`:
  - Add `currentPermissions: StaffPermissions` to `PunchStoreState`.
  - Add `permissions?: StaffPermissions` to `StaffMemberShiftState`.
  - Add `resolveStaffPermissions(profileId?: string, explicitPermissions?: StaffPermissions, role?: string): StaffPermissions`.
  - Update `loadInitialState` to initialize `currentPermissions` from stored session or fallback from `DEFAULT_ROLE_PERMISSIONS`.
  - Update `switchStaff` to accept `permissions?: StaffPermissions`.
  - Add `updateStaffPermissions(profileId: string, permissions: StaffPermissions): void`.

### 2.2 Server Action Hydration
- In `lib/staff/actions.ts`:
  - In `verifyStaffPinAction(profileId: string, pin: string)`:
    - Include `permissions` in `.select('id, full_name, email, role, pin_code, permissions')`.
    - Return `permissions` on the `profile` object (with fallback to `mockProfile.permissions` or `DEFAULT_ROLE_PERMISSIONS[role]`).
  - Introduce `fetchStaffShiftAction(profileId?: string)`:
    - Resolves active shift for `profileId` and fetches the profile's up-to-date `permissions` from Supabase (or mock).
    - Returns `{ success: true, shift: DbStaffShift | null, permissions: StaffPermissions, profile?: StaffKioskProfile }`.

### 2.3 UI Permission Enforcement Points
- **Discount Override Enforcement (`HybridCartPane`)**:
  - Check `punchState.currentPermissions?.can_override_discount`.
  - If `false`, selecting any discount tier (or custom discount) opens `ManagerOverrideModal`.
  - When override succeeds, apply the selected discount tier.
- **Stock Adjustment in Catalog Search (`/staff/search`)**:
  - Add an "Adjust Stock" action button to the table row.
  - When clicked:
    - If `currentPermissions?.can_adjust_stock === true`, directly open `StockAdjustmentModal`.
    - If `false`, open `ManagerOverrideModal`. On successful override, open `StockAdjustmentModal`.
  - On adjustment submission, execute `adjustProductStockAction` or `inventoryStore.adjustStock` and update available stock.

---

## 3. SWIFT Design Tokens Adherence
- Modals, buttons, and alert states strictly use semantic tokens:
  - Text: `text-text-primary`, `text-text-muted`, `text-text-secondary`, `text-text-light`
  - Surfaces: `bg-bg-surface`, `bg-bg-card`, `bg-bg-muted`, `bg-bg-hover`
  - Brand & Status: `bg-primary`, `bg-secondary`, `bg-success`, `bg-accent`, `bg-danger`, `border-border`
  - Zero hardcoded colors.
