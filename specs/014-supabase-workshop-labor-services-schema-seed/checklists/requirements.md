# Requirements Quality Checklist: Supabase Workshop Labor Services

**Feature Branch**: `feat/SIAA-49-supabase-labor-services-schema-rates`  
**Jira Issue**: [SIAA-49](https://the-three-devsketeers.atlassian.net/browse/SIAA-49)  

---

## 1. Specification Completeness
- [x] Clear User Stories written in Mike Cohn format with rationale and priority.
- [x] Gherkin acceptance criteria covering Schema Migration, 6 Seed Data Services, RLS policies, Prisma sync, and POS hydration.
- [x] Clear mapping to upstream Epic [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) and downstream blockers ([SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18), [SIAA-40](https://the-three-devsketeers.atlassian.net/browse/SIAA-40), [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50)).

## 2. Architectural & Technical Integrity
- [x] Migration SQL file follows timestamped format: `20261011000000_pos_labor_services.sql`.
- [x] Check constraints ensure non-negative numeric rates (`rate >= 0`).
- [x] Automatic `updated_at` trigger is attached to `public.labor_services`.
- [x] B-tree indexes defined for `code` and `active`.
- [x] RLS policies allow public `SELECT` and restrict mutations to `public.is_admin()`.
- [x] Prisma schema model `LaborService` aligns 1:1 with `public.labor_services` and passes `npx prisma validate`.
- [x] Server action `getLaborServicesAction()` in `lib/pos/actions.ts` provides resilient fallback to `MOCK_SERVICES`.

## 3. SWIFT Design Tokens & Accessibility
- [x] POS Services tab UI components use exclusively semantic Tailwind tokens (`bg-bg-card`, `border-border`, `text-primary`, `bg-primary`, etc.). Zero hardcoded hex/rgb.
- [x] Service cards include accessible labels, ARIA landmarks, and keyboard navigable action buttons.
- [x] Flat-rate price tags clearly indicate standard workshop rate in Philippine Peso (₱).
