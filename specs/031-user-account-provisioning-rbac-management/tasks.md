# Implementation Tasks: User Account Provisioning & RBAC Management

**Feature**: SIAA-38 (STORY-7.1)  
**Spec Directory**: `specs/031-user-account-provisioning-rbac-management/`

---

## Task Overview & Phased Roadmap

- [x] **Phase 1: Contracts & Domain Models**
  - [x] Task 1.1: Define `UpdateStaffUserSchema`, `UpdateStaffUserPayload`, and DTO types in `contracts/user-management.contract.ts`

- [x] **Phase 2: Backend Logic & Server Actions**
  - [x] Task 2.1: Implement `updateStaffUserAction` in `lib/admin/user-actions.ts` with self-demotion prevention guard
  - [x] Task 2.2: Integrate security audit logging via `logSecurityEventAction` into user provisioning, editing, and status toggling

- [x] **Phase 3: Automated Unit Testing**
  - [x] Task 3.1: Add unit tests in `lib/admin/__tests__/user-actions.test.ts` for `updateStaffUserAction` (successful update, invalid payload, unauthorized caller, self-demotion rejection)
  - [x] Task 3.2: Verify duplicate email rejection and self-lockout deactivation guards in test suite

- [x] **Phase 4: UI Components & Admin Route Views**
  - [x] Task 4.1: Implement `components/admin/users/edit-staff-modal.tsx` with role selection, granular permission toggles, and SWIFT design tokens
  - [x] Task 4.2: Update `components/admin/users/user-ledger-table.tsx` to add `id="usersTableBody"`, "+ Add Staff User" trigger (`id="btnAddStaffUser"`), and "Edit" action buttons per row
  - [x] Task 4.3: Ensure `app/admin/users/page.tsx` renders container with `id="view-users"` and integrates with the updated table

- [x] **Phase 5: Verification & Quality Gates**
  - [x] Task 5.1: Execute `npm test lib/admin/__tests__/user-actions.test.ts`
  - [x] Task 5.2: Run TypeScript typecheck `npm run typecheck`
  - [x] Task 5.3: Run lint check `npm run lint`
