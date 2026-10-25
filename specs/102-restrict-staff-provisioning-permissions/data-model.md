# Data Model: Restrict Staff Provisioning Permissions

**Feature**: `102-restrict-staff-provisioning-permissions`  
**Ticket**: [SIAA-102](https://the-three-devsketeers.atlassian.net/browse/SIAA-102)  

---

## 1. Domain Entities & Role Types

### Approved Provisionable Staff Roles
```typescript
export const APPROVED_STAFF_ROLES = ['cashier', 'mechanic', 'inventory_clerk'] as const;
export type ApprovedStaffRole = typeof APPROVED_STAFF_ROLES[number];
```

### Role Display & Workstation Mapping
```typescript
export interface RoleOption {
  label: string;
  value: ApprovedStaffRole;
  description: string;
}

export const APPROVED_ROLE_OPTIONS: readonly RoleOption[] = [
  {
    label: "Cashier Privilege",
    value: "cashier",
    description: "Point-of-sale checkout, cash tender, and terminal shifts",
  },
  {
    label: "Mechanic",
    value: "mechanic",
    description: "Service bay work order intake, job status updates, and labor tracking",
  },
  {
    label: "Inventory Clerk",
    value: "inventory_clerk",
    description: "Parts shelf locator management, stock counts, and inventory adjustments",
  },
] as const;
```

---

## 2. Default Permission Invariants

Every provisioned staff account receives deterministic default permissions matching its operational role:

```typescript
export const DEFAULT_PROVISION_PERMISSIONS: Record<ApprovedStaffRole, StaffPermissions> = {
  cashier: {
    can_adjust_stock: false,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
  mechanic: {
    can_adjust_stock: false,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
  inventory_clerk: {
    can_adjust_stock: true,
    can_override_discount: false,
    can_manage_pricing: false,
    can_view_reports: false,
  },
};
```

---

## 3. Provisioning Request DTO

```typescript
export interface ProvisionStaffUserDTO {
  fullName: string;
  email: string;
  role: ApprovedStaffRole;
  password?: string;
}
```

---

## 4. Security Audit Log Record (Violation / Rejection)

When an unauthorized role is supplied to the backend:

```typescript
export interface UnauthorizedRoleAuditEntry {
  action: string; // "Rejected unauthorized staff provisioning attempt with unapproved role: {role}"
  severity: "warning";
  userEmail: string; // Authenticated caller or admin email
  terminalIp: string;
  metadata: {
    attemptedRole: string;
    targetEmail: string;
    timestamp: string;
  };
}
```
