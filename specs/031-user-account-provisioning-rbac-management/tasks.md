# Implementation Tasks: User Account Provisioning & RBAC Management

**Feature**: SIAA-38 (STORY-7.1)  
**Spec Directory**: `specs/031-user-account-provisioning-rbac-management/`

---

## Task Overview & Phased Roadmap

- [ ] **Phase 1: Contracts & Domain Models**
  - [ ] Task 1.1: Define `UpdateStaffUserSchema`, `UpdateStaffUserPayload`, and DTO types in `contracts/user-management.contract.ts`

- [ ] **Phase 2: Backend Logic & Server Actions**
  - [ ] Task 2.1: Implement `updateStaffUserAction` in `lib/admin/user-actions.ts` with self-demotion prevention guard
  - [ ] Task 2.2: Integrate security audit logging via `logSecurityEventAction` into user provisioning, editing, and status toggling

- [ ] **Phase 3: Automated Unit Testing**
  - [ ] Task 3.1: Add unit tests in `lib/admin/__tests__/user-actions.test.ts` for `updateStaffUserAction` (successful update, invalid payload, unauthorized caller, self-demotion rejection)
  - [ ] Task 3.2: Verify duplicate email rejection and self-lockout deactivation guards in test suite

- [ ] **Phase 4: UI Components & Admin Route Views**
  - [ ] Task 4.1: Implement `components/admin/users/edit-staff-modal.tsx` with role selection, granular permission toggles, and SWIFT design tokens
  - [ ] Task 4.2: Update `components/admin/users/user-ledger-table.tsx` to add `id="usersTableBody"`, "+ Add Staff User" trigger (`id="btnAddStaffUser"`), and "Edit" action buttons per row
  - [ ] Task 4.3: Ensure `app/admin/users/page.tsx` renders container with `id="view-users"` and integrates with the updated table

- [ ] **Phase 5: Verification & Quality Gates**
  - [ ] Task 5.1: Execute `npm test lib/admin/__tests__/user-actions.test.ts`
  - [ ] Task 5.2: Run TypeScript typecheck `npm run typecheck`
  - [ ] Task 5.3: Run lint check `npm run lint`
