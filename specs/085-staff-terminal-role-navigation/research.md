# Architecture Research: Staff Terminal Role-Aware Navigation & Route View Guards

**Feature**: `085-staff-terminal-role-navigation`  
**Jira Issue**: [SIAA-85](https://the-three-devsketeers.atlassian.net/browse/SIAA-85)  
**Date**: 2026-10-20  

---

## 1. Stack Constraints & Dependencies

- **Framework**: Next.js 15+ (App Router), React 19 Client Components (`useSyncExternalStore`, React hooks).
- **Styling**: Tailwind CSS v4 using semantic design tokens (`bg-bg-sidebar`, `bg-bg-surface`, `border-border-subtle`, `text-text-primary`, `text-text-muted`, `bg-primary`, `bg-secondary`). Strictly zero hardcoded hex/rgb.
- **State Engines**:
  - `PunchStore` (`lib/store/punch-store.ts`): Authoritative state engine exposing `currentStaff`, `currentStaffRole`, `currentProfileId`, `isShiftActive`, and `shiftStatus`.
  - `CartStore` (`lib/store/cart-store.ts`): Cart state providing item count for POS badges.
- **Navigation Components**:
  - `StaffSidebar` (`components/staff/staff-sidebar.tsx`): Main navigation sidebar rendering floor operation tools.
  - `StaffMobileDrawer` (`components/staff/staff-mobile-drawer.tsx`): Mobile navigation drawer wrapping `StaffSidebar`.
  - `StaffTopbar` (`components/staff/staff-topbar.tsx`): Header containing view title and quick-access POS cart indicator.
- **Route Views**:
  - `/staff/pos` (`app/staff/pos/page.tsx`): Fast-Lane POS, guarded against direct access by non-cashier roles.
  - `/staff/compat` (`app/staff/compat/page.tsx`): MotoMatcher model fitment search (primary mechanic workspace).
  - `/staff/search` (`app/staff/search/page.tsx`): Stock & shelf finder (primary inventory clerk workspace).
  - `/staff/clock` (`app/staff/clock/page.tsx`): Punch clock attendance tool (accessible to all roles).

---

## 2. Problem Diagnosis & Architecture Analysis

### Current Navigation Structure
In `lib/staff/navigation.ts`:
```typescript
export const STAFF_NAV_ITEMS: StaffNavItem[] = [
  { id: "pos", label: "Fast-Lane POS", href: "/staff/pos", category: "Shop Floor Operations", icon: Zap },
  { id: "search", label: "Stock & Shelf Finder", href: "/staff/search", category: "Shop Floor Operations", icon: PackageSearch },
  { id: "compat", label: "Model Fitment Search", href: "/staff/compat", category: "Shop Floor Operations", icon: Wrench },
  { id: "pricecheck", label: "Item Code Price Check", href: "/staff/pricecheck", category: "Shop Floor Operations", icon: Barcode },
  { id: "history", label: "Purchase History", href: "/staff/history", category: "Shop Floor Operations", icon: History },
  { id: "clock", label: "Punch Clock", href: "/staff/clock", category: "Shop Floor Operations", ... },
];
```

In `components/staff/staff-sidebar.tsx`:
```tsx
{STAFF_NAV_ITEMS.map((item) => {
  ...
  return <StaffNavItemComponent key={item.id} ... />;
})}
```
Currently:
1. `STAFF_NAV_ITEMS` does not declare role constraints.
2. `StaffSidebar` renders all 6 items indiscriminately without checking `currentStaffRole`.
3. In `app/staff/pos/page.tsx`, non-cashiers can navigate directly to the URL `/staff/pos`. While SIAA-84 prevented them from checking out, their sidebar still shows POS and they can access the POS screen directly.
4. The footer of `StaffSidebar` displays hardcoded `DEFAULT_STAFF_USER` ("Mike Morales, Cashier / Floor Staff") even when Dante Reyes (Mechanic) or Rico Santos (Inventory Clerk) is logged in.

---

## 3. Architectural Design & Solutions

### A. Role Filtering Engine (`lib/staff/navigation.ts`)
Extend `StaffNavItem` with `allowedRoles?: DbUserRole[]`:
```typescript
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
Define role mappings for each tool:
- `pos`: `['cashier', 'admin']`
- `search`: `['cashier', 'mechanic', 'inventory_clerk', 'admin', 'staff']`
- `compat`: `['mechanic', 'cashier', 'admin', 'staff']`
- `pricecheck`: `['inventory_clerk', 'cashier', 'admin', 'staff']`
- `history`: `['cashier', 'admin']`
- `clock`: `['cashier', 'mechanic', 'inventory_clerk', 'admin', 'staff']`

Provide a pure filtering utility:
```typescript
export function filterNavItemsByRole(
  items: StaffNavItem[],
  role: string | undefined
): StaffNavItem[] {
  if (!role) return items;
  const normalizedRole = role.toLowerCase() as DbUserRole;
  return items.filter((item) => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    return item.allowedRoles.includes(normalizedRole);
  });
}
```

Provide primary route resolver:
```typescript
export function getRolePrimaryRoute(role: string | undefined): { path: string; reason: string } {
  const normalized = role?.toLowerCase();
  switch (normalized) {
    case 'mechanic':
      return {
        path: '/staff/compat',
        reason: 'Redirected: Your profile is scoped to workshop repair tools.',
      };
    case 'inventory_clerk':
      return {
        path: '/staff/search',
        reason: 'Redirected: Your profile is scoped to inventory management tools.',
      };
    case 'cashier':
    case 'admin':
      return {
        path: '/staff/pos',
        reason: 'Authorized access.',
      };
    default:
      return {
        path: '/staff/clock',
        reason: 'Redirected: Your profile is scoped to attendance and clock tools.',
      };
  }
}
```

### B. Reactive Sidebar Updates (`StaffSidebar`)
In `StaffSidebar`:
1. Subscribe to `usePunchStore()` to retrieve `currentStaff`, `currentStaffRole`, and `currentProfileId`.
2. Apply `filterNavItemsByRole(STAFF_NAV_ITEMS, currentStaffRole)` to determine items to render.
3. Compute avatar initials and display role title dynamically:
   - If profile exists in `MOCK_STAFF_PROFILES`, use `roleDisplay` and name.
   - Otherwise format `currentStaffRole` (e.g. `mechanic` -> `Mechanic`, `inventory_clerk` -> `Inventory Clerk`).

### C. POS Direct Route Guard (`app/staff/pos/page.tsx`)
In `StaffPosPage`:
1. Read `currentStaffRole` from `usePunchStore()`.
2. In a `useEffect` on mount / role change:
   ```typescript
   useEffect(() => {
     if (currentStaffRole && currentStaffRole !== 'cashier' && currentStaffRole !== 'admin') {
       const { path, reason } = getRolePrimaryRoute(currentStaffRole);
       showToast('error', reason);
       router.replace(path);
     }
   }, [currentStaffRole, router, showToast]);
   ```
3. If `currentStaffRole` is non-cashier, render an accessible redirect banner / loading state while redirecting to avoid layout flicker.

### D. Topbar Cart Link Guard (`StaffTopbar`)
In `components/staff/staff-topbar.tsx`:
Read `currentStaffRole` from `usePunchStore()`.
Only display the quick-access cart button if `currentStaffRole === 'cashier' || currentStaffRole === 'admin'`.

---

## 4. Verification & Testing Strategy

- **Unit / Component Tests (`__tests__/staff-sidebar-rbac.test.tsx`)**:
  - Verify `filterNavItemsByRole` for:
    - `mechanic`: Returns `clock`, `compat`, `search`; excludes `pos`, `history`, `pricecheck`.
    - `inventory_clerk`: Returns `clock`, `search`, `pricecheck`; excludes `pos`, `history`, `compat`.
    - `cashier` & `admin`: Returns all 6 items.
  - Verify `getRolePrimaryRoute` returns proper path and redirect reason for each role.
  - Render `StaffSidebar` with mocked store roles and assert DOM contains only permitted navigation links.
  - Verify route redirection logic in `app/staff/pos/page.tsx`.
