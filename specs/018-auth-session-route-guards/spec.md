# Feature Specification: Authenticated Session Route Guards & Login Redirects

**Feature Branch**: `fix/SIAA-71-auth-session-route-guards`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "BUG: Authenticated Users Able to Revisit Login Page Due to Missing Session Route Guards (Jira: SIAA-71). Authenticated users navigating to / or /login should be redirected to their role portal (/admin or /staff/pos). Unauthenticated users navigating to /admin/* or /staff/* must be redirected to /."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticated User Redirection from Login Entry Points (Priority: P1)

As an authenticated shop employee (Admin, Cashier, or Mechanic),
When I navigate to the root login entry point (`/` or `/login`),
I want the application to automatically recognize my active session and redirect me to my dedicated portal,
So that I do not encounter redundant login prompts or get confused about my current session state.

**Why this priority**: Preventing logged-in users from seeing login forms eliminates credential confusion, avoids duplicate logins, and secures the session boundary.

**Independent Test**: Can be tested independently by logging in with either an Administrator (`admin@swift.local` / `swift-session-role=admin`) or Staff (`cashier@swift.local` / `swift-session-role=staff`) account, then manually navigating to `http://localhost:3000/` or `http://localhost:3000/login`. The system must immediately perform an HTTP 307/308 redirect to `/admin` or `/staff/pos` respectively without rendering the login card.

**Acceptance Scenarios**:

1. **Given** an Administrator is authenticated with an active session (`swift-session-role=admin` or valid Supabase session with admin role),
   **When** they navigate to `/` or `/login`,
   **Then** the application immediately redirects them to `/admin` without flashing or rendering `<AuthCard />`.
2. **Given** a Staff member is authenticated with an active session (`swift-session-role=staff` or valid Supabase session with staff role),
   **When** they navigate to `/` or `/login`,
   **Then** the application immediately redirects them to `/staff/pos` without flashing or rendering `<AuthCard />`.

---

### User Story 2 - Unauthenticated Visitor Route Protection (Priority: P1)

As a security auditor and system administrator,
When an unauthenticated visitor attempts to directly navigate to protected portal routes (`/admin`, `/admin/*`, `/staff`, `/staff/*`),
I want the application to block access and redirect them to the Authentication Hub (`/`),
So that confidential workshop metrics, parts catalogs, stock adjustments, and POS cash terminals cannot be viewed or manipulated by unauthorized users.

**Why this priority**: Foundational security posture; unauthenticated guests must never reach management dashboards or shop floor POS terminals.

**Independent Test**: Can be tested independently by clearing all browser cookies and local storage, then attempting to visit `/admin`, `/admin/inventory`, `/staff/pos`, or `/staff/locator`. The system must immediately intercept the request and redirect to `/`.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor with no active session or role cookies,
   **When** they attempt to load `/admin` or any subroute `/admin/:path*`,
   **Then** the application redirects the user to `/`.
2. **Given** an unauthenticated visitor with no active session or role cookies,
   **When** they attempt to load `/staff` or any subroute `/staff/:path*`,
   **Then** the application redirects the user to `/`.

---

### User Story 3 - Role-Based Portal Isolation (Priority: P2)

As a workshop owner,
When an authenticated Staff member attempts to access administrative pages (`/admin` or `/admin/*`),
I want the system to enforce strict role isolation and redirect the user back to their authorized Staff portal (`/staff/pos`),
So that store cashiers and apprentice mechanics cannot access financial reports, markup formulas, or administrative settings.

**Why this priority**: Enforces principle of least privilege between shop floor staff and back-office managerial functions.

**Independent Test**: Can be tested independently by logging in as Staff (`cashier@swift.local`), then manually navigating to `/admin` or `/admin/reports`. The system redirects the user to `/staff/pos`.

**Acceptance Scenarios**:

1. **Given** an authenticated user with `staff` role (`swift-session-role=staff`),
   **When** they attempt to navigate to `/admin` or any child route under `/admin/*`,
   **Then** the system denies access and redirects them to `/staff/pos`.
2. **Given** an authenticated user with `admin` role (`swift-session-role=admin`),
   **When** they navigate to `/staff` or `/staff/*`,
   **Then** the system permits access to the staff tools for managerial supervision or testing.

---

### User Story 4 - Session Cleared on Explicit Logout (Priority: P3)

