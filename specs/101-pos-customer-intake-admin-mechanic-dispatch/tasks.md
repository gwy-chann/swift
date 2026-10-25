# Implementation Tasks: POS Customer & Complaint Intake Prompt with Admin On-Shift Mechanic Dispatch

**Feature**: `specs/101-pos-customer-intake-admin-mechanic-dispatch/spec.md`  
**Date**: 2026-10-26  
**Jira Ticket**: [SIAA-101](https://the-three-devsketeers.atlassian.net/browse/SIAA-101)  

---

## Phase 1: Contracts & Domain Types

- [x] **TASK-1.1**: Update `lib/types/transaction.ts` to add `customerPhone?: string` to `CheckoutPayload`.
- [x] **TASK-1.2**: Update `lib/pos/contracts.ts` to add `customerPhone` validation to `checkoutPayloadSchema`.
- [x] **TASK-1.3**: Add `lib/workshop/intake-dispatch-contracts.ts` defining `customerIntakeSchema`, `assignMechanicSchema`, and `onShiftMechanicSchema`.

---

## Phase 2: Bridge & Server Actions

- [x] **TASK-2.1**: Update `lib/pos/work-order-bridge.ts` to extract `customerPhone` from `CheckoutPayload` and persist it to `public.work_orders` and `DetailedWorkOrder`.
- [x] **TASK-2.2**: Update `lib/workshop/workshop-actions.ts` to implement `fetchOnShiftMechanicsAction()` querying active on-shift mechanics with mock fallback.
- [x] **TASK-2.3**: Update `lib/workshop/workshop-actions.ts` to implement `assignMechanicAction(orderId, mechanicId, mechanicName)` with DB update, in-memory sync, and `operational-intelligence` broadcast.

---

## Phase 3: Automated Unit & Contract Tests

- [x] **TASK-3.1**: Create `lib/pos/__tests__/customer-intake-contracts.test.ts` testing Philippine phone number validation and required fields.
- [x] **TASK-3.2**: Create `lib/workshop/__tests__/mechanic-dispatch.test.ts` testing `fetchOnShiftMechanicsAction` and `assignMechanicAction`.
- [x] **TASK-3.3**: Update `lib/pos/__tests__/pos-labor-bridge.test.ts` to test persistence of intake values (`customerPhone`, complaints, vehicle model).

---

## Phase 4: POS Customer Intake Modal Component

- [x] **TASK-4.1**: Create `components/pos/customer-intake-modal.tsx` with Philippine phone regex validation, accessible ARIA attributes, and strict SWIFT design tokens (`lib/tokens.ts`, `globals.css`).

---

## Phase 5: POS Page & Cart Store Wiring

- [x] **TASK-5.1**: Update `lib/store/cart-store.ts` to support holding and passing `customerPhone`, `customerName`, `vehicleModel`, `plateNumber`, and `notes` during checkout.
- [x] **TASK-5.2**: Update `app/staff/pos/page.tsx` to intercept checkout when labor service items exist, opening `CustomerIntakeModal` before payment tender.
- [x] **TASK-5.3**: Update `app/admin/pos/page.tsx` to intercept checkout when labor service items exist, opening `CustomerIntakeModal` before payment tender.

---

## Phase 6: Workshop Queue & Admin Dispatch UI

- [x] **TASK-6.1**: Update `components/staff/workshop/work-order-detail-drawer.tsx` to display real customer phone, real complaints, and render the interactive on-shift mechanic dispatch dropdown when user is admin.
- [x] **TASK-6.2**: Update `components/staff/workshop/workshop-queue-client.tsx` to handle `WORK_ORDER_ASSIGNED` realtime events and pass admin context to the detail drawer.

---

## Phase 7: Verification & Convergence

- [x] **TASK-7.1**: Run `npm run typecheck` (`tsc --noEmit`) to verify zero TypeScript errors.
- [x] **TASK-7.2**: Run `npm run lint` to verify code quality.
- [x] **TASK-7.3**: Run `npm test` to verify all unit and integration tests pass.
- [x] **TASK-7.4**: Sync Graphify knowledge graph (`graphify . --update`).
