# Technical Research & Architectural Decisions: Admin Portal Shell

**Feature**: Admin Portal Navigation Shell & Collapsible Sidebar ([SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9))
**Status**: Completed

## 1. Next.js App Router Layout Architecture

### Decision
Implement the admin layout inside `app/admin/layout.tsx` using a nested layout pattern.
- The sidebar (`AdminSidebar`) and topbar (`AdminTopbar`) are mounted at the layout level.
- Nested sub-routes (`/admin`, `/admin/inventory`, `/admin/pos`, etc.) render inside the `<main class="app-content">` viewport.

### Rationale
- **Zero Re-rendering of Navigation**: Preserves sidebar scroll position, topbar connection state, and avoids unnecessary re-mounts when transitioning between administrative modules.
- **Instant Client-Side Navigation**: Next.js App Router pre-fetches sub-routes, allowing instant (<100ms) page switches.

### Alternatives Considered
- *Per-page layout wrappers*: Leads to layout flicker on navigation and code duplication across 8 admin pages.
- *Single-page conditional view renderer (`useState('currentView')`)*: Violates URL deep-linking and browser back/forward navigation.

---

## 2. Active Route Highlighting & Dynamic Title Resolution

### Decision
Use Next.js `usePathname()` in a client-side navigation component to match the active route against the centralized menu registry (`lib/admin/navigation.ts`).
- Exact match for `/admin` (Dashboard).
- Prefix matching for sub-routes (e.g. `/admin/inventory` matches `/admin/inventory/*`).

### Rationale
- Guarantees immediate, accurate active pill highlighting on both client-side route clicks and direct browser URL entries/bookmarks.
- Provides a centralized helper `getAdminViewTitle(pathname)` to dynamically update the topbar title without prop drilling.

### Alternatives Considered
- *Hardcoded state in topbar*: Fails when navigating via browser back/forward buttons or direct bookmarks.

---

## 3. Responsive Drawer & Mobile Viewport Strategy

### Decision
Implement an adaptive layout:
- **Desktop (≥ 768px)**: Fixed 260px dark sidebar (`bg-bg-sidebar`) on the left, sticky topbar on top, scrollable content area on the right.
- **Mobile / Tablet (< 768px)**: Desktop sidebar hidden (`hidden md:flex`), hamburger menu button visible in the topbar, opening an accessible slide-out drawer with a backdrop overlay (`bg-black/50`).

### Rationale
- Fully replicates the responsive interaction standards defined in `mockup/style.css` while maintaining touch-friendly hit targets (minimum 44x44px).
- Closing triggers on backdrop tap, close button click, and automatic dismissal on route change.

---

## 4. Design Token Compliance & Theming Strategy

### Decision
Adhere strictly to the SWIFT color tokens:
- Sidebar Background: `bg-bg-sidebar` (Dark Slate `#0f172a` / `#070b14`)
- Sidebar Category Headings: `text-text-muted` uppercase tracking
- Inactive Nav Item: `text-text-light/80 hover:bg-bg-sidebar-hover hover:text-white`
- Active Nav Item: `bg-primary text-white font-bold`
- Notification Badge (Low Stock): `bg-danger text-white`
- Topbar Background: `bg-bg-surface border-border`
- Content Workspace: `bg-bg-base`

### Rationale
- Fulfills Constitution Principle I (Zero hardcoded colors).
- Preserves the authoritative visual style from `mockup/admin.html` and `mockup/style.css`.
