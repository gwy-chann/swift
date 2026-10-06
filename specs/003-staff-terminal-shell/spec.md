# Feature Specification: Staff Shop Floor Terminal Layout Shell

**Feature Branch**: `feat/SIAA-10-staff-terminal-layout-shell`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "STORY-1.3: Staff Shop Floor Terminal Layout Shell (Jira: SIAA-10). As a Shop Floor Cashier or Mechanic, I want a high-contrast, distraction-free terminal layout with direct tabs for POS, Shelf Locator, Punch Clock, and Price Check, so that I can execute high-speed floor transactions and inquiries with minimal navigation overhead."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff Shop Floor Operations Navigation (Priority: P1)

Shop floor cashiers and mechanics need high-contrast, instant navigation across primary floor terminal tools (Fast-Lane POS, Stock & Shelf Finder, Model Fitment Search, Price Check, and Punch Clock) so they can execute floor transactions and customer lookups with minimal overhead.

**Why this priority**: Navigation shell is the essential operational backbone for all shop floor terminal modules; cashiers cannot access the checkout lane or shelf locator without it.

**Independent Test**: Can be tested independently by loading the `/staff` terminal shell and clicking each navigation tab (Fast-Lane POS, Stock & Shelf Finder, Model Fitment Search, Item Code Price Check, Punch Clock) to verify seamless view transition and active tab highlighting.

**Acceptance Scenarios**:

1. **Given** an authenticated staff member on `/staff`, **When** the staff navigation renders, **Then** it displays shop floor operation links:
   - **Fast-Lane POS** (`/staff/pos` or `/staff`)
   - **Stock & Shelf Finder** (`/staff/search`)
   - **Model Fitment Search** (`/staff/compat`)
   - **Item Code Price Check** (`/staff/pricecheck`)
   - **Punch Clock** (`/staff/clock`)
2. **Given** a staff user navigates to any staff sub-route (e.g., `/staff/search`), **When** the page renders, **Then** the corresponding menu tab is highlighted with active state tokens (`bg-primary text-white`), with instant client-side route transitions.
3. **Given** the Punch Clock navigation item, **When** rendered, **Then** it displays a live shift status pill badge (e.g., `ON SHIFT`).

---

### User Story 2 - Terminal Station & Live Shift Duration Topbar (Priority: P1)

Floor staff need real-time station awareness and active shift duration indicators at the top of their screen, plus an easy escalation button to access the Admin Portal or switch role.

