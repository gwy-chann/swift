# Specification Quality Checklist: Supabase Workshop Labor Services Admin CRUD Actions & POS Realtime Synchronization

**Purpose**: Validate specification completeness, RLS security, SWIFT design token conformity, and realtime fidelity before implementation  
**Created**: 2026-10-11  
**Feature**: [spec.md](../spec.md)  
**Jira Issue**: [SIAA-59](https://the-three-devsketeers.atlassian.net/browse/SIAA-59)

---

## 1. Security & RLS Compliance

- [x] RLS policies prevent unauthenticated and non-admin mutations (`INSERT`, `UPDATE`, `DELETE`) on `public.labor_services`.
- [x] Admin users and `service_role` can successfully perform CRUD actions.
- [x] Dedicated audit table `public.service_rate_audit_logs` is append-only with anti-tamper triggers.
- [x] User attribution is attached to all rate adjustments (`userName`).

## 2. Realtime Synchronization & Event Broadcast

- [x] `public.labor_services` is added to `supabase_realtime` publication.
- [x] `REPLICA IDENTITY FULL` is configured on `public.labor_services` for complete old/new row context.
- [x] POS terminal (`/staff/pos`) subscribes to `supabase.channel('public:labor_services')` (or via `useLaborServicesRealtime`).
- [x] Realtime update updates POS service cards in <500ms without page reload.
- [x] New services (`INSERT`) and toggled/archived services (`UPDATE active = false`) are accurately synchronized in POS.

## 3. Server Actions & Next.js Revalidation

- [x] Action file located at `lib/admin/service-actions.ts`.
- [x] `createLaborServiceAction`, `updateLaborServiceAction`, `toggleServiceStatusAction`, and `deleteLaborServiceAction` exported.
- [x] Both `revalidatePath('/admin/rates')` and `revalidatePath('/staff/pos')` executed on mutation.
- [x] Fallback to Prisma ORM / mock store provided for resilient offline test execution.

## 4. SWIFT Design Tokens & Accessibility

- [x] Zero hardcoded hex, RGB, or arbitrary Tailwind colors.
- [x] All surfaces use `bg-bg-surface`, `bg-bg-card`, `bg-bg-muted`, etc.
- [x] All typography uses semantic classes: `text-text-primary`, `text-text-secondary`, `text-primary`, etc.
- [x] Form inputs, modals, and buttons include descriptive ARIA labels and focus states.
- [x] Works seamlessly across Light and Dark themes.

## 5. Verification & Testing

- [x] Unit tests cover schema validation, CRUD actions, and rate update calculations.
- [x] Tests verify realtime payload handling for insert, update, and soft-delete events.
- [x] `npm run typecheck`, `npm run lint`, and `npm test` passing.
