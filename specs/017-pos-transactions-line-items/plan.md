# Implementation Plan: Supabase POS Transactions & Hybrid Line Items Schema with Immutable Financial Ledger

**Feature Branch**: `feat/SIAA-50-pos-transactions-hybrid-line-items`  
**Jira Issue**: [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50) (STORY-3.7)  

---

## 1. Architectural Boundaries & Files

```
├── supabase/
│   ├── migrations/
│   │   └── 20261014000000_pos_transactions.sql       # [NEW] Transactions & line items tables, indexes, triggers, RLS
│   └── seed.sql                                      # [MODIFIED] Seed baseline transactions with hybrid line items
├── prisma/
│   └── schema.prisma                                 # [MODIFIED] Add Transaction and TransactionItem models
├── lib/
│   ├── types/
│   │   └── transaction.ts                            # [MODIFIED] Enrich interfaces with DB schema mappings
│   ├── pos/
│   │   ├── transaction-actions.ts                    # [NEW] Server actions for historical transactions query
│   │   └── __tests__/
│   │       └── transactions-schema.test.ts           # [NEW] TDD tests for schema contracts, invariants & immutability
└── specs/017-pos-transactions-line-items/
    ├── spec.md
    ├── research.md
    ├── data-model.md
    ├── contracts/transaction-contracts.ts
    ├── checklists/requirements.md
    ├── plan.md
    ├── quickstart.md
    └── tasks.md
```

---

## 2. Step-by-Step Execution Plan

### Step 1: Database Migration (`feat(db): [SIAA-50] ...`)
- Create `supabase/migrations/20261014000000_pos_transactions.sql`:
  - Table `public.transactions` with receipt number, cashier snapshot, financial totals, tender amounts, and payment method.
  - Table `public.transaction_items` with item type ('part' | 'service'), SKU/code, unit price, quantity, bay, and shelf location.
  - B-tree indexes for receipt number, cashier, created_at, pricing mode, payment method, transaction_id, item_type, and SKU/code.
  - Immutability trigger function `prevent_transaction_immutability()` attached to both tables BEFORE UPDATE OR DELETE to reject mutations.
  - Row-Level Security:
    - Grant SELECT to authenticated and anon.
    - Grant INSERT to authenticated (cashier role) and anon demo.
    - Explicitly deny / omit UPDATE and DELETE policies.

### Step 2: Seed Baseline Data (`feat(db): [SIAA-50] ...`)
- Update `supabase/seed.sql`:
  - Insert baseline transactions (`TX-1041`, `TX-1042`, `TX-1043`) representing retail and wholesale purchases.
  - Insert itemized hybrid line items covering both motorcycle parts (`YAM-NMAX-BL01`, `MOT-3100-10W40`) and labor services (`SRV-OIL-01`, `SRV-CVT-01`).
  - Use idempotent `ON CONFLICT (receipt_number) DO NOTHING`.

### Step 3: Prisma ORM Synchronization (`feat(db): [SIAA-50] ...`)
- Update `prisma/schema.prisma` with `Transaction` and `TransactionItem` models matching `public.transactions` and `public.transaction_items`.
- Run `npx prisma validate` to confirm schema integrity.

### Step 4: Domain Models & Zod Contracts (`feat(pos): [SIAA-50] ...`)
- Update `lib/types/transaction.ts` with database entity types and helper types.
- Ensure contracts in `specs/017-pos-transactions-line-items/contracts/transaction-contracts.ts` validate payloads.

### Step 5: Historical Receipt Server Action (`feat(pos): [SIAA-50] ...`)
- Create `lib/pos/transaction-actions.ts`:
  - `getTransactionsAction()`: Fetches recent transactions with itemized lines from Supabase with fallback.
  - `getTransactionByReceiptAction(receiptNumber)`: Fetches a single transaction by receipt number.

### Step 6: Test-Driven Verification (TDD) (`test(pos): [SIAA-50] ...`)
- Create `lib/pos/__tests__/transactions-schema.test.ts`:
  - Test Zod validation for valid transactions and reject invalid items (negative prices, zero quantity, insufficient cash tendered).
  - Verify calculation invariants (`subtotal = unit_price * quantity`, `change_due = cash_tendered - total_due`).
  - Test server actions and query results.

### Step 7: Convergence & Atomic Commits
- Run `npm run typecheck`, `npm run lint`, and `npm test` inside the worktree.
- Run `graphify . --update`.
- Commit atomically following `.agents/rules/atomic-commit.md`.
