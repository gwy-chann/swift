# Technical Implementation Plan: Staff Terminal Role-Aware Navigation & Route View Guards

**Feature**: `085-staff-terminal-role-navigation`  
**Jira Issue**: [SIAA-85](https://the-three-devsketeers.atlassian.net/browse/SIAA-85)  
**Parent Epic**: [SIAA-77](https://the-three-devsketeers.atlassian.net/browse/SIAA-77)  
**Date**: 2026-10-20  

---

## 1. Architectural Overview & Boundary Mapping

```mermaid
flowchart TD
    Store[usePunchStore\ncurrentStaffRole, currentStaff] --> Sidebar[StaffSidebar\ncomponents/staff/staff-sidebar.tsx]
    Store --> Drawer[StaffMobileDrawer\ncomponents/staff/staff-mobile-drawer.tsx]
    Store --> Topbar[StaffTopbar\ncomponents/staff/staff-topbar.tsx]
    Store --> PosGuard[StaffPosPage Route Guard\napp/staff/pos/page.tsx]
    
    NavConfig[STAFF_NAV_ITEMS\nallowedRoles: DbUserRole[]] --> FilterHelper[filterNavItemsByRole]
    FilterHelper --> Sidebar
    
    RouteConfig[ROLE_ROUTE_CONFIG\ngetRolePrimaryRoute] --> PosGuard
```

### Affected Files & Boundaries
1. **Types & Config**:
   - `lib/staff/types.ts`: Add `allowedRoles?: DbUserRole[]` to `StaffNavItem`.
   - `lib/staff/navigation.ts`: Export `STAFF_NAV_ITEMS` with explicit `allowedRoles`, add `filterNavItemsByRole`, `getRolePrimaryRoute`, and `ROLE_ROUTE_CONFIG`.
2. **Components**:
   - `components/staff/staff-sidebar.tsx`: Consume `currentStaff` and `currentStaffRole` from `usePunchStore()`, filter items using `filterNavItemsByRole`, and dynamically render the footer profile.
   - `components/staff/staff-topbar.tsx`: Guard quick-access POS cart button based on `currentStaffRole === 'cashier' || currentStaffRole === 'admin'`.
3. **Route Views**:
   - `app/staff/pos/page.tsx`: Evaluate `currentStaffRole` on mount and redirect unauthorized roles to their primary route (`/staff/compat` for mechanic, `/staff/search` for inventory clerk, `/staff/clock` for other non-cashiers) with informative toast.
4. **Test Suite**:
   - `__tests__/staff-sidebar-rbac.test.tsx`: Comprehensive test coverage for pure helper functions, component rendering by role, and route guard logic.

---

## 2. Design Tokens Adherence (Mandatory Rule)

- All visual elements must strictly use established SWIFT semantic tokens:
  - Sidebar background: `bg-bg-sidebar`
  - Sidebar borders: `border-border-subtle`
  - Text colors: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-light`
  - Accent / Badges: `bg-primary`, `bg-secondary`, `bg-success`, `bg-info`, `bg-warning`
  - Zero hardcoded hex/RGB colors.

---

## 3. Implementation Phasing Strategy

### Phase 1: Models & Contracts
- Update `lib/staff/types.ts` and `lib/staff/navigation.ts`.
- Ensure export compatibility across all modules that import `STAFF_NAV_ITEMS`.

### Phase 2: Navigation Components Adaptation
- Update `StaffSidebar` with reactive filtering and dynamic footer user profile.
- Update `StaffTopbar` to guard the quick-access cart link.

### Phase 3: Route Guard Redirection
- Add route redirection in `app/staff/pos/page.tsx` using `getRolePrimaryRoute` and `showToast`.

### Phase 4: Automated Testing & Verification
- Implement `__tests__/staff-sidebar-rbac.test.tsx` verifying:
  - Role item filtering
  - Redirection paths and messages
  - Sidebar rendering under each profile
- Run `npm test`, `npm run lint`, and `tsc --noEmit`.
