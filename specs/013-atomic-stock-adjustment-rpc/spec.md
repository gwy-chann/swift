# Feature Specification: Supabase Atomic Stock Adjustment RPC & Immutable Audit Ledger

**Feature Branch**: `feat/SIAA-46-atomic-stock-adjustment-rpc`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-46 - STORY-2.7: Supabase Atomic Stock Adjustment RPC & Immutable Audit Ledger. Stock quantity adjustments executed through an atomic PostgreSQL stored procedure that records an immutable audit log, so that stock counts never drop below zero and inventory shrinkage or discrepancies are 100% accountable with staff attribution."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Atomic Stock Modification with Zero-Floor Enforcement (Priority: P1)

Inventory auditors, store owners, and shop clerks need stock level adjustments processed as a single atomic transaction where physical counts never fall below zero, guaranteeing that either the full adjustment and log commit cleanly or the entire operation is safely rolled back.

**Why this priority**: Preventing inventory figures from dropping into negative numbers is fundamental to workshop stock integrity, purchase order accuracy, and financial reconciliation. A failed or partial update corrupts ledger state across the entire parts catalog.

**Independent Test**: Can be independently verified by executing stock reduction commands against known quantities—both within available bounds and exceeding available bounds—verifying that valid adjustments commit cleanly and excess deductions immediately abort with no partial inventory changes.

**Acceptance Scenarios**:

1. **Given** a product in the parts catalog with an on-hand stock of 15 units, **When** an authorized staff member submits an adjustment deduction of 5 units with a valid reason, **Then** on-hand stock decreases to 10 units and the transaction completes successfully.
2. **Given** a product in the parts catalog with an on-hand stock of 4 units, **When** a staff member attempts to deduct 10 units, **Then** the transaction is rejected with an insufficient stock notification and the on-hand stock remains strictly unchanged at 4 units.
3. **Given** two concurrent deduction attempts simultaneously requesting all available units of a low-stock SKU, **When** both requests execute, **Then** the system serializes the transactional evaluation such that only the first request succeeds and the second request safely fails without allowing stock to become negative.

---

### User Story 2 - Tamper-Proof Immutable Audit Ledger with Staff Attribution (Priority: P1)

Store management and internal compliance auditors require every inventory count modification to be automatically recorded in an append-only audit trail with immutable timestamps, before-and-after balances, quantity deltas, operational reasons, and cryptographically verified staff identities that cannot be spoofed or altered.

**Why this priority**: Eliminates unrecorded shrinkage, untracked parts losses, and unauthorized stock manipulation. Enforcing non-repudiation guarantees complete accountability for every single stock change in the workshop.

**Independent Test**: Can be tested independently by checking audit trail records following each stock adjustment and attempting to modify or delete historical records across unauthenticated, staff, and database administrative roles to confirm append-only enforcement.

**Acceptance Scenarios**:

1. **Given** an authenticated staff member executing a stock adjustment of +12 units on a product, **When** the adjustment succeeds, **Then** a new record is added to the audit ledger capturing the exact product SKU, adjustment classification, delta (+12), previous quantity, new quantity, operational reason, staff account identifier, staff display name, and creation timestamp.
2. **Given** existing records in the audit ledger, **When** any user, application client, or staff role attempts an update or delete query against ledger rows, **Then** the database security policies reject the command with an access violation error.
3. **Given** an adjustment request submitted by an authenticated staff member, **When** the ledger record is generated, **Then** the user identity is automatically resolved from the authenticated session context rather than relying on or accepting client-provided user parameters.

---

### User Story 3 - Immediate User Interface Feedback with Optimistic Rollback (Priority: P2)

Counter staff and warehouse clerks adjusting quantities through interactive dialogs need immediate visual feedback in the parts catalog without sluggish page reloads, accompanied by an automatic visual rollback and alert notification if the backend transaction fails.

**Why this priority**: High-volume motorcycle parts counters demand instantaneous UI responsiveness (<16ms) while ensuring that temporary optimistic displays never deceive the clerk if network drops or stock exhaustion aborts the save.

**Independent Test**: Can be tested independently in the inventory catalog interface by triggering adjustments under both normal conditions and simulated transaction failures, verifying instantaneous badge updates followed by graceful UI rollbacks upon error response.

