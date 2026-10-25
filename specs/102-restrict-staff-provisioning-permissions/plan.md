# Implementation Plan: Restrict Staff Provisioning Permissions

**Feature**: `102-restrict-staff-provisioning-permissions`  
**Ticket**: [SIAA-102](https://the-three-devsketeers.atlassian.net/browse/SIAA-102)  
**Status**: Ready for Tasks  

---

## 1. Architecture & Component Hierarchy

```
app/admin/users/page.tsx
  └── UserLedgerClient (or page component)
        └── AddStaffModal (components/admin/users/add-staff-modal.tsx)
              ├── Dropdown: ["Cashier Privilege", "Mechanic", "Inventory Clerk"]
              └── (No permission checkboxes)
                    │
                    ▼ invokes Server Action
              lib/admin/user-actions.ts: provisionStaffUserAction
                    ├── 1. Validates role in ['cashier', 'mechanic', 'inventory_clerk']
                    ├── 2. If unapproved: logs security audit warning & rejects with 400
                    ├── 3. Applies DEFAULT_ROLE_PERMISSIONS[role]
                    └── 4. Creates profile & logs USER_PROVISIONED event
```

---

## 2. Technical Modifications

### A. Contracts (`specs/102-restrict-staff-provisioning-permissions/contracts/staff-provisioning.contract.ts`)
- Define `ApprovedStaffRoleSchema = z.enum(['cashier', 'mechanic', 'inventory_clerk'])`.
- Define `APPROVED_ROLE_OPTIONS` with labels: `Cashier Privilege`, `Mechanic`, `Inventory Clerk`.
- Export typed contracts and default role permissions.

### B. UI Component (`components/admin/users/add-staff-modal.tsx`)
- Update `ROLE_OPTIONS` to use `APPROVED_ROLE_OPTIONS`.
- Default selected role to `cashier` (or `inventory_clerk`).
- Remove the "Granular Permission Flags" section with the 4 checkboxes completely.
- When submitting, pass `{ fullName, email, role }` without manual permission overrides so the server applies canonical defaults.
- Retain strict token compliance (`bg-bg-card`, `border-border`, `text-text-primary`, `bg-primary`, etc.).

### C. Server Actions (`lib/admin/user-actions.ts`)
- In `provisionStaffUserAction`:
  - Check whether `payload.role` is one of `['cashier', 'mechanic', 'inventory_clerk']`.
  - If NOT an approved role (e.g. `'admin'`, `'staff'`, or invalid string):
    - Call `logSecurityEventAction` with action: `Rejected unauthorized staff provisioning attempt with unapproved role: ${payload.role}`, severity: `warning`.
    - Return `{ success: false, error: 'Staff account role must be one of: Cashier Privilege, Mechanic, or Inventory Clerk.', code: 'VALIDATION_ERROR' }`.
  - When approved, assign `DEFAULT_ROLE_PERMISSIONS[payload.role]`.

### D. Spring Boot Backend (`swift-backend`)
- In `UserAdminServiceImpl.java`:
  - Define `ALLOWED_PROVISION_ROLES = Set.of("cashier", "mechanic", "inventory_clerk")`.
  - In `provisionStaffUser`, check `ALLOWED_PROVISION_ROLES.contains(rawRole)`.
  - If invalid, log security warning and throw `InvalidRoleException` (`HTTP 400 Bad Request`).

### E. Test Suites
- Unit tests verifying:
  - Valid provisioning of `cashier`, `mechanic`, `inventory_clerk`.
  - Rejection of `admin`, `staff`, and invalid roles with security audit log entry.
  - Verification that AddStaffModal renders strictly the 3 options and 0 permission checkboxes.

---

## 3. Atomic Commits Decomposition

Following `.agents/rules/atomic-commit.md`:
1. `docs(specs): [SIAA-102] specification, planning, and contracts for restricted staff provisioning`
2. `feat(auth): [SIAA-102] enforce approved staff roles validation and security audit in server actions`
3. `feat(admin): [SIAA-102] restrict add staff modal role options and remove permission checkboxes`
4. `test(admin): [SIAA-102] add test coverage for restricted staff provisioning and invalid role rejection`
5. `docs(specs): [SIAA-102] complete verification and mark tasks done`
