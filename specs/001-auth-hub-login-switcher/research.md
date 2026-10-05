# Technical Research & Architectural Decisions: Role-Based Authentication Hub

**Feature**: Role-Based Authentication Hub & Login Switcher ([SIAA-8](https://the-three-devsketeers.atlassian.net/browse/SIAA-8))
**Status**: Completed

## 1. Authentication State Management & Routing Architecture

### Decision
Use a hybrid architecture:
- **Client Component Layer** (`components/auth/`): Manages instant reactive state (active tab `admin` | `staff`, form input values, loading spinner, client-side validation errors, demo autofill, and terminal remember toggle).
- **Server Action / SSR Handler** (`lib/auth/actions.ts`): Handles credential authentication using the Supabase SSR auth client, sets session cookies, and provides redirect targets (`/admin` for Admin vs. `/staff/pos` for Staff).

### Rationale
- **Instant UI Response**: Switching between "Admin Portal" and "Staff Portal" must feel instantaneous without any roundtrips or page reload lag.
- **Secure Cookie Sessions**: Setting session cookies through standard Next.js server actions or route handlers guarantees seamless integration with Supabase SSR session validation across downstream protected routes (`/admin/*` and `/staff/*`).
- **Resilience / Demo Mode Fallback**: When evaluating offline or in demo sandbox mode without live Supabase credentials, the system can gracefully authorize the mock accounts (`admin@swift.local` and `cashier@swift.local`) to ensure smooth usability and verification.

### Alternatives Considered
- *Full Client-Only Auth*: Avoids server action overhead, but makes server component protection (`middleware.ts` and Server Components in `/admin`) brittle and prone to hydration redirects.
- *Separate Login URLs (`/admin/login` and `/staff/login`)*: Rejected because the product specification ([`mockup/index.html`](../../mockup/index.html) and SIAA-8) specifically mandates a unified login hub with an interactive role switcher.

---

## 2. Zero-Hydration-Flicker Terminal Preference Persistence

### Decision
Persist the user's role choice under `localStorage.getItem("swift_terminal_role")` with a hydration-safe initializer pattern.

### Rationale
- Workshop terminals (e.g., POS terminal touchscreens) are dedicated workstations that should always boot into "Staff Portal" by default if remembered.
- In Next.js App Router, directly accessing `localStorage` during initial server render leads to React hydration mismatches. By utilizing a safe `useEffect` mount check or `useSyncExternalStore` with server fallback, the component hydrates cleanly without console errors or visual flashes.

### Alternatives Considered
- *Cookie-based Terminal Storage*: Requires cookie read on server, but adds unnecessary network header overhead for a client-side device preference.
- *URL Query Param (`?role=staff`)*: Requires bookmarked URLs rather than automatic local device memory.

---

## 3. Design Tokens & Styling Architecture

### Decision
Strictly use SWIFT semantic design tokens configured in [`app/globals.css`](../../app/globals.css) and [`lib/tokens.ts`](../../lib/tokens.ts).
- Card Container: `bg-bg-card`, `border-border`, `shadow-md`, `rounded-md`
- Active Admin Tab: `bg-primary`, `text-white`
- Active Staff Tab: `bg-secondary`, `text-white`
- Inputs: `bg-bg-input`, `border-border`, `text-text-primary`, `focus:border-primary`
- Action Button (Admin): `bg-primary`, `hover:bg-primary-hover`
- Action Button (Staff): `bg-secondary`, `hover:bg-secondary-hover`
- Demo Box: `bg-bg-muted`, `border-border-subtle`

### Rationale
- Direct fulfillment of Constitution Principle I (Zero hardcoded colors).
- Guarantees that light mode (clean slate & steel blue) and dark mode (obsidian & slate) adapt automatically through CSS custom properties.

### Alternatives Considered
- *Ad-hoc Tailwind classes (`bg-blue-600`, `bg-slate-700`)*: Strictly forbidden by the SWIFT Constitution.

---

## 4. Demo Accounts & Credential Specifications

### Decision
Standardize demo system accounts as defined in `mockup/index.html`:
- **Administrator**: `admin@swift.local` (Password: `admin123` / mock token) -> Redirects to `/admin`
- **Staff / Cashier**: `cashier@swift.local` (Password: `staff123` / mock token) -> Redirects to `/staff/pos`

### Rationale
- Matches the exact mock data in the existing mockup engine and Jira story requirements.
- Gives evaluators and developers instant one-click access to test both portals.
