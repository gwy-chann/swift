# Implementation Tasks: Supabase Atomic Checkout RPC with Stock Decrements & Audit Logging

**Feature**: SIAA-51 (STORY-3.8)  
**Spec Directory**: `specs/019-pos-checkout-atomic-rpc/`  
**Feature Branch**: `feat/SIAA-51-atomic-checkout-rpc-stock-decrements`  

---

## Task Decomposition by Architectural Layer

### Unit 1: Specification & Design Artifacts
- [ ] **Task 1.1**: Author canonical 8-artifact SpecKit documentation in `specs/019-pos-checkout-atomic-rpc/` (`spec.md`, `research.md`, `data-model.md`, `contracts/`, `checklists/requirements.md`, `plan.md`, `quickstart.md`, `tasks.md`).
- [ ] **Task 1.2**: Commit Unit 1 specification artifacts following atomic commit guidelines (`docs(specs): [SIAA-51] ...`).

### Unit 2: Tooling & Types Definitions
- [ ] **Task 2.1**: Update TypeScript domain models in `lib/types/transaction.ts` with `CheckoutPayload`, `CheckoutItemInput`, `CheckoutActionResult`.
- [ ] **Task 2.2**: Export Zod schemas in `lib/pos/contracts.ts` (or contract file) for checkout payload validation.
- [ ] **Task 2.3**: Commit Unit 2 types & contracts (`feat(pos): [SIAA-51] define checkout payload types and zod contracts`).

### Unit 3: Database Schemas & Migrations
- [ ] **Task 3.1**: Create PostgreSQL migration `supabase/migrations/20261014010000_process_pos_checkout_rpc.sql` defining `public.process_pos_checkout(p_transaction, p_items)`.
- [ ] **Task 3.2**: Enforce pessimistic row locking (`FOR UPDATE`), deterministic ordering, out-of-stock check with `INSUFFICIENT_STOCK: <sku>`, non-repudiation with `auth.uid()`, and dual ledger insertion into `transactions`, `transaction_items`, and `stock_adjustment_logs`.
- [ ] **Task 3.3**: Commit Unit 3 database migration (`feat(db): [SIAA-51] add atomic process_pos_checkout stored procedure`).

### Unit 4: Domain Models, Business Logic & Tests
- [ ] **Task 4.1**: Implement `processCheckoutAction(payload)` in `lib/pos/actions.ts` with Zod validation, RPC invocation, structured error handling, and mock fallback.
- [ ] **Task 4.2**: Implement unit and integration tests in `lib/pos/__tests__/atomic-checkout-rpc.test.ts` covering success, insufficient stock rollback, service exemption, and validation.
- [ ] **Task 4.3**: Run `npm test` and `npx tsc --noEmit` to verify all test scenarios pass.
- [ ] **Task 4.4**: Commit Unit 4 business logic & tests (`feat(pos): [SIAA-51] implement processCheckoutAction server action with tests`).

### Unit 5: UI Components & Route Views
- [ ] **Task 5.1**: Update Staff POS terminal (`app/staff/pos/page.tsx`) to invoke `processCheckoutAction` on sale completion and render high-contrast toast for `INSUFFICIENT_STOCK`.
- [ ] **Task 5.2**: Update Admin POS terminal (`app/admin/pos/page.tsx`) to invoke `processCheckoutAction` with error toast.
- [ ] **Task 5.3**: Verify strict adherence to SWIFT design token classes (zero hardcoded hex colors).
- [ ] **Task 5.4**: Commit Unit 5 UI wiring (`feat(pos): [SIAA-51] wire processCheckoutAction to staff and admin pos terminals with error toasts`).

### Unit 6: Tasks Completion & Knowledge Graph Sync
- [ ] **Task 6.1**: Update `tasks.md` marking all tasks completed.
- [ ] **Task 6.2**: Trigger `graphify . --update` to sync the AST knowledge graph.
- [ ] **Task 6.3**: Commit Unit 6 completion (`docs(specs): [SIAA-51] mark all implementation tasks complete`).
