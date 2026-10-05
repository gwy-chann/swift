# Interface & Component Contracts: Admin Portal Shell

**Feature**: Admin Portal Navigation Shell & Collapsible Sidebar ([SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9))
**Status**: Completed

## 1. Component Props Contracts

### `AdminSidebarProps`
```typescript
export interface AdminSidebarProps {
  currentPath: string;
  user: AdminUserMeta;
  onLogout?: () => Promise<void>;
  className?: string;
}
```

### `AdminTopbarProps`
```typescript
export interface AdminTopbarProps {
  title: string;
  terminalNumber?: string;
  onOpenMobileMenu?: () => void;
  onSwitchPortal?: () => void;
}
```

### `NavMenuItemProps`
```typescript
export interface NavMenuItemProps {
  item: AdminNavItem;
  isActive: boolean;
  onClick?: () => void;
}
```

### `AdminMobileDrawerProps`
```typescript
export interface AdminMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  user: AdminUserMeta;
}
```

---

## 2. Server Action Contract: `logoutAction`

### Signature
```typescript
export async function logoutAction(): Promise<{ success: boolean; redirectTo: string }>;
```

### Behavior
- Invokes Supabase Auth `signOut()` if active.
- Deletes `swift-session-role` and `swift-user-name` cookies.
- Returns `{ success: true, redirectTo: "/login" }`.

---

## 3. UI Styling & Token Matrix

| Component Area | Background Token | Text / Border Token |
| :--- | :--- | :--- |
| **Sidebar Canvas** | `bg-bg-sidebar` | `text-text-light` |
| **Category Header** | Transparent | `text-text-muted text-xs uppercase font-bold tracking-wider` |
| **Active Nav Link** | `bg-primary` | `text-white font-bold` |
| **Inactive Nav Link** | Transparent / `hover:bg-bg-sidebar-hover` | `text-text-light/80 hover:text-white` |
| **Badge (Danger)** | `bg-danger text-white` | `rounded-full text-[10px] font-bold px-2 py-0.5` |
| **Topbar Header** | `bg-bg-surface` | `border-b border-border text-text-primary` |
| **Content Area** | `bg-bg-base` | `text-text-primary` |
