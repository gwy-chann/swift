# Data Model: Staff Terminal Role-Aware Navigation & Route View Guards

**Feature**: `085-staff-terminal-role-navigation`  
**Jira Issue**: [SIAA-85](https://the-three-devsketeers.atlassian.net/browse/SIAA-85)  
**Date**: 2026-10-20  

---

## 1. Domain Entities & Role Models

### 1.1 Navigation Item with Role Permissions

```typescript
import { ElementType } from "react";
import type { DbUserRole } from "@/lib/types/auth";

export type StaffBadgeVariant = "success" | "warning" | "primary" | "danger" | "info";

export interface StaffNavBadge {
  text: string;
  variant: StaffBadgeVariant;
}

export interface StaffNavItem {
  id: string;
  label: string;
  href: string;
  category?: string;
  badge?: StaffNavBadge;
  icon?: ElementType;
  allowedRoles?: DbUserRole[];
}
```

### 1.2 Role Tool Permissions Matrix

| Navigation Item ID | Route Path | Permitted Roles (`allowedRoles`) | Mechanic | Inventory Clerk | Cashier | Admin |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `pos` | `/staff/pos` | `['cashier', 'admin']` | ❌ | ❌ | ✅ | ✅ |
| `search` | `/staff/search` | `['cashier', 'mechanic', 'inventory_clerk', 'admin', 'staff']` | ✅ | ✅ | ✅ | ✅ |
| `compat` | `/staff/compat` | `['mechanic', 'cashier', 'admin', 'staff']` | ✅ | ❌ | ✅ | ✅ |
| `pricecheck` | `/staff/pricecheck` | `['inventory_clerk', 'cashier', 'admin', 'staff']` | ❌ | ✅ | ✅ | ✅ |
| `history` | `/staff/history` | `['cashier', 'admin']` | ❌ | ❌ | ✅ | ✅ |
| `clock` | `/staff/clock` | `['cashier', 'mechanic', 'inventory_clerk', 'admin', 'staff']` | ✅ | ✅ | ✅ | ✅ |

---

## 2. Route Guard & Redirection Model

### 2.1 Primary Route Definition

```typescript
export interface RoleRouteRedirection {
  targetPath: string;
  notificationMessage: string;
  isAuthorizedForPos: boolean;
}

export const ROLE_ROUTE_CONFIG: Record<DbUserRole, RoleRouteRedirection> = {
  mechanic: {
    targetPath: '/staff/compat',
    notificationMessage: 'Redirected: Your profile is scoped to workshop repair tools.',
    isAuthorizedForPos: false,
  },
  inventory_clerk: {
    targetPath: '/staff/search',
    notificationMessage: 'Redirected: Your profile is scoped to inventory management tools.',
    isAuthorizedForPos: false,
  },
  cashier: {
    targetPath: '/staff/pos',
    notificationMessage: 'Authorized access.',
    isAuthorizedForPos: true,
  },
  admin: {
    targetPath: '/staff/pos',
    notificationMessage: 'Authorized access.',
    isAuthorizedForPos: true,
  },
  staff: {
    targetPath: '/staff/clock',
    notificationMessage: 'Redirected: Your profile is scoped to attendance and clock tools.',
    isAuthorizedForPos: false,
  },
};
```

---

## 3. Dynamic Footer Profile State

```typescript
export interface StaffSidebarActiveProfile {
  name: string;
  roleTitle: string;
  avatarInitials: string;
}
```

Derived from:
- `currentStaff` (from `usePunchStore`)
- `currentStaffRole` (from `usePunchStore`)
- `MOCK_STAFF_PROFILES` matching `currentProfileId` or `name`
