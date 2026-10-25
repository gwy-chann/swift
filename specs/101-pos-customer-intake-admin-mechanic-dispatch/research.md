# Research & Technical Architecture: POS Customer & Complaint Intake Prompt with Admin On-Shift Mechanic Dispatch

**Feature**: `specs/101-pos-customer-intake-admin-mechanic-dispatch/spec.md`  
**Date**: 2026-10-26  
**Jira Ticket**: [SIAA-101](https://the-three-devsketeers.atlassian.net/browse/SIAA-101)  

---

## 1. Technical Context & Stack Constraints

- **Framework**: Next.js 15+ (App Router) with React 19, TypeScript 5.
- **Styling**: Tailwind CSS v4 using SWIFT design tokens (`lib/tokens.ts`, `app/globals.css`). No hardcoded colors; canonical v4 syntax (`bg-linear-to-*`, `aspect-4/5`, etc.).
- **Persistence**: Supabase PostgreSQL (`public.work_orders`, `public.staff_shifts`, `public.profiles`) with graceful fallback to in-memory store for offline development and isolated testing.
- **Realtime**: Supabase Realtime broadcast channel `operational-intelligence` for instant multi-terminal dispatch updates.
- **State Management**: `useCartStore` (`lib/store/cart-store.ts`) for POS active ticket state; `usePunchStore` (`lib/store/punch-store.ts`) for staff terminal identity and active shifts.

---

## 2. Existing Architecture & Gap Analysis

### 2.1 POS Checkout Flow & Interception Points
Currently:
1. When a cashier or admin clicks "Complete Sale (F12)" in `HybridCartPane`:
   - In `app/staff/pos/page.tsx`: Checks shift guard (`isShiftGuardModalOpen`) and role permissions (`UnauthorizedRoleModal`). If authorized, directly opens `openPaymentModal()`.
   - In `app/admin/pos/page.tsx`: Directly invokes `openPaymentModal()`.
2. `PaymentModal` collects cash tendered and triggers `checkout({ cashier, cashTendered, paymentMethod })`.
3. In `lib/store/cart-store.ts`, `checkout` packages `CheckoutPayload` and invokes `processCheckoutAction(payload)`.
4. In `lib/pos/actions.ts`, `autoProvisionWorkOrdersFromCheckout` (`lib/pos/work-order-bridge.ts`) auto-creates work orders if labor items are present.
5. **Gaps Identified**:
   - Neither `/staff/pos` nor `/admin/pos` prompts for customer information when labor items exist.
   - `CheckoutPayload` in `lib/types/transaction.ts` and `checkoutPayloadSchema` in `lib/pos/contracts.ts` omit `customerPhone`.
   - In `work-order-bridge.ts`, `customerPhone` is hardcoded to `'0917-000-0000'`, and customer details fall back to `'Walk-in Customer'`, `'Motorcycle (General)'`, and `'FOR-REG'`.

### 2.2 Workshop Queue & Detail Drawer
Currently:
1. `components/staff/workshop/workshop-queue-client.tsx` displays active jobs and bay queue.
2. `WorkOrderDetailDrawer` (`components/staff/workshop/work-order-detail-drawer.tsx`) renders customer and mechanic details:
   - Line 115: Renders `order.customerPhone || "N/A"`.
   - Lines 120-125: Renders `order.mechanicName || "Unassigned"` as static text.
   - Mechanics can self-claim via `claimWorkOrderAction` from the card button.
3. **Gaps Identified**:
   - No interactive dispatch dropdown exists for Admins to assign an order directly to an on-shift mechanic.
   - No dedicated server action `assignMechanicAction` exists to update `mechanic_id`, revalidate paths, and broadcast assignment over `operational-intelligence`.
   - No role check or prop in `WorkOrderDetailDrawer` or `WorkOrderCard` to distinguish Admin supervisors from floor mechanics.

---

## 3. Architecture & Implementation Decisions

### Decision 1: POS Intake Modal Interception State Machine
- **Where**: Introduce `CustomerIntakeModal` (`components/pos/customer-intake-modal.tsx`).
- **Trigger**: When `handleOpenPayment` is triggered (via button or F12):
  - Check if `items.some(item => item.type === 'service')`.
  - If **false** (pure parts cart): Immediately open `PaymentModal`.
  - If **true** (contains service): Check if customer intake data is already held in cart store / local state:
    - If not yet entered or user wants to edit: Open `CustomerIntakeModal`.
    - Once `CustomerIntakeModal` is confirmed, store intake data in cart store (`customerName`, `customerPhone`, `vehicleModel`, `plateNumber`, `complaints`), then open `PaymentModal`.
  - If user cancels `CustomerIntakeModal`, return to cart without opening payment.

### Decision 2: Philippine Mobile Phone Validation
- Standard Philippine mobile numbers follow:
  - Raw 11 digits: `09XXXXXXXXX` (e.g. `09171234567`)
  - Formatted: `09XX-XXX-XXXX` or `09XX XXX XXXX`
- Regular Expression: `^(09|\+639)\d{9}$|^09\d{2}[-\s]?\d{3}[-\s]?\d{4}$`
- Form auto-formats or strips dashes cleanly before validation and submission.

### Decision 3: Extending `CheckoutPayload` Contract
Update `lib/types/transaction.ts` and `lib/pos/contracts.ts`:
```typescript
export const checkoutPayloadSchema = z.object({
  // ...
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  vehicleModel: z.string().trim().optional(),
  plateNumber: z.string().trim().optional(),
  notes: z.string().trim().nullable().optional(),
  // ...
});
```
Update `autoProvisionWorkOrdersFromCheckout` in `lib/pos/work-order-bridge.ts`:
- Map `customerPhone: payload.customerPhone?.trim() || '0917-000-0000'` (fallback only if intake was somehow bypassed or empty).
- Insert `customer_phone` into Supabase `work_orders`.

### Decision 4: Admin On-Shift Mechanic Dispatch Action & Selector
- Create `fetchOnShiftMechanicsAction()`:
  - Queries `public.staff_shifts` joining `public.profiles` where `status = 'on_shift'` and `role = 'mechanic'`.
  - In mock/offline mode: Returns currently active mechanics from mock roster (`Dante Reyes`, `Alex Lim`) or `usePunchStore`.
- Create `assignMechanicAction(orderId: string, mechanicId: string, mechanicName: string)`:
  - Updates `public.work_orders` setting `mechanic_id = mechanicId`, `updated_at = NOW()`.
  - Updates in-memory `inMemoryOrders` list.
  - Broadcasts `WORK_ORDER_ASSIGNED` over `operational-intelligence` Supabase channel.
  - Calls `safeRevalidatePaths()` for `/staff/work-orders` and `/admin`.
- Update `WorkOrderDetailDrawer` and `WorkOrderCard`:
  - Accept optional `isAdmin?: boolean` prop or resolve from current user session.
  - If `isAdmin === true`: Render interactive `MechanicDispatchSelector` inside the Drawer / Card.
  - If `isAdmin !== true`: Render static text and/or "Claim Job" button for technicians.

---

## 4. UI/UX Design System Compliance

All components MUST strictly consume design tokens from `lib/tokens.ts` and `app/globals.css`:
- Modals: `bg-bg-card`, `border-border`, `text-text-primary`, `backdrop-blur-xs`.
- Form inputs: `bg-bg-surface`, `border-border`, `focus:border-primary`, `focus:ring-primary/20`.
- Badges & Buttons: `bg-primary`, `text-text-light`, `bg-warning-light`, `text-warning`.
- No arbitrary Tailwind hex/bracket colors (e.g. `bg-[#1a1a1a]`).
