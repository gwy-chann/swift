# Technical Implementation Plan: Kiosk Session Granular Permissions

**Feature**: Kiosk Session Granular Permissions: Hydrate custom employee flags and enforce feature capabilities  
**Branch**: `feat/SIAA-86-kiosk-session-granular-permissions`  
**Jira Issue**: [SIAA-86](https://the-three-devsketeers.atlassian.net/browse/SIAA-86)

---

## 1. Architecture & Boundary Mapping

| Layer | Files | Purpose |
|---|---|---|
| **Contracts & Types** | `lib/staff/types.ts`<br>`lib/contracts/kiosk-session-permissions.ts` | Add `permissions` to `StaffKioskProfile`, define `FetchStaffShiftResult`. |
| **Server Actions** | `lib/staff/actions.ts` | Update `verifyStaffPinAction` to select `permissions`; implement `fetchStaffShiftAction`. |
| **Client State** | `lib/store/punch-store.ts` | Add `currentPermissions` to `PunchStoreState`, update `switchStaff`, handle permission storage. |
| **UI Components** | `components/staff/clock/staff-profile-switcher.tsx`<br>`components/pos/hybrid-cart-pane.tsx`<br>`app/staff/search/page.tsx` | Propagate permissions on profile switch, guard discount selection with `ManagerOverrideModal`, and render stock adjustment with permission evaluation. |
| **Testing** | `lib/staff/__tests__/staff-kiosk-permissions.test.ts` | Comprehensive unit & integration tests covering all Gherkin scenarios. |

---

## 2. Component Hierarchy & Flow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff / Cashier
    participant Terminal as Shop Floor Terminal
    participant PunchStore as usePunchStore()
    participant Actions as Server Actions (lib/staff/actions.ts)
    participant Modal as ManagerOverrideModal

    Staff->>Terminal: Authenticate via PIN / Profile Switch
    Terminal->>Actions: verifyStaffPinAction(profileId, pin)
    Actions-->>Terminal: { success: true, profile: { ..., permissions } }
    Terminal->>PunchStore: switchStaff({ id, name, role, permissions })
    PunchStore->>PunchStore: Update currentPermissions & persist

    Note over Terminal: Scenario 2: Discount Override Check
    Staff->>Terminal: Click Discount Tier (e.g. VIP 10%)
    alt can_override_discount === true
        Terminal->>Terminal: Apply discount directly to cart
    else can_override_discount === false
        Terminal->>Modal: Prompt Manager Elevation
        Staff->>Modal: Enter Manager PIN
        Modal->>Actions: verifyAdminElevationAction(pin)
        Modal-->>Terminal: onOverrideSuccess()
        Terminal->>Terminal: Apply discount to cart
    end

    Note over Terminal: Scenario 1: Stock Adjustment Check
    Staff->>Terminal: Open /staff/search & click Adjust Stock
    alt can_adjust_stock === true
        Terminal->>Terminal: Open StockAdjustmentModal directly
    else can_adjust_stock === false
        Terminal->>Modal: Prompt Manager Elevation
        Modal-->>Terminal: On success, open StockAdjustmentModal
    end
```

---

## 3. SWIFT Design Tokens Adherence
- Zero hardcoded colors.
- Use `text-text-primary`, `bg-bg-surface`, `bg-bg-card`, `border-border`, `text-success`, `text-accent`, `bg-primary`, etc.
