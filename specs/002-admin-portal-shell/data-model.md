# Data Model & Schema Specifications: Admin Portal Shell

**Feature**: Admin Portal Navigation Shell & Collapsible Sidebar ([SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9))
**Status**: Completed

## 1. Navigation Domain Types & Schemas

### `NavCategory` (Enum / Union Type)
Defines the functional grouping of administrative modules.

```typescript
export type NavCategory = "Store Intelligence" | "Administration";
```

### `BadgeVariant` (Enum / Union Type)
Status color mapping for navigation notification badges.

```typescript
export type BadgeVariant = "danger" | "warning" | "success" | "info" | "neutral";
```

### `NavBadge` (Interface)
Defines an optional notification pill displayed on a navigation link.

```typescript
export interface NavBadge {
  text: string;
  variant: BadgeVariant;
}
```

### `AdminNavItem` (Interface)
Defines a single administrative route entry in the sidebar.

```typescript
export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  category: NavCategory;
  badge?: NavBadge;
}
```

### `AdminUserMeta` (Interface)
User profile information displayed in the sidebar footer.

```typescript
export interface AdminUserMeta {
  name: string;
  role: string;
  avatarInitials: string;
  email?: string;
}
```

---

## 2. Authoritative Admin Route Matrix

| ID | Label | Route Path | Category | Default Badge |
| :--- | :--- | :--- | :--- | :--- |
| `dashboard` | Admin Dashboard | `/admin` | Store Intelligence | — |
| `inventory` | Inventory & Stock | `/admin/inventory` | Store Intelligence | `3 Low` (danger) |
| `pos` | Point of Sale (POS) | `/admin/pos` | Store Intelligence | — |
| `motomatcher` | MotoMatcher Search | `/admin/motomatcher` | Store Intelligence | — |
| `reports` | Reports & Analytics | `/admin/reports` | Store Intelligence | — |
| `users` | User Management | `/admin/users` | Administration | — |
| `pricing` | Pricing & Labor Rates | `/admin/rates` | Administration | — |
| `settings` | Settings & Audit Logs | `/admin/logs` | Administration | — |

---

## 3. Topbar Status Model

```typescript
export interface TerminalStatus {
  online: boolean;
  terminalNumber: string;
  serviceBaysOnline: number;
}
```
