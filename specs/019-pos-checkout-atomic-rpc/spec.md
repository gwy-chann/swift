# Feature Specification: Supabase Atomic Checkout RPC with Stock Decrements & Audit Logging

**Feature Branch**: `feat/SIAA-51-atomic-checkout-rpc-stock-decrements`  
**Created**: 2026-10-11  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-51](https://the-three-devsketeers.atlassian.net/browse/SIAA-51) (STORY-3.8)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) (EPIC-3: Point of Sale & Hybrid Service Billing)  

---

## 1. Executive Summary & Objective

In a high-throughput motorcycle parts retail store and repair shop, multiple cashiers and service advisors process transactions concurrently across separate floor terminals. Finalizing a sale involves multiple critical database operations:
1. Recording the master receipt and payment details in `public.transactions`.
2. Inserting itemized physical parts and workshop labor services in `public.transaction_items`.
3. Decrementing physical inventory counts in `public.products`.
4. Writing immutable audit logs in `public.stock_adjustment_logs` with adjustment type `'POS Sale'`.

If these steps were executed across multiple separate HTTP calls from the client, race conditions (overselling when two terminals checkout the last unit simultaneously) and partial failure states (transaction recorded but stock not deducted, or vice versa) would corrupt inventory and financial books.

This feature implements the canonical, atomic PostgreSQL stored procedure:
`public.process_pos_checkout(p_transaction JSONB, p_items JSONB)`

Executing in a single ACID transaction with pessimistic row-level locking (`FOR UPDATE`) on target products, it guarantees:
- **Zero Overselling / Concurrency Safety**: Row-level locking serializes concurrent checkouts on identical SKUs.
- **Atomic Rollback**: If any physical part has insufficient on-hand stock (`stock < quantity`), the procedure aborts with error code `INSUFFICIENT_STOCK: <sku>`, rolling back all insertions and stock changes completely.
- **Non-Repudiation Staff Attribution**: Resolves and verifies `cashier_id` against `auth.uid()`.
- **Audit Ledger Synchronization**: Automatically logs each deducted physical part into `public.stock_adjustment_logs` with `type = 'POS Sale'`.
- **Server Action & UI Wiring**: Exposes `processCheckoutAction(payload)` in `lib/pos/actions.ts` and wires the Staff POS (`/staff/pos`) and Admin POS (`/admin/pos`) terminals with high-contrast out-of-stock toast alerts.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Atomic POS Checkout Stored Procedure Execution (Priority: P1)

* **As a** Cashier or Inventory Manager,
* **I want** the complete POS checkout executed via an atomic PostgreSQL stored procedure that simultaneously decrements physical stock and logs inventory audit entries,
* **so that** multi-terminal checkout collisions never result in overselling and sales records match physical shelf inventory.

#### Scenario 1: Atomic Checkout Transaction (`process_pos_checkout`)
* **Given** an active cart containing physical parts (e.g., `MOT-3100-10W40`, `HON-CLK-CVTB`) and workshop labor services (e.g., `SRV-OIL-01`),
* **When** RPC `public.process_pos_checkout(p_transaction, p_items)` is invoked,
* **Then** in a single atomic database transaction:
  1. Inserts the transaction record into `public.transactions`.
  2. Inserts all items into `public.transaction_items` referencing the generated transaction ID.
  3. Acquires pessimistic `FOR UPDATE` lock on each physical part in `public.products` and decrements `stock` by the purchased quantity.
  4. Inserts immutable audit records into `public.stock_adjustment_logs` with `adjustment_type: 'POS Sale'`, `quantity_delta: -quantity`, `previous_stock`, `new_stock`, and receipt reference in `reason`.
  5. Returns a JSONB object containing `{ success: true, transaction_id: UUID, receipt_number: TEXT, items_count: INT }`.

#### Scenario 2: Out-of-Stock Protection & Rollback
* **Given** a physical part has on-hand `stock = 1`,
* **When** a cashier attempts to checkout quantity `2`,
* **Then** the stored procedure aborts immediately with exception `INSUFFICIENT_STOCK: <sku>` (error code `P0001`),
* **And** the entire transaction rolls back: no record is inserted into `public.transactions` or `public.transaction_items`, no stock is decremented, and no audit log is created.

#### Scenario 3: Non-Repudiation Staff Attribution
* **Given** an authenticated cashier session,
* **When** `process_pos_checkout` executes,
* **Then** `cashier_id` in the transaction is verified against `auth.uid()`,
* **And** the cashier's full name or email from `public.profiles` / `auth.users` is attributed on the transaction and stock audit logs.

---

### User Story 2 - Next.js Server Action & Offline/Mock Fallback (Priority: P1)

* **As a** Full-Stack Developer,
* **I want** a robust Server Action `processCheckoutAction(payload)` in `lib/pos/actions.ts`,
* **so that** frontend components can execute checkout with type safety, structured error handling, and offline development fallback.

#### Scenario 4: Server Action Execution & Validation
* **Given** a checkout request payload containing transaction header details and itemized lines,
* **When** `processCheckoutAction(payload)` is called,
* **Then** it validates payload integrity via Zod schema,
* **And** invokes `supabase.rpc('process_pos_checkout', { p_transaction, p_items })`,
* **And** returns a strongly-typed `CheckoutActionResult` with `{ success: true, transactionId, receiptNumber }`.

#### Scenario 5: Error Handling for Insufficient Stock
* **Given** the database throws `INSUFFICIENT_STOCK: <sku>`,
* **When** `processCheckoutAction(payload)` catches the database error,
* **Then** it returns `{ success: false, code: 'INSUFFICIENT_STOCK', sku: '<sku>', error: 'Insufficient stock for SKU <sku>' }`.

#### Scenario 6: Mock Engine Fallback for Local/Offline Development
* **Given** Supabase is unreachable or in mock mode,
* **When** `processCheckoutAction(payload)` executes,
* **Then** it falls back gracefully to `inventoryStore` and in-memory mock validation, verifying stock constraints and updating memory stores without crashing.

---

### User Story 3 - POS UI Wiring & High-Contrast Toast Notifications (Priority: P2)

* **As a** Fast-Lane Cashier,
* **I want** the Staff POS and Admin POS interfaces to invoke `processCheckoutAction` upon clicking "Complete Sale" or pressing `F12`,
* **so that** I receive immediate visual confirmation of successful checkout or high-contrast alerts if items are out of stock.

#### Scenario 7: Out-of-Stock High-Contrast Toast
* **Given** an attempt to checkout an item that became out of stock,
* **When** the server action returns `INSUFFICIENT_STOCK`,
* **Then** the POS interface displays a high-contrast toast notification indicating the exact out-of-stock SKU (e.g., `"Cannot complete checkout: MOT-3100-10W40 is out of stock"`),
* **And** cart state is preserved without clearing, allowing the cashier to adjust quantities or remove the item.

#### Scenario 8: Successful Checkout State Convergence
* **Given** a successful checkout response from `processCheckoutAction`,
* **When** the transaction completes,
* **Then** the cart is cleared, inventory stock counts are refreshed, and a success confirmation displays.

---

## 3. Mathematical & Business Invariants

1. **Conservation of Stock**:
   $$\text{new\_stock} = \text{previous\_stock} - \text{quantity}$$
   $$\forall \text{ items where item\_type} = \text{'part'}, \quad \text{new\_stock} \ge 0$$
2. **Service Exemption**:
   Items where `item_type = 'service'` (workshop labor) do **not** affect physical inventory tables or generate stock adjustment logs.
3. **Transaction Immutability**:
   Once created by `process_pos_checkout`, records in `public.transactions` and `public.transaction_items` cannot be modified or deleted, protected by `trg_prevent_transaction_modifications`.
4. **Financial Totals Consistency**:
   $$\text{subtotal} = \sum (\text{unit\_price} \times \text{quantity})$$
   $$\text{total\_due} = \text{subtotal} - \text{discount\_amount}$$
   $$\text{cash\_tendered} \ge \text{total\_due}$$
   $$\text{change\_due} = \text{cash\_tendered} - \text{total\_due}$$

---

## 4. Dependencies & Prerequisites

- **SIAA-45**: Master Parts Catalog Schema (`public.products`)
- **SIAA-46**: Stock Adjustment Logs Ledger (`public.stock_adjustment_logs`)

---

## 5. Clarification Log & Architectural Boundaries

1. **Deadlock Prevention in Multi-Item Checkout**:
   - *Question*: How should concurrent checkouts acquiring locks on overlapping sets of products prevent deadlocks?
   - *Resolution*: The stored procedure orders parts deterministically by SKU (`ORDER BY item_sku_or_code ASC`) when acquiring row locks `FOR UPDATE`.
2. **Adjustment Type Naming in Ledger**:
   - *Question*: What exact string must be recorded in `public.stock_adjustment_logs.adjustment_type`?
   - *Resolution*: The Jira specification explicitly stipulates `'POS Sale'`.
3. **Behavior when Cart Contains Only Services**:
   - *Question*: Does a pure labor service sale (zero physical parts) still succeed?
   - *Resolution*: Yes. `transactions` and `transaction_items` are inserted, zero product stocks are decremented, zero stock logs are created, and the transaction commits successfully.
4. **Receipt Number Generation**:
   - *Question*: Where is the receipt number generated if not provided in `p_transaction`?
   - *Resolution*: The client or server action passes `receipt_number` (e.g. `TX-1044` or timestamp format `TX-YYYYMMDD-XXXX`). If null or omitted, the RPC generates a fallback `TX-` prefixed unique sequence.

