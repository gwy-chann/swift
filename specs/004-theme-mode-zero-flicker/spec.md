# Feature Specification: Global Light/Dark Theme Mode with Zero-Hydration-Flicker Persistence

**Feature Branch**: `feat/SIAA-11-theme-mode-persistence`

**Created**: 2026-10-07

**Status**: Ready for Planning

**Input**: User description: "STORY-1.4: Global Light/Dark Theme Mode with Zero-Hydration-Flicker Persistence (Jira: SIAA-11). As a SWIFT user, I want the application to default to the Clean Slate & Steel Blue light theme with an accessible dark mode toggle, so that the interface remains comfortable and legible in bright retail shopfronts as well as dim garage repair bays."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Default Clean Slate & Steel Blue Light Mode Baseline (Priority: P1)

Users opening the SWIFT application for the first time or in a fresh browser session need the interface to load cleanly into the default Light Mode theme (`--bg-base: #f1f5f9`, `--bg-surface: #ffffff`, `--primary: #2563eb`) without unstyled flashes or dark overrides.

**Why this priority**: Establishes the foundational aesthetic baseline of SWIFT across all customer-facing, cashier floor, and administrative views.

**Independent Test**: Can be tested independently by clearing browser storage / opening an incognito session on any route (`/`, `/login`, `/admin`, `/staff`), confirming default light theme variables are applied and no `dark` class exists on `<html>`.

**Acceptance Scenarios**:

1. **Given** a new or unconfigured user session on any route (e.g. `/`, `/login`, `/admin`, `/staff`), **When** the page loads, **Then** `<html>` does not contain the `dark` class and renders with default Light Mode tokens (`--bg-base: #f1f5f9`, `--bg-surface: #ffffff`, `--primary: #2563eb`).
2. **Given** a fresh session, **When** examining the `<ThemeToggle />` component, **Then** it reflects the "Light Mode" active state with appropriate iconography and accessibility labeling.

---

### User Story 2 - Instant Accessible Theme Toggling (Priority: P1)

Users and technicians working in different physical environments (e.g. well-lit retail counter vs. dim garage repair bay) need an instant, accessible button to toggle between Light and Dark themes across all portals.

**Why this priority**: Essential for visual ergonomic comfort and contrast adaptability for mechanics and cashiers in varying lighting environments.

**Independent Test**: Can be tested independently by clicking `<ThemeToggle />` on the Auth Hub, Admin Portal topbar, or Staff Terminal topbar, verifying that `dark` class and `data-theme="dark"` are instantly applied/removed on `<html>` and all tokenized UI surfaces adapt dynamically.

**Acceptance Scenarios**:

1. **Given** any page with the `<ThemeToggle />` component, **When** the user clicks the toggle button, **Then** the `dark` class and `data-theme="dark"` attribute are immediately applied to the root `<html>` element.
2. **Given** dark mode is activated, **When** inspecting UI components (buttons, cards, tables, sidebars, topbars), **Then** all semantic tokens switch to obsidian dark slate values (`--bg-base: #0f172a`, `--bg-surface: #1e293b`, `--text-primary: #f8fafc`).
3. **Given** a user triggers the toggle again, **When** clicked, **Then** the application returns cleanly to Light Mode.

---

### User Story 3 - Zero-Hydration-Flicker & Cross-Tab Persistence (Priority: P1)

Users who choose Dark Mode expect their preference to persist across page reloads, client-side route transitions, and multi-tab sessions without visual white flashes (FOUC) or React hydration mismatch warnings.

**Why this priority**: Flash of unstyled content (FOUC) and hydration mismatches severely degrade user experience, cause visual jarring, and compromise perceived application quality.

**Independent Test**: Can be tested independently by setting Dark Mode, refreshing the page (`F5`), opening a new tab, and observing that the page renders in dark slate immediately without any intermediate white screen flash or console hydration warnings.

**Acceptance Scenarios**:

1. **Given** the user has toggled the theme to "dark", **When** they hard-reload the page or navigate across routes, **Then** the dark theme persists seamlessly from `localStorage` (`swift-theme`) with zero millisecond white flash before first paint.
2. **Given** a Next.js server-rendered page load, **When** the client mounts, **Then** React hydration completes with zero hydration mismatch warnings or layout shifts.
3. **Given** multiple open tabs of the SWIFT application, **When** the theme is toggled in one tab, **Then** all other open tabs synchronize their active theme state in real-time.

---

### Edge Cases

- **JavaScript Disabled / SSR Fallback**: If JavaScript is disabled or fails to execute, the page renders reliably in default Light Mode without broken layouts.
- **Corrupted or Invalid `localStorage` Key**: If `localStorage.getItem('swift-theme')` contains unexpected values (e.g. random string or null), the system gracefully falls back to `light` mode.
- **System Preference / Future OS Sync**: The theme system supports explicit user selection as the supreme preference while cleanly structured to support system media queries (`prefers-color-scheme`) if needed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST default to the Clean Slate & Steel Blue light theme on fresh sessions.
- **FR-002**: System MUST provide an accessible `<ThemeToggle />` component featuring clear visual iconography (Sun/Moon), text labels, and ARIA attributes (`aria-label="Toggle theme"`).
- **FR-003**: Activating Dark Mode MUST apply the `.dark` class and `data-theme="dark"` attribute to the root `<html>` element.
- **FR-004**: System MUST synchronize semantic CSS variables between light and dark modes defined in `app/globals.css` and `lib/tokens.ts`.
- **FR-005**: System MUST inject an inline, blocking initialization script in `app/layout.tsx` before DOM paint to evaluate stored theme preferences and apply the `.dark` class to `document.documentElement` immediately, preventing Flash of Unstyled Content (FOUC).
- **FR-006**: Root `<html>` element in Next.js MUST specify `suppressHydrationWarning` to prevent React hydration warnings during theme attribute injection.
- **FR-007**: System MUST persist the selected theme mode (`"light"` | `"dark"`) in `localStorage` under the key `swift-theme`.
- **FR-008**: System MUST listen for cross-window / cross-tab `storage` events to ensure multi-tab theme consistency.

### Key Entities *(include if feature involves data)*

- **ThemeMode**:
  - Type: `"light" | "dark"`
  - Storage Key: `"swift-theme"`
  - Default: `"light"`
  - Root Class: `"dark"` (when active)
  - Root Attribute: `data-theme="dark" | data-theme="light"`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0ms visual flash of unstyled content (FOUC) on hard page refresh when in Dark Mode.
- **SC-002**: 0 React hydration mismatch warnings or runtime errors in the browser console across all routes.
- **SC-003**: 100% of all UI components (Auth, Admin, Staff, Modals, Tables, Charts) inherit valid semantic token variables in both Light and Dark modes.
- **SC-004**: Theme toggle responds to user click in < 16ms (1 frame transition).

## Assumptions

- Light mode is the canonical primary default for SWIFT as defined in the SWIFT design constitution.
- Modern browsers support `localStorage` and `classList` manipulation on `document.documentElement`.
- The theme toggle is available in topbars, navigation headers, and footer shells as required across user portals.
