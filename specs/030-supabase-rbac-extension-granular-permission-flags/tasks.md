# Tasks: Supabase RBAC Extension, Granular Permission Flags Schema & Admin Provisioning Actions

**Feature**: `030-supabase-rbac-extension-granular-permission-flags`  
**Jira Ticket**: [SIAA-56](https://the-three-devsketeers.atlassian.net/browse/SIAA-56)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  
**Branch**: `feat/SIAA-56-supabase-rbac-extension-granular-permission-flags`  

---

## Phase 1: Database Migrations & Schema Synchronization

- [x] **TASK-1.1**: Author SQL migration `supabase/migrations/20261019000000_rbac_permissions.sql`:
  - Alter enum `public.user_role` to include `inventory_clerk`.
  - Alter `public.profiles` to add `permissions` JSONB NOT NULL with default flags.
  - Create trigger `enforce_admin_self_protection()` to block admin self-demotion and self-deactivation.
  - Update `public.handle_new_user()` to persist granular permissions and support `inventory_clerk`.
- [x] **TASK-1.2**: Update `prisma/schema.prisma`:
  - Add `inventory_clerk` to `enum UserRole`.
  - Add `permissions Json` with default to `model Profile`.
  - Validate with `npx prisma validate`.

---

## Phase 2: Domain Models, Contracts & Server Actions Core

- [x] **TASK-2.1**: Update `lib/types/auth.ts` and `lib/mock-data/users.ts`:
  - Extend `DbUserRole` to include `'inventory_clerk'`.
  - Define `StaffPermissions` interface and defaults (`DEFAULT_STAFF_PERMISSIONS`, `DEFAULT_ROLE_PERMISSIONS`).
  - Extend `UserProfileRecord` to include `permissions: StaffPermissions`.
  - Update `MOCK_USERS` in `lib/mock-data/users.ts` to assign structured permissions.
- [x] **TASK-2.2**: Implement Server Actions in `lib/admin/user-actions.ts`:
  - `listStaffUsersAction()`: Returns all staff accounts with roles and permissions.
  - `provisionStaffUserAction(payload)`: Provisions new user in Supabase auth and profiles with service-role permissions and fallback mock.
  - `updateUserPermissionsAction(userId, permissions)`: Updates permissions with admin session verification.
  - `toggleUserStatusAction(userId, status)`: Toggles active status with self-lockout check.
- [x] **TASK-2.3**: Author comprehensive test suite in `lib/admin/__tests__/user-actions.test.ts`:
  - Test role enumeration including `inventory_clerk`.
  - Test default and customized permission assignments.
  - Test admin provisioning flow and mock fallback.
  - Test self-lockout prevention (admin cannot demote or deactivate self).
  - Test non-admin authorization rejection (403 Forbidden).

---

## Phase 3: UI Components & Route Views

- [x] **TASK-3.1**: Create `components/admin/users/user-ledger-table.tsx`:
  - Interactive table displaying staff name, email, avatar badge, role badge, status toggle, and permission chips.
  - Search by name/email and role filter dropdown.
  - Styled strictly with SWIFT semantic design tokens (`bg-bg-card`, `border-border`, `text-text-primary`).
- [x] **TASK-3.2**: Create `components/admin/users/add-staff-modal.tsx`:
  - Accessible modal dialog for provisioning employees.
  - Input validation for name, email, role, and permission checkboxes.
  - Optimistic UI append and toast feedback.
- [x] **TASK-3.3**: Refactor `app/admin/users/page.tsx`:
  - Wire Server Component data loading via `listStaffUsersAction()`.
  - Embed `UserLedgerTable` and `AddStaffModal`.

---

## Phase 4: Convergence, Quality & Verification

- [x] **TASK-4.1**: Execute automated test suite (`npm test`) and typecheck (`npx tsc --noEmit`).
- [x] **TASK-4.2**: Verify zero hardcoded colors compliance across all modified and newly created UI files.
- [x] **TASK-4.3**: Commit changes following `.agents/rules/atomic-commit.md` with ticket key `[SIAA-56]`.
- [x] **TASK-4.4**: Push branch to origin and generate review-ready Pull Request.
