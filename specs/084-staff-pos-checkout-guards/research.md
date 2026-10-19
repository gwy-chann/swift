# Architecture Research: Staff POS Checkout Authorization & Action Guards

**Feature**: `084-staff-pos-checkout-guards`  
**Jira Issue**: [SIAA-84](https://the-three-devsketeers.atlassian.net/browse/SIAA-84)  
**Date**: 2026-10-20  

---

## 1. Stack Constraints & Dependencies

- **Framework**: Next.js 15+ (App Router), React 19 Client Components (`useSyncExternalStore`, custom modal dialogues).
- **Styling**: Tailwind CSS v4 using semantic design tokens (`bg-bg-surface`, `bg-bg-card`, `border-border`, `border-danger`, `text-danger`, `text-text-primary`, `text-text-muted`, `bg-primary`, `bg-primary-hover`). Zero hardcoded hex/rgb.
- **State Engines**:
  - `PunchStore` (`lib/store/punch-store.ts`): Client state engine managing active shifts, staff profiles, multi-staff session maps, and offline queuing. Needs `currentStaffRole` tracking.
  - `useCartStore`: Cart state containing items, total amount, discounts, and item count.
- **Security & Elevation Engine**:
  - `verifyAdminElevationAction` (`lib/staff/actions.ts`): Server action validating admin PIN / master credentials and logging forensic events.
  - `logSecurityEventAction` (`lib/admin/audit-actions.ts`): Server action logging audit trail events to `public.system_audit_logs`.
- **Keyboard Handling**:
  - `evaluatePosHotkey` (`lib/pos/barcode-scanner.ts`): Pure evaluator for POS keyboard hotkeys (`F12`, `F9`, `Escape`).

---

## 2. Problem Diagnosis & Architecture Analysis

### Current Checkout Flow
In `app/staff/pos/page.tsx`:
```tsx
const { isShiftActive, shiftStatus, currentStaff } = usePunchStore();

const handleOpenPayment = useCallback(() => {
  if (items.length === 0 || isProcessing) return;
  if (!isShiftActive || shiftStatus !== "on_shift") {
    setIsShiftGuardModalOpen(true);
    return;
  }
  openPaymentModal();
}, [items.length, isProcessing, isShiftActive, shiftStatus, openPaymentModal]);
```

Notice that `handleOpenPayment` only tests `isShiftActive` and `shiftStatus !== "on_shift"`. It does NOT inspect what role the logged-in user possesses.
Even if Dante Reyes (`mechanic`) or Rico Santos (`inventory_clerk`) is the current operator on the kiosk, clicking "Proceed to Payment" or pressing `F12` directly opens `PaymentModal`, allowing them to accept cash and record completed transactions.

### Architectural Fixes Needed
1. **Extend `PunchStoreState` with `currentStaffRole`**:
   - `PunchStoreState` must include `currentStaffRole: DbUserRole | 'admin' | 'cashier' | 'mechanic' | 'inventory_clerk' | 'staff'`.
   - `StaffMemberShiftState` should also record `role?: string`.
   - `switchStaff` should update `currentStaffRole` from the profile passed or look it up in `MOCK_STAFF_PROFILES`.
   - Default initialization must set `currentStaffRole: 'cashier'` for Mike Morales (or derive from initial profile).
   - Serialization to `localStorage` (`swift_staff_shift_state`) must preserve `currentStaffRole`.

2. **Update `evaluatePosHotkey`**:
   - Add `userRole?: string` to hotkey options.
   - If `key === "F12" || key === "F9"`:
     - Check `options.userRole`: if specified and not authorized (`role !== 'cashier' && role !== 'admin'`), return `action: "CHECKOUT_PAY"`, `canExecute: false`, `reason: "UNAUTHORIZED_ROLE"`, `message: "Access Restricted: Only active Cashiers or Store Managers can process sales and accept payments."`.

3. **Create `UnauthorizedRoleModal`**:
   - Displays accessible dialog when `isUnauthorizedModalOpen` is true.
   - Shows operator name and role badge (`Mechanic` or `Inventory Clerk`).
   - Warning banner: "Access Restricted: Only active Cashiers or Store Managers can process sales and accept payments."
   - Action buttons:
     - "Dismiss" / "Cancel"
     - "Request Manager Override" (opens `ManagerOverrideModal`).

4. **Create or Wire `ManagerOverrideModal`**:
   - Prompts for Administrator PIN or Master Password.
   - On submission, calls `verifyAdminElevationAction(pinOrPassword)`.
   - If successful, sets a temporary one-time checkout flag (or opens `openPaymentModal()`), logs an audit event indicating authorized override, and closes the modals.

5. **Audit Logging on Rejection**:
   - In `handleOpenPayment` or `evaluatePosHotkey` handler, call `logSecurityEventAction` with:
     ```ts
     {
       action: `Unauthorized POS Checkout Attempt by ${currentStaff} (${currentStaffRole})`,
       severity: 'warning',
       terminalIp: 'Terminal #01 (Shop Floor)',
       userEmail: currentStaffEmail || `${currentStaffRole}@swift.local`,
       metadata: {
         role: currentStaffRole,
         staffName: currentStaff,
         cartItemCount: items.length,
         cartTotal: total,
         attemptedAt: new Date().toISOString()
       }
     }
     ```

---

## 3. Architecture Decisions (ADRs)

### ADR-1: Client-Side Synchronous Role Guard + Server-Side Action Validation
- **Decision**: Guard both the client-side checkout modal invocation (`handleOpenPayment`, `evaluatePosHotkey`) and pass cashier role verification during `checkout` server action if applicable.
- **Rationale**: Immediate responsive feedback on the kiosk terminal prevents unauthorized staff from viewing payment tender options, while server actions ensure API security.

### ADR-2: One-Time Transient Manager Override Flag
- **Decision**: Manager override for POS checkout grants authorization for the single immediate transaction rather than permanently modifying the staff profile's role.
- **Rationale**: If a mechanic needs an emergency one-time sale approved by a manager, the mechanic remains a mechanic; only the single transaction is authorized under the manager's oversight.