**Acceptance Scenarios**:

1. **Given** an inventory clerk viewing a product in the catalog table, **When** they confirm a valid stock adjustment in the adjustment modal, **Then** the stock count badge in the table updates immediately (<16ms) to reflect the new count before the background network round-trip finishes.
2. **Given** an optimistic stock adjustment update displayed in the user interface, **When** the background transactional request encounters an insufficient stock or network failure, **Then** the stock count badge immediately reverts to its original quantity and an informative alert notification is displayed explaining the failure.

---

### Edge Cases

- **Exact Zero Depletion**: An adjustment reducing on-hand stock exactly to zero (e.g., deducting 5 from 5) MUST succeed, setting new stock to 0 and logging the transition without triggering an insufficient stock error.
- **Zero Delta Adjustment**: An adjustment submitted with a quantity delta of 0 MUST be rejected before transaction processing as a no-op with a descriptive validation error.
- **Missing or Blank Reason on Deductions**: Deductions classified as shrinkage, audit correction, or damaged goods write-offs MUST require an explanatory reason note to prevent unattributed inventory reductions.
- **Unknown Product SKU**: An adjustment referencing a non-existent or inactive SKU MUST fail gracefully, rolling back any partial execution and notifying the user that the target product was not found.
- **Unauthenticated Execution**: An adjustment call issued without a valid authenticated user session MUST be rejected immediately with an authentication error, writing no records to the ledger.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST execute product stock updates and audit record insertion together in a single atomic transaction such that both actions succeed together or neither takes effect.
- **FR-002**: System MUST enforce a non-negative floor on all inventory counts, preventing any modification that would result in an on-hand quantity less than zero.
- **FR-003**: System MUST abort stock adjustment transactions with a specific insufficient stock error condition whenever requested deductions exceed available stock.
- **FR-004**: System MUST maintain an append-only audit ledger containing the unique record identifier, product SKU, adjustment classification, quantity delta, prior stock count, post-adjustment stock count, operational reason note, authenticated staff identifier, staff name, and creation timestamp.
- **FR-005**: System MUST strictly deny update and delete operations on the audit ledger across all client queries and standard application operations.
- **FR-006**: System MUST automatically extract and assign the authenticated user's identity from the active security context, preventing client-side spoofing or parameter overrides.
- **FR-007**: System MUST provide optimistic UI updates within 16 milliseconds in the inventory catalog upon adjustment confirmation from interactive dialogs.
- **FR-008**: System MUST automatically revert optimistic UI state to the true previous count and surface a descriptive error toast whenever a transaction fails or is rejected.
- **FR-009**: System MUST support standard adjustment categories including Restock/Inbound, Damaged Goods, Physical Audit Correction, and Return/Exchange.

### Key Entities

- **Product Inventory Balance**: The active on-hand quantity, minimum reorder threshold, and shelf location associated with a unique product SKU in the parts catalog.
- **Stock Adjustment Ledger Entry**: An immutable, append-only historical record documenting a single stock modification event, capturing the SKU, category of adjustment, integer delta, previous balance, new balance, justification note, authenticated operator UUID, operator display name, and timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0% occurrence rate of negative inventory balances across all adjustment operations and concurrent modification attempts.
- **SC-002**: 100% of successful stock adjustments produce a corresponding immutable audit ledger record containing verified operator attribution.
- **SC-003**: 0% of historical audit ledger records can be modified or deleted via client applications or standard database policies.
- **SC-004**: Visual catalog updates render in under 50 milliseconds upon user confirmation of a stock adjustment.
- **SC-005**: 100% of rejected or failed stock adjustments automatically restore the true inventory balance on screen within 1 second of failure detection.
- **SC-006**: 100% of staff attributions in the audit ledger reflect the verified authenticated user session with 0% reliance on unverified client parameters.

## Assumptions

- The parts catalog table (`public.products`) is already provisioned and populated with valid SKU identifiers.
- Users executing stock adjustments are authenticated through the system's authentication service.
- The user interface uses standard client-side state stores capable of optimistic updates and rollback triggers upon action failure.
- Stock adjustments are initiated by authorized store staff and inventory managers possessing valid permissions.
