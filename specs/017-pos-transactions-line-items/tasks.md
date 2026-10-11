# Tasks: Supabase POS Transactions & Hybrid Line Items Schema with Immutable Financial Ledger

**Feature Branch**: `feat/SIAA-50-pos-transactions-hybrid-line-items`  
**Jira Issue**: [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50) (STORY-3.7)  

---

## Phase 1: Database Migration & Baseline Seed Data
- [x] **Task 1.1**: Create Supabase migration `supabase/migrations/20261014000000_pos_transactions.sql` with tables `public.transactions` and `public.transaction_items`, check constraints, B-tree indexes, immutability triggers (`trg_prevent_transaction_modifications` and `trg_prevent_transaction_item_modifications`), and append-only RLS policies.
- [x] **Task 1.2**: Update `supabase/seed.sql` with Section 6 inserting baseline historical transactions (`TX-1041`, `TX-1042`, `TX-1043`) with hybrid line items (parts and labor services) using `ON CONFLICT (receipt_number) DO NOTHING`.
- [x] **Task 1.3**: Update `prisma/schema.prisma` with `Transaction` and `TransactionItem` models and run `npx prisma validate`.

## Phase 2: Domain Types & Server Actions
- [x] **Task 2.1**: Update `lib/types/transaction.ts` to export full database entity models (`DbTransaction`, `DbTransactionItem`) and enum types matching PostgreSQL.
- [x] **Task 2.2**: Implement `getTransactionsAction()` and `getTransactionByReceiptAction()` in `lib/pos/transaction-actions.ts` querying Supabase with resilient fallback.
- [x] **Task 2.3**: Write unit and integration tests in `lib/pos/__tests__/transactions-schema.test.ts` covering Zod validation, calculation invariants, and immutability rules.

## Phase 3: Verification, Convergence & Atomic Commits
- [x] **Task 3.1**: Run `npm test -- lib/pos/__tests__/transactions-schema.test.ts` and ensure all tests pass.
- [x] **Task 3.2**: Run `npm run typecheck` (`npx tsc --noEmit`) and `npm run lint`.
- [x] **Task 3.3**: Sync knowledge graph via `graphify . --update`.
- [x] **Task 3.4**: Create atomic commits following `.agents/rules/atomic-commit.md`.
- [ ] **Task 3.5**: Push branch and create Pull Request via `gh pr create`.

