# Architecture & Implementation Plan: SIAA-57

**Feature**: Supabase Global Markup Rules Schema, Realtime Sync & Price Revalidation Engine  
**Ticket**: [SIAA-57](https://the-three-devsketeers.atlassian.net/browse/SIAA-57) (STORY-7.7)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  

---

## 1. Architectural Overview & Boundaries

```
[ Supabase PostgreSQL ]
  ├── public.pricing_rules (Singleton id=1, constraints: 0 < markup <= 200, hourly >= 0)
  ├── public.pricing_rules_audit_logs (Immutable audit ledger with anti-tamper trigger)
  └── supabase_realtime publication (REPLICA IDENTITY FULL for instant broadcasts)
          │
          ▼
[ Next.js Server Actions: lib/admin/pricing-actions.ts ]
  ├── getPricingRulesAction() (Loads from public.pricing_rules with memory fallback)
  └── updatePricingRulesAction(updates)
          ├── Validates bounds (0 < markup <= 200, labor >= 0)
          ├── Updates public.pricing_rules row 1 with updated_by = auth.uid()
          ├── Inserts audit log row into public.pricing_rules_audit_logs
          └── revalidatePath: /admin/rates, /staff/pos, /admin/inventory
          │
          ▼
[ UI Components & Realtime Hooks ]
  ├── components/admin/rates/global-markup-card.tsx (Global Parts Markup Rules form)
  ├── app/admin/rates/page.tsx (Integrated into #view-pricing)
  └── lib/hooks/use-pricing-rules-realtime.ts (Multi-terminal Realtime subscription)
```

---

## 2. File Modification & Creation Inventory

| File | Nature | Description |
| :--- | :--- | :--- |
| `supabase/migrations/20261012000002_pricing_rules.sql` | **New** | Migration creating `public.pricing_rules`, constraints, seed, publication, audit ledger, and RLS |
| `lib/types/pricing.ts` | **Update** | Add audit log types and complete rule schemas |
| `lib/admin/pricing-actions.ts` | **Update** | Connect to `public.pricing_rules`, insert audit record, and call revalidation for `/admin/rates`, `/staff/pos`, `/admin/inventory` |
| `lib/admin/__tests__/pricing-actions.test.ts` | **Update** | Comprehensive unit & contract tests for markup validation, mutation, and revalidation |
| `lib/hooks/use-pricing-rules-realtime.ts` | **New** | Supabase Realtime channel subscription for `public:pricing_rules` |
| `components/admin/rates/global-markup-card.tsx` | **New** | Global Parts Markup Rules form component using SWIFT design tokens |
| `app/admin/rates/page.tsx` | **Update** | Mount `GlobalMarkupCard` in `#view-pricing` container |

---

## 3. Test & Verification Plan

1. **Schema & Migration Verification**:
   - Ensure SQL syntax complies with Supabase Postgres.
   - Singleton check constraint `CHECK (id = 1)`.
   - Positive markup constraints `> 0 AND <= 200`.
   - RLS policies ensure authenticated SELECT and admin UPDATE.
2. **Server Actions Testing**:
   - Validation test: negative markup, > 200 markup, negative hourly rate rejected.
   - Successful update updates data and calls `revalidatePath` for all 3 paths.
   - Audit trail recorded.
3. **Component & Token Verification**:
   - `GlobalMarkupCard` renders with SWIFT design tokens (`bg-bg-surface`, `border-border`, etc.).
   - No hardcoded hex or rgb classes.
