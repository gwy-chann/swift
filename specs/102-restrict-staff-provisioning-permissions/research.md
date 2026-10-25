# Technical Research & Architecture Decisions: Restrict Staff Provisioning Permissions

**Feature**: `102-restrict-staff-provisioning-permissions`  
**Ticket**: [SIAA-102](https://the-three-devsketeers.atlassian.net/browse/SIAA-102)  
**Date**: 2026-10-26  

---

## 1. Technical Context & Problem Analysis

In the SWIFT ecosystem, user accounts are divided into two categories:
1. **Administrative Accounts** (`admin`): Managed via direct administrative setup or system onboarding.
2. **Floor Staff Accounts** (`cashier`, `mechanic`, `inventory_clerk`): Provisioned by workshop administrators via `/admin/users` to operate shop floor terminals (`/staff/pos`, `/staff/work-orders`, `/staff/inventory`, `/staff/pricecheck`).

Previously, `AddStaffModal` exposed:
- `admin`, `staff`, `cashier`, `mechanic`, `inventory_clerk` in the role selector.
- Four separate boolean checkboxes (`can_adjust_stock`, `can_override_discount`, `can_manage_pricing`, `can_view_reports`).

This caused several issues:
- Administrators could accidentally provision full `admin` accounts from the standard staff modal.
- Arbitrary permission flag combinations could be assigned that break workstation invariants (e.g., giving a mechanic pricing management rights).
- The legacy `staff` role is a generic fallback that lacks workstation-specific access controls.

---

## 2. Approved Role Specification & Default Mapping

The three approved roles and their labels:

| Label | Stored Role Value (`DbUserRole`) | Canonical Default Permissions | Workstation Scope |
| :--- | :--- | :--- | :--- |
| **Cashier Privilege** | `cashier` | All flags `false` (standard checkout, cash tender, punch clock) | Fast-Lane POS (`/staff/pos`) |
| **Mechanic** | `mechanic` | All flags `false` (intake queue inspection, labor claim) | Workshop Bay Queue (`/staff/work-orders`) |
| **Inventory Clerk** | `inventory_clerk` | `can_adjust_stock: true`, rest `false` | Master Inventory & Shelving (`/staff/inventory`) |

### Exclusion of Checkboxes
When an administrator selects one of these three roles, the modal will no longer present any checkboxes. The backend will assign the exact default permission flags (`DEFAULT_ROLE_PERMISSIONS[role]`).

---

## 3. Server Action Validation & Security Audit Logging

### Next.js Server Action (`lib/admin/user-actions.ts`)
When `provisionStaffUserAction` is called:
1. Extract `role`.
2. Validate whether `role` is one of `['cashier', 'mechanic', 'inventory_clerk']`.
3. If invalid (e.g., `'admin'`, `'staff'`, `'guest'`, `'super_admin'`):
   - Invoke `logSecurityEventAction` with:
     ```ts
     {
       action: `Rejected unauthorized staff provisioning attempt with unapproved role: ${role}`,
       severity: 'warning',
       userEmail: callerEmail || 'admin@swift.ph',
       terminalIp: '192.168.1.100 (Admin PC)',
       metadata: { attemptedRole: role, targetEmail: normalizedEmail }
     }
     ```
   - Return `{ success: false, error: 'Staff account role must be one of: Cashier Privilege, Mechanic, or Inventory Clerk.', code: 'VALIDATION_ERROR' }`.

### Spring Boot Backend (`UserAdminServiceImpl.java`)
In `UserAdminServiceImpl.provisionStaffUser`:
1. Check `ALLOWED_PROVISION_ROLES.contains(rawRole)`.
2. If false:
   - Log security event with severity `warning`.
   - Throw `InvalidRoleException("Staff account role must be one of: cashier, mechanic, inventory_clerk")` which maps to HTTP 400 Bad Request.

---

## 4. Design System & Token Conformance
The UI changes in `components/admin/users/add-staff-modal.tsx` must strictly use:
- Surface: `bg-bg-card`, `bg-bg-surface`
- Borders: `border-border`
- Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- Action: `bg-primary`, `hover:bg-primary-hover`, `text-text-light`
- Zero hardcoded colors.
- Tailwind CSS v4 syntax only.
