# Specification Quality Checklist: SIAA-57 Global Markup Rules Schema & Realtime Engine

**Feature**: Supabase Global Markup Rules Schema, Realtime Sync & Price Revalidation Engine  
**Ticket**: [SIAA-57](https://the-three-devsketeers.atlassian.net/browse/SIAA-57) (STORY-7.7)  
**Created**: 2026-10-11  
**Spec Link**: [spec.md](../spec.md)

---

## 1. Content Quality & Clarity

- [x] **No implementation leakage in user stories**: Written strictly from Store Owner and Cashier perspective.
- [x] **Clear business value**: Centrally managed margins and instant billing synchronization across terminals.
- [x] **Written for non-technical stakeholders**: Clear operational goals and acceptance criteria.
- [x] **All mandatory sections completed**: Executive summary, user scenarios, functional/non-functional requirements.

---

## 2. Requirement Completeness & Testability

- [x] **Zero [NEEDS CLARIFICATION] markers**: All field constraints, defaults, and permissions are unambiguously defined.
- [x] **Testable acceptance criteria**:
  - Migration file `20261012000002_pricing_rules.sql` verified with PostgreSQL constraints.
  - Realtime publication verified with `pg_publication_tables`.
  - RLS policies verified for authenticated SELECT and admin-only UPDATE.
  - Next.js `revalidatePath` tested for all 3 routes (`/admin/rates`, `/staff/pos`, `/admin/inventory`).
  - Audit logging verified with anti-tamper trigger.
- [x] **Edge cases addressed**:
  - Out-of-bounds markup values (< 0 or > 200).
  - Negative hourly labor rates.
  - Non-admin user mutation attempt rejected by RLS.
  - Offline/fallback resilience to in-memory defaults when Supabase is unreachable.

---

## 3. SWIFT System Standards Compliance

- [x] **Mandatory SWIFT Design Tokens**: Component `GlobalMarkupCard` uses semantic tokens (`bg-bg-surface`, `border-border`, `text-text-primary`, `bg-primary`, etc.) with zero hardcoded hex/rgb.
- [x] **Tailwind CSS v4 Compliance**: Canonical syntax, native fraction classes, no legacy utilities.
- [x] **Atomic Commit Traceability**: Changes segmented by architectural layers referencing `[SIAA-57]`.