**Why this priority**: Retail floor operations require persistent station ID awareness (e.g., Terminal #01) and real-time shift duration logging for accurate cashier shift accounting.

**Independent Test**: Can be tested independently by viewing the topbar on any staff route, confirming the active view title, active shift timer (`Active Shift: 04:12:30`), and testing the "Admin Portal Access" button.

**Acceptance Scenarios**:

1. **Given** a cashier on any staff view, **When** the topbar renders, **Then** it displays the current module title, live active shift duration counter, and an "Admin Portal Access" action button.
2. **Given** the staff clicks "Admin Portal Access", **When** triggered, **Then** a modal dialog or direct route allows navigation to `/admin` with appropriate credentials or role verification.

---

### User Story 3 - Staff User Profile & Session Logout (Priority: P2)

Staff members need to verify their logged-in employee identity and safely end their floor session or switch terminals when their shift concludes.

**Why this priority**: Shift handoffs and terminal security require cashiers to log out cleanly to prevent unauthorized transaction attribution.

**Independent Test**: Can be tested independently by viewing the staff sidebar footer with employee initials, name, and role (`Cashier / Floor Staff`), then clicking "Log Out Account" to return to `/login`.

**Acceptance Scenarios**:

1. **Given** an active staff session, **When** viewing the sidebar footer, **Then** it displays the user avatar initials, user name, and role description (`Cashier / Floor Staff`).
2. **Given** the user clicks "Log Out Account", **When** submitted, **Then** the session is cleared and the user is redirected to `/login`.

---

### User Story 4 - Responsive Mobile / Handheld Drawer (Priority: P3)

Mechanics and floor staff carrying mobile barcode scanners or handheld tablets require responsive navigation that collapses cleanly on smaller screens.

**Why this priority**: Enables floor mechanics walking through parts racks to access search tools and price checks on handheld devices.

**Independent Test**: Can be tested independently by resizing the viewport below 768px, clicking the mobile hamburger toggle to open the staff navigation drawer, and selecting a route.

**Acceptance Scenarios**:

1. **Given** a viewport width under 768px, **When** accessing `/staff`, **Then** the desktop sidebar collapses and a hamburger menu toggle button is visible in the topbar.
2. **Given** the mobile drawer is opened, **When** a link is clicked or the backdrop is tapped, **Then** the drawer closes and navigates to the selected route.

---

### Edge Cases

- **Direct URL Refresh**: Navigating directly to `/staff/clock` or `/staff/pricecheck` renders the layout shell with the correct active tab and matching topbar title on initial load without layout shifts.
- **Unauthenticated Route Guard**: Accessing `/staff/*` without staff authentication redirects to `/login`.
- **View Hierarchy & Overflow**: Terminal main content scrolls within `<div class="app-content">` while sidebar and topbar stay pinned.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated Staff Terminal layout shell matching the design in `mockup/staff.html` using SWIFT design tokens (`bg-bg-sidebar`, `bg-secondary`, `bg-primary`, etc.).
- **FR-002**: Sidebar MUST display brand header with "SWIFT" title and a distinct `STAFF` badge tag.
- **FR-003**: Sidebar navigation MUST provide dedicated links for:
  - Fast-Lane POS (`/staff/pos` / `/staff`)
  - Stock & Shelf Finder (`/staff/search`)
  - Model Fitment Search (`/staff/compat`)
  - Item Code Price Check (`/staff/pricecheck`)
  - Punch Clock (`/staff/clock`)
- **FR-004**: System MUST highlight the current active staff tab with high-contrast active styling (`bg-primary text-white`).
- **FR-005**: Topbar MUST display the active view title, active shift timer indicator (`Active Shift: HH:MM:SS`), and an "Admin Portal Access" action button.
- **FR-006**: Sidebar footer MUST display staff user avatar initials, employee name, role (`Cashier / Floor Staff`), and a functional "Log Out Account" action.
- **FR-007**: System MUST provide responsive drawer navigation on viewports under 768px with backdrop overlay dismissal.
- **FR-008**: All UI components MUST strictly follow the SWIFT design token system and maintain high contrast for shop floor readability.

### Key Entities *(include if feature involves data)*

- **Staff Navigation Item**:
  - `id`: String identifier (e.g. `pos`, `search`, `compat`, `pricecheck`, `clock`)
  - `label`: Display text (e.g. `Fast-Lane POS`)
  - `href`: Sub-route path
  - `badge`: Optional badge label (e.g. `ON SHIFT`)
  - `badgeVariant`: Optional badge tone (`success`, `warning`, `primary`)

- **Staff Shift State**:
  - `employeeName`: Active cashier / staff name
  - `role`: Role title
  - `terminalId`: Station identifier (e.g. `Terminal #01 - Shop Floor`)
  - `shiftStartTime`: Timestamp for active shift timer calculation
  - `isOnShift`: Boolean status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can transition between any floor tool (POS, Shelf Locator, Fitment, Price Check, Clock) in under 100ms without full page reload.
- **SC-002**: Navigation and topbar status indicators achieve 100% WCAG AA contrast compliance under harsh workshop lighting conditions.
- **SC-003**: 100% of staff sub-routes render within the responsive layout shell with pinned navigation and zero horizontal overflow.
- **SC-004**: Shift timer accurately displays running duration down to the second.

## Assumptions

- Staff users authenticate via `/login` and are assigned a cashier/staff role.
- Default shift timer simulates active shift duration starting from shift clock-in or session start.
- Sub-module placeholder views will render clear, styled module shells until downstream dedicated stories (SIAA-27, SIAA-28, SIAA-29, SIAA-31) are implemented.
