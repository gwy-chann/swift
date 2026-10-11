# Technical Research & Architecture Decisions: SIAA-57

**Feature**: Supabase Global Markup Rules Schema, Realtime Sync & Price Revalidation Engine  
**Ticket**: [SIAA-57](https://the-three-devsketeers.atlassian.net/browse/SIAA-57) (STORY-7.7)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  

---

## 1. Architectural Patterns & Decisions

### Pattern 1: Database Singleton Pattern (`CHECK (id = 1)`)
- **Problem**: Global store pricing parameters (Retail Markup, Wholesale Markup, Aftermarket Markup, Hourly Benchmark Rate) represent a single store-wide configuration entity. Multiple rows would introduce ambiguity and race conditions.
- **Decision**: Define table `public.pricing_rules` with an integer primary key constrained to `CHECK (id = 1)`:
  ```sql
  CREATE TABLE public.pricing_rules (
      id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      retail_markup NUMERIC NOT NULL CHECK (retail_markup > 0 AND retail_markup <= 200),
      wholesale_markup NUMERIC NOT NULL CHECK (wholesale_markup > 0 AND wholesale_markup <= 200),
      aftermarket_markup NUMERIC NOT NULL CHECK (aftermarket_markup > 0 AND aftermarket_markup <= 200),
      hourly_labor_rate NUMERIC NOT NULL CHECK (hourly_labor_rate >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
  );
  ```
- **Trade-off / Advantage**: Extremely simple, eliminates table bloat, guarantees atomic single-row updates, and PostgREST `.single()` queries always return the one valid configuration object.

---

### Pattern 2: Supabase Realtime Broadcast & Full Replica Identity
- **Problem**: Cashier POS terminals (`/staff/pos`) and inventory valuation views (`/admin/inventory`) need instantaneous notification when pricing markups change without polling or hard page reloads.
- **Decision**:
  1. Add `public.pricing_rules` to publication `supabase_realtime`:
     ```sql
     DO $$
     BEGIN
         IF NOT EXISTS (
             SELECT 1 FROM pg_publication_tables 
             WHERE pubname = 'supabase_realtime' AND tablename = 'pricing_rules'
         ) THEN
             ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_rules;
         END IF;
     END$$;
     ```
  2. Set `ALTER TABLE public.pricing_rules REPLICA IDENTITY FULL;` so all column values (old and new) are transmitted in the Realtime payload.
  3. Client hook `usePricingRulesRealtime` listens on channel `supabase.channel('public:pricing_rules')` on `postgres_changes` event `UPDATE` on schema `public`, table `pricing_rules`.

---

### Pattern 3: Immutable Security Audit Ledger
- **Problem**: Changes to global margins and benchmark rates have direct financial and tax ramifications. Any price manipulation must be auditable and tamper-proof.
- **Decision**: Create table `public.pricing_rules_audit_logs`:
  - Columns: `id UUID`, `changed_by UUID REFERENCES auth.users(id)`, `user_name TEXT`, `old_retail_markup`, `new_retail_markup`, `old_wholesale_markup`, `new_wholesale_markup`, `old_aftermarket_markup`, `new_aftermarket_markup`, `old_hourly_labor_rate`, `new_hourly_labor_rate`, `created_at TIMESTAMPTZ`.
  - Anti-tamper trigger: `BEFORE UPDATE OR DELETE` raises an exception preventing alteration or deletion.

---

### Pattern 4: Cache Revalidation in Next.js Server Actions
- **Problem**: Next.js App Router aggressively caches server components and fetched routes.
- **Decision**: When `updatePricingRulesAction` successfully updates the singleton row, invoke:
  ```ts
  revalidatePath('/admin/rates');
  revalidatePath('/staff/pos');
  revalidatePath('/admin/inventory');
  ```
  Wrap revalidation in a safe handler so testing environments without Next.js cache context don't throw.

---

### Pattern 5: Seamless UI Integration with SWIFT Design Tokens
- **Problem**: Need to present markup percentages and labor rates cleanly matching the visual styling of `/admin/rates` without hardcoded colors.
- **Decision**: Create `GlobalMarkupCard` in `components/admin/rates/global-markup-card.tsx` with:
  - Percentage inputs for Retail (35%), Wholesale (18%), and Aftermarket (40%)
  - Token-compliant Tailwind v4 styling: `bg-bg-surface`, `border-border`, `text-text-primary`, `bg-bg-input`, `bg-primary`, `text-text-light`
  - Inline error feedback and loading states.
