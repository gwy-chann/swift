# Implementation Plan: Staff POS Checkout Authorization & Action Guards

**Feature**: `084-staff-pos-checkout-guards`  
**Jira Issue**: [SIAA-84](https://the-three-devsketeers.atlassian.net/browse/SIAA-84)  
**Date**: 2026-10-20  

---

## 1. Technical Architecture & File Boundary Mapping

```
lib/
├── contracts/
│   └── checkout-guard.ts              # Authorization contracts & evaluator logic
├── store/
│   └── punch-store.ts                 # Add currentStaffRole to PunchStoreState and switchStaff
├── pos/
│   ├── barcode-scanner.ts             # Extend evaluatePosHotkey to validate userRole (F12, F9)
│   └── __tests__/
│       └── staff-pos-checkout-guard.test.ts # Comprehensive unit tests for checkout authorization
components/
├── pos/
│   ├── unauthorized-role-modal.tsx    # Accessible modal warning of restricted role checkout
│   └── manager-override-modal.tsx     # PIN-based admin elevation override modal
app/
└── staff/
    └── pos/
        └── page.tsx                   # Wire handleOpenPayment role guard, modals, and audit logging
```

---

## 2. Implementation Phases

### Phase 1: Store & Contract Enhancements
1. Add `currentStaffRole` and per-session role tracking in `lib/store/punch-store.ts`.
2. Ensure `switchStaff({ id, name, role })` updates `currentStaffRole` from profile or `MOCK_STAFF_PROFILES`.
3. Expose `currentStaffRole` through `usePunchStore()`.
4. Copy/export `evaluatePosCheckoutAuthorization` in `lib/contracts/checkout-guard.ts`.
5. Update `lib/pos/barcode-scanner.ts`'s `evaluatePosHotkey` to inspect `userRole` and support `F9` as an alternate checkout hotkey.

### Phase 2: UI Modals
1. Create `components/pos/unauthorized-role-modal.tsx`:
   - Adhere strictly to SWIFT design tokens (`bg-bg-surface`, `bg-bg-card`, `border-danger`, `text-text-primary`, `text-text-muted`, `bg-danger/10`, `text-danger`).
   - Clean iconography (`ShieldAlert`, `Lock`, `X`, `KeyRound` from `lucide-react`).
   - Buttons: "Dismiss / Back to Cart" and "Request Manager Override".
2. Create `components/pos/manager-override-modal.tsx`:
   - Prompt for Manager PIN / password.
   - Numeric keypad buttons and direct keyboard input.
   - Integrate with `verifyAdminElevationAction` from `lib/staff/actions.ts`.
   - On success, trigger `onOverrideSuccess()`.

### Phase 3: Staff POS Page Wiring & Audit Trail
1. In `app/staff/pos/page.tsx`:
   - Retrieve `currentStaffRole` from `usePunchStore()`.
   - In `handleOpenPayment`:
     - If not shift active: open shift guard modal.
     - Evaluate role authorization.
     - If unauthorized:
       - Set `isUnauthorizedModalOpen(true)`.
       - Asynchronously dispatch `logSecurityEventAction` with structured metadata.
     - If authorized or one-time override is active:
       - Clear one-time override flag and open `PaymentModal`.
   - Wire `evaluatePosHotkey` to pass `userRole: currentStaffRole`.
   - Render `UnauthorizedRoleModal` and `ManagerOverrideModal`.

### Phase 4: Automated Testing & Verification
1. Create `lib/pos/__tests__/staff-pos-checkout-guard.test.ts`:
   - Verify `evaluatePosCheckoutAuthorization`:
     - Allows `cashier` and `admin` when shift is active and cart has items.
     - Denies `mechanic`, `inventory_clerk`, `staff` with `reason: 'UNAUTHORIZED_ROLE'`.
     - Allows any role when `hasOneTimeManagerOverride: true`.
     - Rejects when cart is empty or shift is inactive regardless of role.
   - Verify `evaluatePosHotkey`:
     - Rejects `F12` and `F9` with `UNAUTHORIZED_ROLE` when `userRole: 'mechanic'`.
     - Permits `F12` and `F9` when `userRole: 'cashier'`.
2. Run test suites and TypeScript verification.
