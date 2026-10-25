# Implementation Plan: Automatic POS Labor Checkout to Service Bay Work Order Queue Bridge

**Feature**: `100-pos-labor-checkout-work-order-bridge`  
**Jira Ticket**: [SIAA-100](https://the-three-devsketeers.atlassian.net/browse/SIAA-100)  
**Branch**: `feat/SIAA-100-pos-labor-checkout-work-order-bridge`  

---

## 1. Architectural Strategy & Boundary Mapping

The bridge connects the POS checkout flow in `lib/pos/actions.ts` with the workshop queue in `components/staff/workshop/workshop-queue-client.tsx` and `lib/workshop/workshop-actions.ts`:

```text
POS Checkout Flow (lib/pos/actions.ts)
  │
  ├── Validate Payload via checkoutPayloadSchema (lib/pos/contracts.ts)
  │
  ├── Process Items:
  │     ├── If itemType === 'part': Decrement product stock & record stock audit logs
  │     └── If itemType === 'service': Invoke auto-provisioning bridge (lib/pos/work-order-bridge.ts)
  │
  ├── Work Order Auto-Provisioner:
  │     ├── Generate Order Number: WO-YYYY-XXXX
  │     ├── Resolve Bay ID matching service bay
  │     ├── Set status = 'QUEUED', mechanic_id = null
  │     ├── Insert into public.work_orders (or inMemoryOrders in offline/demo mode)
  │     └── Broadcast event over Supabase Realtime 'operational-intelligence'
  │
  └── Workshop Queue Client (components/staff/workshop/workshop-queue-client.tsx)
        └── On INSERT event: Prepend new card under "Workshop Bay Queue" (<500ms)
```

---

## 2. Server & Client Boundary Mapping

| File Path | Type | Responsibility |
| :--- | :--- | :--- |
| `lib/pos/work-order-bridge.ts` | Server Utility | Core logic to inspect items, resolve bay IDs, generate order numbers, and provision `work_orders` records |
| `lib/pos/actions.ts` | Server Action | Integrate work order bridge into `processCheckoutAction` (both Supabase RPC flow and mock/offline fallback) |
| `lib/pos/contracts.ts` | Schema / Contract | Extend `checkoutPayloadSchema` and validation for optional intake metadata |
| `lib/types/transaction.ts` | Type Definition | Add intake fields to `CheckoutPayload` and `workOrdersCreated` to `CheckoutActionResult` |
| `lib/workshop/workshop-actions.ts` | Server Action | Provide helper `appendInMemoryWorkOrder` for resilient offline/mock mode synchronization |
| `components/staff/workshop/workshop-queue-client.tsx` | `"use client"` | Enhance real-time handler to prepend newly inserted work orders dynamically |
| `lib/pos/__tests__/pos-labor-bridge.test.ts` | Test Suite | Unit and integration tests for labor auto-provisioning, pure parts bypass, and realtime broadcast |

---

## 3. Design Token & Tailwind v4 Compliance

- Strictly consume tokens from `app/globals.css` and `lib/tokens.ts`.
- Zero hardcoded colors.
- Newly rendered work order cards utilize existing `WorkOrderCard` tokens:
  - `bg-bg-card border-border text-text-primary`
  - Unassigned badge: `text-accent font-bold`
  - Claim button: `bg-primary hover:bg-primary-hover text-white`

---

## 4. Test Plan & Automated Verification

1. **Unit Tests (`lib/pos/__tests__/pos-labor-bridge.test.ts`)**:
   - Verify `autoProvisionWorkOrdersFromCheckout` creates work orders when cart contains `itemType = 'service'`.
   - Verify order numbers are generated in canonical format `WO-YYYY-XXXX`.
   - Verify `status = 'QUEUED'` and `mechanic_id = null`.
   - Verify pure parts checkouts (`itemType = 'part'`) produce 0 work orders.
   - Verify fallback intake defaults when customer info is omitted.
2. **Integration Tests (`lib/pos/__tests__/atomic-checkout-rpc.test.ts` & actions)**:
   - Verify `processCheckoutAction` response includes `workOrdersCreated: 1` and `workOrderNumbers: ['WO-...']`.
3. **Static Analysis & Typecheck**:
   - `npx tsc --noEmit` returns 0 errors.
   - `npm test` passes all tests cleanly.

---

## 5. Phased Atomic Implementation Order

- **Unit 1**: Specification & Design Artifacts (`docs(specs): [SIAA-100] ...`)
- **Unit 2**: Types, Contracts & Intake Payload Schema (`feat(pos): [SIAA-100] add intake fields and bridge contracts`)
- **Unit 3**: Work Order Auto-Provisioning Bridge Engine (`feat(pos): [SIAA-100] implement pos labor work order bridge`)
- **Unit 4**: Realtime Queue Integration & Reactive Prepending (`feat(workshop): [SIAA-100] wire realtime insertion to workshop queue`)
- **Unit 5**: Unit Tests & Regression Verification (`test(pos): [SIAA-100] add unit and integration tests for work order bridge`)
- **Unit 6**: Tasks Completion & Sync (`docs(specs): [SIAA-100] complete tasks and documentation`)
