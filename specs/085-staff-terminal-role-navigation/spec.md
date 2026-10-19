# Feature Specification: Staff Terminal Role-Aware Navigation & Route View Guards

**Feature Branch**: `feat/SIAA-85-staff-role-navigation`  
**Created**: 2026-10-20  
**Status**: Ready for Planning / Implementation  
**Jira Issue**: [SIAA-85](https://the-three-devsketeers.atlassian.net/browse/SIAA-85)  
**Parent Epic**: [SIAA-77](https://the-three-devsketeers.atlassian.net/browse/SIAA-77) (Staff Terminal POS & Attendance Controls)  
**Target View**: Staff Shop Floor Terminal (`/staff/*`, `components/staff/staff-sidebar.tsx`, `components/staff/staff-mobile-drawer.tsx`, `app/staff/pos/page.tsx`)

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and repair workshops, shop floor terminals (`Terminal #01`) are shared across multi-disciplinary staff members: Cashiers, Shop Floor Mechanics, and Warehouse Inventory Clerks. 

Currently, `components/staff/staff-sidebar.tsx` unconditionally renders all 6 navigation links (`pos`, `search`, `compat`, `pricecheck`, `history`, `clock`) regardless of whether the authenticated employee is a cashier, mechanic, or inventory clerk. A mechanic working on motorcycle repairs does not need POS and sales history cluttering their sidebar, while an inventory clerk shouldn't have direct access to register screens. Furthermore, direct URL access to `/staff/pos` is unguarded against unauthorized roles entering the POS route directly.

This specification implements **Staff Terminal Role-Aware Navigation**:
1. **Role-Filtered Navigation Items**: Add `allowedRoles: DbUserRole[]` metadata to `StaffNavItem` in `lib/staff/navigation.ts`, and filter navigation items in `StaffSidebar` and `StaffMobileDrawer` according to the active operator's role from `usePunchStore()`.
2. **Role-Tailored Tool Visibility**:
   - **Mechanic**: Only views Punch Clock (`/staff/clock`), Model Fitment Search / MotoMatcher (`/staff/compat`), and Stock & Shelf Finder (`/staff/search`). POS (`/staff/pos`), Purchase History (`/staff/history`), and Item Code Price Check (`/staff/pricecheck`) are hidden.
   - **Inventory Clerk**: Only views Punch Clock (`/staff/clock`), Stock & Shelf Finder (`/staff/search`), and Item Code Price Check (`/staff/pricecheck`). Fast-Lane POS (`/staff/pos`), Purchase History (`/staff/history`), and Model Fitment Search (`/staff/compat`) are hidden.
   - **Cashier & Admin**: Full visibility of all shop floor tools (`pos`, `search`, `compat`, `pricecheck`, `history`, `clock`).
3. **Direct URL Route Guard & Redirection**: When a non-cashier role (such as a Mechanic or Inventory Clerk) attempts to navigate directly to `/staff/pos` via manual URL input:
   - Mechanics are automatically redirected to `/staff/compat` with toast: *"Redirected: Your profile is scoped to workshop repair tools."*
   - Inventory Clerks are automatically redirected to `/staff/search` with toast: *"Redirected: Your profile is scoped to inventory management tools."*
4. **Dynamic Staff Profile & Role Indicator**: The sidebar footer profile badge dynamically reflects the active operator's name, role display, and avatar initials from `usePunchStore()`.
5. **SWIFT Semantic Design Tokens**: Full adherence to SWIFT design tokens (`bg-bg-sidebar`, `bg-bg-surface`, `text-text-primary`, `text-text-muted`, `bg-secondary`, `bg-primary`, `border-border`) with zero hardcoded hex/rgb.

---

## 1.1 Clarifications & Decisions

### Session 2026-10-20
- **Q1: Which roles are permitted to view and access Fast-Lane POS (`/staff/pos`)?**  
  - **A**: Strictly `cashier` and `admin`. Non-cashier roles (mechanic, inventory clerk, generic staff) have POS hidden from their navigation and are redirected if accessing `/staff/pos` directly.
- **Q2: Which primary route should non-cashier roles be redirected to if they manually open `/staff/pos`?**  
  - **A**:
    - `mechanic`: Redirect to `/staff/compat` (MotoMatcher) with toast: *"Redirected: Your profile is scoped to workshop repair tools."*
    - `inventory_clerk`: Redirect to `/staff/search` (Stock & Shelf Finder) with toast: *"Redirected: Your profile is scoped to inventory management tools."*
    - Other non-cashier roles: Redirect to `/staff/clock` with toast: *"Redirected: Your profile is scoped to attendance and clock tools."*
- **Q3: Does the navigation filter update immediately when switching staff profiles?**  
  - **A**: Yes. Since `StaffSidebar` subscribes to `usePunchStore()`'s `currentStaffRole`, changing the staff member updates the rendered navigation items reactively with zero page reload.
- **Q4: How does the mobile navigation drawer behave?**  
  - **A**: `StaffMobileDrawer` renders `StaffSidebar`, so role filtering applies identically across desktop and mobile screens.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-85)

* **As a** Shop Floor Staff Member (Mechanic, Inventory Clerk, or Cashier),  
* **I want** the Staff Sidebar to display only the tools and menus permitted for my specific role,  
* **So that** my screen is clean, relevant to my work, and prevents accidental navigation into unauthorized areas.

---

### Scenario 1: Mechanic Navigation View (Priority: P1)

* **Given** an employee logs in with a Mechanic profile (e.g. Dante Reyes)
* **When** the Staff Terminal shell mounts
* **Then** the sidebar displays:
  * ⏱️ **Punch Clock** (`/staff/clock`)
  * 🔧 **Model Fitment Search / MotoMatcher** (`/staff/compat`)
  * 📦 **Stock & Shelf Finder** (`/staff/search`)
* **And** the **Fast-Lane POS** (`/staff/pos`), **Purchase History** (`/staff/history`), and **Item Code Price Check** (`/staff/pricecheck`) links are hidden from view.

---

### Scenario 2: Inventory Clerk Navigation View (Priority: P1)

* **Given** an employee logs in with an Inventory Clerk profile (e.g. Rico Santos)
* **When** the Staff Terminal shell mounts
* **Then** the sidebar displays:
  * ⏱️ **Punch Clock** (`/staff/clock`)
  * 📦 **Stock & Shelf Finder** (`/staff/search`)
  * 🏷️ **Item Code Price Check** (`/staff/pricecheck`)
* **And** the **Fast-Lane POS** (`/staff/pos`), **Purchase History** (`/staff/history`), and **Model Fitment Search** (`/staff/compat`) links are hidden from view.

---

### Scenario 3: Cashier & Admin Navigation View (Priority: P1)

* **Given** an employee logs in with a Cashier profile (e.g. Mike Morales) or Admin (e.g. Carlos Rodriguez)
* **When** the Staff Terminal shell mounts
* **Then** the sidebar displays all 6 navigation links:
  * ⚡ **Fast-Lane POS** (`/staff/pos`)
  * 📦 **Stock & Shelf Finder** (`/staff/search`)
  * 🔧 **Model Fitment Search** (`/staff/compat`)
  * 🏷️ **Item Code Price Check** (`/staff/pricecheck`)
  * 📜 **Purchase History** (`/staff/history`)
  * ⏱️ **Punch Clock** (`/staff/clock`)

---

### Scenario 4: Direct URL Route Guard Redirection (Priority: P2)

* **Given** a Mechanic attempts to navigate directly to `/staff/pos` via manual browser URL entry
* **When** the route executes
* **Then** the page redirects them to `/staff/compat` (MotoMatcher)
* **And** an informative toast message is displayed:  
  *"Redirected: Your profile is scoped to workshop repair tools."*

---

### Scenario 5: Inventory Clerk Direct URL Route Guard Redirection (Priority: P2)

* **Given** an Inventory Clerk attempts to navigate directly to `/staff/pos` via manual browser URL entry
* **When** the route executes
* **Then** the page redirects them to `/staff/search` (Stock & Shelf Finder)
* **And** an informative toast message is displayed:  
  *"Redirected: Your profile is scoped to inventory management tools."*

---

### Scenario 6: Profile Switching Dynamic Re-filtering (Priority: P3)

* **Given** a Cashier is currently active on the terminal
* **When** the active staff member is switched to a Mechanic via Kiosk switch or punch clock
* **Then** the sidebar immediately filters down to the 3 permitted tools without requiring a full browser refresh
* **And** the footer profile reflects "Dante Reyes - Mechanic".

---

## 3. Edge Cases

- **E1: Unrecognized or missing role**: If `currentStaffRole` is undefined, empty, or an unrecognized string, fallback safely to showing standard floor tools (`search`, `clock`) and redirecting away from POS.
- **E2: Topbar Cart Shortcut for Non-Cashiers**: If a non-cashier has items in the cart (e.g. staged from parts lookup), the topbar cart link is hidden or deactivated for non-cashier roles to prevent bypassing the sidebar.
- **E3: Direct Navigation during Client Hydration**: Route guards should account for initial client hydration to prevent flashing POS contents before redirection.

---

## 4. Functional Requirements

- **FR-001**: `StaffNavItem` in `lib/staff/types.ts` MUST include `allowedRoles?: DbUserRole[]`.
- **FR-002**: `STAFF_NAV_ITEMS` in `lib/staff/navigation.ts` MUST specify role permissions for each navigation link:
  - `pos`: `['cashier', 'admin']`
  - `search`: `['cashier', 'mechanic', 'inventory_clerk', 'admin', 'staff']`
  - `compat`: `['mechanic', 'cashier', 'admin', 'staff']`
  - `pricecheck`: `['inventory_clerk', 'cashier', 'admin', 'staff']`
  - `history`: `['cashier', 'admin']`
  - `clock`: `['cashier', 'mechanic', 'inventory_clerk', 'admin', 'staff']`
- **FR-003**: System MUST provide a helper function `filterNavItemsByRole(items: StaffNavItem[], role: string | undefined): StaffNavItem[]` in `lib/staff/navigation.ts`.
- **FR-004**: System MUST provide a helper function `getRolePrimaryRoute(role: string | undefined): { path: string; reason: string }` in `lib/staff/navigation.ts`.
- **FR-005**: `StaffSidebar` in `components/staff/staff-sidebar.tsx` MUST retrieve `currentStaffRole` from `usePunchStore()` and filter items using `filterNavItemsByRole`.
- **FR-006**: `StaffSidebar` footer MUST dynamically display the active staff member's name, role title, and avatar initials from `currentStaff` and `currentStaffRole` (or profile metadata) instead of static hardcoded `DEFAULT_STAFF_USER`.
- **FR-007**: In `app/staff/pos/page.tsx`, an active route guard MUST detect non-cashier roles (`currentStaffRole !== 'cashier' && currentStaffRole !== 'admin'`) and redirect the user to their role-specific primary route with the appropriate redirect message.
- **FR-008**: The topbar quick-access POS cart indicator in `components/staff/staff-topbar.tsx` MUST only display when `currentStaffRole === 'cashier' || currentStaffRole === 'admin'`.
- **FR-009**: All UI alerts, toasts, and navigation states MUST strictly use SWIFT semantic design tokens (`bg-bg-sidebar`, `bg-bg-surface`, `text-text-primary`, `text-text-muted`, `bg-primary`, `bg-secondary`, `border-border`) with zero hardcoded hex or RGB colors.

---

## 5. Success Criteria

- **SC-001**: 100% of defined navigation items in `StaffSidebar` adhere to the role permissions matrix across Mechanic, Inventory Clerk, and Cashier profiles.
- **SC-002**: Direct navigation to `/staff/pos` redirects unauthorized roles in <200ms with clear toast messaging.
- **SC-003**: 100% test coverage for role filtering logic and route guards with unit tests in `__tests__/staff-sidebar-rbac.test.tsx`.
- **SC-004**: Zero hardcoded hex/RGB colors introduced, fully compliant with SWIFT semantic design tokens.

---

## 6. Assumptions

- **A-001**: `usePunchStore` provides the authoritative synchronous state for `currentStaff` and `currentStaffRole`.
- **A-002**: Roles follow the standard `DbUserRole` enum: `'admin' | 'cashier' | 'mechanic' | 'inventory_clerk' | 'staff'`.
- **A-003**: The toast notification system on `/staff/*` handles redirect messages cleanly.
