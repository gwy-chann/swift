# Technical Research: Staff Shop Floor Terminal Layout Shell

## 1. Context & Architectural Requirements

The Staff Shop Floor Terminal Layout Shell (`/staff/*`) serves as the core operational interface for cashiers, counter clerks, and mechanics in the retail motorcycle parts shop. Unlike the managerial Admin Portal, the staff terminal focuses on:
- High-contrast, glare-resistant readability on POS monitors and shop-floor tablets.
- Fast, low-friction navigation between checkout, inventory locating, fitment compatibility search, price checking, and punch clock.
- Immediate operational status: active shift duration counter, station ID, and quick access to managerial elevation or logout.

## 2. Component Design & Patterns

### 2.1 Route & Layout Hierarchy
- `/staff/layout.tsx`: Root shell wrapping all `/staff/*` sub-routes with `<StaffLayoutShell>`.
- Sidebar width: 230px fixed width on desktop (matching `mockup/staff.html`).
- Brand header: SWIFT logo + `STAFF` badge pill in secondary brand token (`bg-secondary text-white`).
- Menu items:
  - `Fast-Lane POS` (`/staff/pos` or `/staff`)
  - `Stock & Shelf Finder` (`/staff/search`)
  - `Model Fitment Search` (`/staff/compat`)
  - `Item Code Price Check` (`/staff/pricecheck`)
  - `Punch Clock` (`/staff/clock` with `ON SHIFT` badge)

### 2.2 Shift Duration Timer Engine
- Renders the active shift time elapsed (e.g. `04:12:30`).
- Implemented as a lightweight client component using `setInterval` with 1-second ticks, resilient against hydration mismatches by mounting on client.
- Calculates elapsed time from cookie/localStorage/mock initial timestamp with fallback.

### 2.3 Admin Portal Switch Modal
- Provides seamless navigation from shop floor terminal to Admin Portal (`/admin`).
- Allows entering admin PIN / password or direct role navigation if already authorized.

### 2.4 Mobile Drawer (< 768px)
- Responsive drawer utilizing backdrop overlay for mobile barcode scanners and workshop floor tablets.