As a shop employee ending a shift or switching terminals,
When I click "Log Out Account" in either the Admin or Staff portal header/nav,
I want my session cookies and tokens to be purged completely and to be redirected back to the login page,
So that subsequent visitors to that terminal are presented with a clean login screen and cannot access my account.

**Why this priority**: Essential session lifecycle hygiene for shared shop floor hardware terminals.

**Independent Test**: Can be tested independently by clicking "Log Out" in the Admin or Staff portal, observing cookie clearance, and verifying that navigating back to `/admin` or `/staff/pos` redirects back to `/`.

**Acceptance Scenarios**:

1. **Given** an authenticated user in `/admin` or `/staff/pos`,
   **When** they trigger `logoutAction()`,
   **Then** the Supabase session is signed out, `swift-session-role` and `swift-user-name` cookies are deleted, and the browser is redirected to `/` where `<AuthCard />` is rendered.
2. **Given** a user has logged out,
   **When** they click browser "Back" or enter `/admin` in the URL bar,
   **Then** the system detects no active session and redirects them to `/`.

---

### Edge Cases

- **Mixed / Out-of-Sync Sessions**: A browser has a stale `swift-session-role` cookie while the Supabase session is expired or revoked. Resolution: The guard prioritizes Supabase authentication when Supabase is configured; for demo accounts, the valid `swift-session-role` cookie (`admin` | `staff`) is respected.
- **Root Page Server-Side Fallback**: If middleware/proxy is bypassed or running in environments where Edge proxy headers differ, `app/page.tsx` and `app/(auth)/login/page.tsx` must implement defense-in-depth server-side checks and call `redirect()` before rendering the login card.
- **Public Assets & API Routes Exemption**: Static assets (`_next/static`, `_next/image`, `favicon.ico`, media files) and public auth APIs must never trigger redirection loops.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST intercept incoming requests at the proxy/middleware layer (`proxy.ts` / `lib/supabase/middleware.ts`) and classify routes into Public/Auth (`/`, `/login`), Admin Protected (`/admin`, `/admin/*`), and Staff Protected (`/staff`, `/staff/*`).
- **FR-002**: System MUST inspect both the `swift-session-role` cookie and Supabase session state (`supabase.auth.getUser()`) to determine authentication status and user role (`admin` vs. `staff`).
- **FR-003**: System MUST automatically redirect authenticated users attempting to access `/` or `/login` to `/admin` (for role `admin`) or `/staff/pos` (for role `staff`).
- **FR-004**: System MUST automatically redirect unauthenticated users attempting to access `/admin/*` or `/staff/*` to `/`.
- **FR-005**: System MUST enforce role boundary isolation, redirecting users with role `staff` attempting to access `/admin/*` back to `/staff/pos`.
- **FR-006**: System MUST implement defense-in-depth in `app/page.tsx` and `app/(auth)/login/page.tsx` by inspecting cookies via Next.js `cookies()` and redirecting authenticated users server-side.
- **FR-007**: System MUST provide deterministic unit test coverage for the route guard decision engine to verify all permutations of authentication states, roles, and target paths.

### Key Entities

- **SessionRole**: Allowed role identifiers: `"admin" | "staff"`.
- **RouteAccessClassification**: Route category: `"AUTH_HUB" | "ADMIN_PORTAL" | "STAFF_PORTAL" | "PUBLIC_ASSET"`.
- **GuardDecision**: Guard outcome: `{ action: "ALLOW" | "REDIRECT"; destination?: string }`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of requests from authenticated users hitting `/` or `/login` are redirected to their authorized portal without ever rendering `<AuthCard />`.
- **SC-002**: 100% of unauthenticated requests to `/admin/*` or `/staff/*` are intercepted and redirected to `/`.
- **SC-003**: 0% regression in existing 80 unit tests; new dedicated test suite verifies all guard matrix permutations.
- **SC-004**: Zero flicker or flash of unauthenticated login card during authenticated navigation.

---

## Assumptions

- Demo accounts utilize `swift-session-role` (`admin` | `staff`) cookie storage as defined in SIAA-8 and `lib/auth/actions.ts`.
- Live Supabase accounts store Supabase SSR auth cookies alongside `swift-session-role`.
- Admin users have supervisory privileges and can inspect the Staff portal if needed, but Staff users are strictly blocked from `/admin/*`.
- Next.js 16 App Router `proxy.ts` (or middleware) is the primary line of defense, augmented by server-component checks in `app/page.tsx`.
