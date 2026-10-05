# Feature Specification: Admin Portal Navigation Shell & Collapsible Sidebar

**Feature Branch**: `feat/SIAA-9-admin-portal-shell`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "STORY-1.2: Admin Portal Navigation Shell & Collapsible Sidebar (Jira: SIAA-9). As a Store Administrator, I want a dedicated admin navigation sidebar showing all core management modules with active highlights and logout controls, so that I can seamlessly navigate between inventory, POS, reports, and system settings while managing store operations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full Module Navigation & Active View Highlighting (Priority: P1)

Store administrators need a permanent, high-contrast sidebar organized by operational concerns to quickly jump between shop intelligence modules and administrative settings without losing context.

**Why this priority**: Navigation is the foundational spine of the Admin Portal; downstream feature modules (Inventory, POS, MotoMatcher, Analytics, and Settings) cannot be accessed without this navigation layout.

**Independent Test**: Can be tested independently by loading the `/admin` shell and clicking each sidebar item (Inventory, POS, MotoMatcher, Reports, Users, Pricing, Settings) to verify path updates and immediate visual highlighting on the active tab.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator on `/admin`, **When** the sidebar renders, **Then** it displays two distinct menu categories:
   - **Store Intelligence**: Admin Dashboard (`/admin`), Inventory & Stock (`/admin/inventory`), Point of Sale (`/admin/pos`), MotoMatcher Search (`/admin/motomatcher`), Reports & Analytics (`/admin/reports`).
   - **Administration**: User Management (`/admin/users`), Pricing & Labor Rates (`/admin/rates`), Settings & Audit Logs (`/admin/logs`).
2. **Given** a user navigates to any admin sub-route (e.g., `/admin/inventory`), **When** the page loads, **Then** the corresponding sidebar menu item is highlighted using the primary brand token (`bg-primary`), while other menu items display default state.
3. **Given** the Inventory menu item, **When** rendered, **Then** it displays an alert badge (e.g., "3 Low") indicating actionable threshold events.

---

### User Story 2 - Admin Topbar & Store Operational Status (Priority: P1)

Administrators need continuous visibility into active terminal status and a quick action to switch over to the Staff POS terminal when assisting shop floor staff.

**Why this priority**: Workshop managers frequently transition between desk analytics and front-counter customer service; they need immediate operational indicators and portal switching controls.

**Independent Test**: Can be tested independently by verifying the topbar renders the dynamic view title matching the active route, displays the terminal status indicator `[ONLINE] Terminal #01`, and provides a working "Switch to Staff Portal" button.

**Acceptance Scenarios**:

1. **Given** an administrator is on any admin view, **When** the topbar renders, **Then** it displays the current module title, a live status badge (`[ONLINE] Terminal #01`), and a "Switch to Staff Portal" button.
2. **Given** the administrator clicks "Switch to Staff Portal", **When** triggered, **Then** the system redirects to `/staff/pos` or prompts portal transition.

---

### User Story 3 - User Profile Display & Admin Logout (Priority: P2)

Administrators need clear verification of their logged-in user identity and a secure 1-click logout mechanism to end their managerial session.

**Why this priority**: Security hygiene in retail workshops requires managers to safely log out when stepping away from the main terminal.

**Independent Test**: Can be tested independently by viewing the user profile card at the bottom of the sidebar and clicking "Log Out Account", confirming session destruction and redirect to `/login`.

**Acceptance Scenarios**:

1. **Given** an authenticated admin session, **When** viewing the sidebar footer, **Then** it displays the user avatar initials, user name, and role badge (`System Admin`).
2. **Given** the admin clicks "Log Out Account", **When** submitted, **Then** the active session cookies are cleared and the browser redirects to `/login`.

---

### User Story 4 - Responsive Navigation & Mobile Drawer (Priority: P3)

Managers inspecting stock on tablets or mobile devices need the sidebar to adapt responsively into an accessible slide-out drawer.

**Why this priority**: Enables floor mobility for managers walking through parts aisles with handheld devices or tablets.

**Independent Test**: Can be tested independently by resizing the browser viewport below 768px and toggling the hamburger menu to open and close the slide-out navigation drawer.

**Acceptance Scenarios**:

1. **Given** a viewport width under 768px, **When** accessing the Admin Portal, **Then** the desktop sidebar is hidden and a hamburger toggle button appears in the topbar.
2. **Given** the mobile drawer is open, **When** the user clicks the close button, clicks the backdrop overlay, or selects a navigation link, **Then** the drawer dismisses smoothly.

---

### Edge Cases

- **Direct URL / Deep Linking**: When an administrator directly pastes or refreshes a sub-route URL (e.g. `/admin/motomatcher`), the sidebar and topbar correctly highlight the route and display matching titles upon first render.
- **Unauthenticated Route Protection**: Visiting `/admin/*` without an active session automatically redirects to `/login` with clean query params.
- **Dynamic Content Overflow**: Long module pages scroll independently within the `<main class="app-content">` viewport while the sidebar and topbar remain pinned.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a fixed desktop sidebar layout consuming SWIFT dark slate design tokens (`bg-bg-sidebar`, `text-text-light`).
- **FR-002**: Sidebar MUST render brand header with "SWIFT" logo and an "ADMIN" badge.
- **FR-003**: Sidebar MUST organize navigation into two categories: "Store Intelligence" and "Administration".
- **FR-004**: System MUST automatically detect the active pathname and apply high-contrast active styling (`bg-primary text-white`) to the corresponding navigation link.
- **FR-005**: Sidebar MUST support notification badges (e.g., danger accent for low stock warnings) next to menu labels.
- **FR-006**: Topbar MUST display the current view title, live connection/terminal status badge, and "Switch to Staff Portal" action.
- **FR-007**: Sidebar footer MUST display current user profile metadata (avatar initials, name, and role) and a functional "Log Out Account" action.
- **FR-008**: System MUST support responsive drawer mode for viewports under 768px with touch-friendly backdrop dismissal.
- **FR-009**: All UI components MUST strictly adhere to SWIFT semantic design tokens and WCAG AA accessibility standards.

### Key Entities *(include if feature involves data)*

- **Admin Navigation Item**:
  - `id`: Unique identifier (e.g., `dashboard`, `inventory`, `pos`)
  - `label`: Display text
  - `href`: Target URL path
  - `icon`: Lucide icon component reference
  - `badge`: Optional notification pill (text + status variant)
  - `category`: Group assignment (`Store Intelligence` | `Administration`)
- **Admin User Context**:
  - `name`: User display name
  - `role`: Role title (`System Admin` | `Store Manager`)
  - `initials`: Avatar abbreviation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sidebar navigation transitions between views occur in under 100 milliseconds with zero layout jitter.
- **SC-002**: 100% of sub-routes under `/admin/*` display accurate active menu highlighting on direct load and route changes.
- **SC-003**: 1-click logout completes session destruction and navigates to `/login` in under 200 milliseconds.
- **SC-004**: Responsive drawer opens and closes with smooth 60fps CSS transitions and zero horizontal page overflow.
- **SC-005**: Layout achieves 100% compliance with WCAG AA contrast standards across dark sidebar and content workspace.

## Assumptions

- **Shared Layout**: Downstream feature stories under EPIC-2 through EPIC-7 will mount their views inside the `<div class="app-content">` viewport provided by this shell.
- **Theme**: Admin sidebar uses the authoritative dark slate sidebar token (`bg-bg-sidebar`) consistently across light and dark workspace themes as defined in `mockup/style.css`.
- **Target Viewports**: Responsive support covers 320px mobile up to 4K desktop workshop monitors.
