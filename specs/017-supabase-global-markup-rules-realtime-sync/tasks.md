# Implementation Tasks: SIAA-57

**Feature**: Supabase Global Markup Rules Schema, Realtime Sync & Price Revalidation Engine  
**Ticket**: [SIAA-57](https://the-three-devsketeers.atlassian.net/browse/SIAA-57) (STORY-7.7)  

---

## Phase 1: Database Migration & Schema (Layer 3)

- [ ] **Task 1.1**: Create Supabase migration `supabase/migrations/20261012000002_pricing_rules.sql`
  - Singleton table `public.pricing_rules` (`id = 1`) with numeric check constraints:
    - `retail_markup > 0 AND retail_markup <= 200`
    - `wholesale_markup > 0 AND wholesale_markup <= 200`
    - `aftermarket_markup > 0 AND aftermarket_markup <= 200`
    - `hourly_labor_rate >= 0`
    - `updated_at` TIMESTAMPTZ, `updated_by` UUID
  - Seed row 1 with 35% retail, 18% wholesale, 40% aftermarket, ₱450.00 hourly labor
  - Add to publication `supabase_realtime` and enable `REPLICA IDENTITY FULL`
  - Create immutable table `public.pricing_rules_audit_logs` with anti-tamper trigger
  - Configure RLS policies (SELECT for authenticated, UPDATE for `is_admin()`)

---

## Phase 2: Domain Models & Server Actions (Layer 4)

- [ ] **Task 2.1**: Update TypeScript domain models in `lib/types/pricing.ts`
  - Add `PricingRulesRow` and `PricingRulesAuditLog` types
  - Ensure strict types align with contract schema
- [ ] **Task 2.2**: Refactor Server Actions in `lib/admin/pricing-actions.ts`
  - `getPricingRulesAction`: Query `public.pricing_rules` row 1 with graceful fallback
  - `updatePricingRulesAction`: Validate inputs (0 < markup <= 200, labor >= 0), update `public.pricing_rules` row 1 with `updated_by = auth.uid()`, write audit log to `public.pricing_rules_audit_logs`, trigger `revalidatePath` for `/admin/rates`, `/staff/pos`, and `/admin/inventory`
- [ ] **Task 2.3**: Update and expand tests in `lib/admin/__tests__/pricing-actions.test.ts`
  - Test bounds validation (negative, > 200, zero retail)
  - Test valid update and revalidation path triggers
  - Test pro-rated labor calculation

---

## Phase 3: Realtime Hook & UI Components (Layer 5)

- [ ] **Task 3.1**: Create `lib/hooks/use-pricing-rules-realtime.ts`
  - Supabase Realtime client subscription on channel `public:pricing_rules`
  - Handles `UPDATE` payload and triggers callback
- [ ] **Task 3.2**: Create `components/admin/rates/global-markup-card.tsx`
  - Render Retail Markup (35%), Wholesale Markup (18%), and Aftermarket Markup (40%) fields
  - Live validation and Save button with feedback
  - Use 100% SWIFT semantic design tokens (`bg-bg-surface`, `border-border`, `text-text-primary`, `bg-primary`, `text-text-light`)
- [ ] **Task 3.3**: Integrate `GlobalMarkupCard` into `app/admin/rates/page.tsx`
  - Wire inside `#view-pricing` container
  - Subscribe to realtime updates for seamless multi-terminal synchronization

---

## Phase 4: Verification & Convergence (Layer 6)

- [ ] **Task 4.1**: Execute automated test suite (`npm test`)
- [ ] **Task 4.2**: Execute TypeScript check (`npm run typecheck`) and ESLint (`npm run lint`)
- [ ] **Task 4.3**: Review diff against SWIFT design token compliance and atomic commit standards
