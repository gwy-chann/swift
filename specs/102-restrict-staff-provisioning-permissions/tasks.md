# Implementation Tasks: Restrict Staff Provisioning Permissions Strictly to Cashier, Mechanic, and Inventory Clerk

**Feature**: `specs/102-restrict-staff-provisioning-permissions/spec.md`  
**Date**: 2026-10-26  
**Jira Ticket**: [SIAA-102](https://the-three-devsketeers.atlassian.net/browse/SIAA-102)  

---

## Phase 1: Contracts & Validation Schemas

- [x] **TASK-1.1**: Define `ApprovedStaffRoleSchema` and `APPROVED_ROLE_OPTIONS` in `specs/102-restrict-staff-provisioning-permissions/contracts/staff-provisioning.contract.ts`.
- [x] **TASK-1.2**: Define `DEFAULT_PROVISION_ROLE_PERMISSIONS` mapping for `cashier`, `mechanic`, and `inventory_clerk`.

---

## Phase 2: Server Action & Backend Validation Gate

- [x] **TASK-2.1**: Update `lib/admin/user-actions.ts` in `provisionStaffUserAction` to validate that `role` strictly belongs to `['cashier', 'mechanic', 'inventory_clerk']`.
- [x] **TASK-2.2**: In `provisionStaffUserAction`, if an unapproved role is received, call `logSecurityEventAction` with severity `'warning'` and return `{ success: false, error: '...', code: 'VALIDATION_ERROR' }`.
- [x] **TASK-2.3**: Update `swift-backend/src/main/java/com/swift/modules/admin/service/impl/UserAdminServiceImpl.java` to enforce `ALLOWED_PROVISION_ROLES = Set.of("cashier", "mechanic", "inventory_clerk")` and reject invalid roles with 400 Bad Request and security audit logging.

---

## Phase 3: Add Staff Modal UI Component Refactoring

- [x] **TASK-3.1**: Update `components/admin/users/add-staff-modal.tsx` to restrict `ROLE_OPTIONS` strictly to `Cashier Privilege` (`cashier`), `Mechanic` (`mechanic`), and `Inventory Clerk` (`inventory_clerk`).
- [x] **TASK-3.2**: Remove all permission toggle checkboxes ("Granular Permissions" section) from `components/admin/users/add-staff-modal.tsx`.
- [x] **TASK-3.3**: Ensure `add-staff-modal.tsx` automatically submits the role and lets default permission flags be assigned deterministically.
- [x] **TASK-3.4**: Ensure `add-staff-modal.tsx` adheres strictly to SWIFT design tokens (`bg-bg-card`, `border-border`, `text-text-primary`, `bg-primary`, `rounded-xl`, etc.) with zero hardcoded colors.

---

## Phase 4: Automated Unit & Integration Tests

- [x] **TASK-4.1**: Create `lib/admin/__tests__/restricted-staff-provisioning.test.ts` testing:
  - Successful provisioning of `cashier` with default cashier permissions.
  - Successful provisioning of `mechanic` with default mechanic permissions.
  - Successful provisioning of `inventory_clerk` with default inventory clerk permissions.
  - Rejection of unapproved roles (`admin`, `staff`, arbitrary strings) with validation error.
  - Verification that an unauthorized provisioning attempt generates a security audit entry.
- [x] **TASK-4.2**: Update existing `lib/admin/__tests__/user-actions.test.ts` and `UserAdminControllerTests.java` with test coverage for unapproved role rejection.

---

## Phase 5: Verification, Convergence & Atomic Commits

- [x] **TASK-5.1**: Run `npm run typecheck` (`tsc --noEmit`) to verify zero TypeScript errors.
- [x] **TASK-5.2**: Run `npm test` to verify all test suites pass (711/711 tests passing).
- [x] **TASK-5.3**: Run `npm run lint` to verify code style and quality (0 errors, 0 warnings).
- [x] **TASK-5.4**: Synchronize Graphify knowledge graph (`graphify . --update` - verified graph state).
- [x] **TASK-5.5**: Stage and create atomic git commits following `.agents/rules/atomic-commit.md`.
- [x] **TASK-5.6**: Push branch and create Pull Request via `gh pr create` following `create-pr` skill.
