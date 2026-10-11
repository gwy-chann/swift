# Technical Research & Architectural Decisions: Authenticated Session Route Guards & Login Redirects

**Feature**: Authenticated Session Route Guards & Login Redirects ([SIAA-71](https://the-three-devsketeers.atlassian.net/browse/SIAA-71))
**Parent Epic**: Foundation, Authentication Hub & App Shell ([SIAA-1](https://the-three-devsketeers.atlassian.net/browse/SIAA-1))
**Status**: Completed

---

## 1. Next.js 16 Request Proxy / Middleware Boundary

### Decision
Implement route interception in `proxy.ts` and `lib/supabase/middleware.ts` using Next.js 16 canonical proxy convention (`export async function proxy(request: NextRequest)`).
Extract pure evaluation logic into `@/lib/auth/session-guards.ts` for clean testability and reuse across both proxy and server components.

### Rationale
- **Next.js 16 Proxy Convention**: Next.js 16 renamed `middleware.ts` to `proxy.ts` (`export async function proxy(request)`). Next.js request proxies run prior to page rendering, allowing instant HTTP 307/308 redirects before any React Server Components execute.
- **Single Source of Truth**: By creating a pure evaluation function `evaluateRouteAccess({ pathname, role, isAuthenticated })`, the logic can be thoroughly unit tested with Node's native test runner (`node --test`) without mocking complex Next.js HTTP server internals.
- **Fast Response**: Redirects emitted directly from `NextResponse.redirect(new URL(destination, request.url))` bypass server component rendering, reducing latency and completely preventing login card UI flashes.

### Alternatives Considered
- *Client-Side `useEffect` Redirects in `<AuthCard />`*: Causes noticeable UI flash/flicker of the login screen before routing to `/admin` or `/staff/pos`. Violates seamless UX requirements and Constitution Principle V.
- *Separate Middleware & Server Component Logic*: Duplicating route matching rules in both `proxy.ts` and `layout.tsx` leads to synchronization drift.

---

## 2. Dual-Mode Authentication Resolution (Demo Accounts & Supabase SSR)

### Decision
Support both authentication modes through a unified session resolver:
1. **Live Supabase Auth**: Evaluated via `await supabase.auth.getUser()`. If a valid user is returned, extract role from user metadata or fallback to `swift-session-role` cookie.
2. **Demo Account Evaluation**: When Supabase is unconfigured or user authenticated with demo credentials (`admin@swift.local` / `cashier@swift.local`), the `swift-session-role` HTTP-only cookie (`admin` | `staff`) establishes session presence and authority.
3. **Session Invalidation**: If neither a valid Supabase user nor a recognized `swift-session-role` cookie exists, request is deemed unauthenticated.

### Rationale
- **Development & Demo Continuity**: The SWIFT system requires immediate offline demo capability for testing and evaluations without mandatory live Supabase connection strings.
- **Security Parity**: Both mechanisms issue HTTP-only `swift-session-role` cookies with appropriate `SameSite=lax` policies, ensuring consistent behavior across all deployment tiers.

---

## 3. Defense-in-Depth Layering

### Decision
Implement a two-tier defense-in-depth model:
- **Tier 1 (Proxy Layer - `proxy.ts` / `lib/supabase/middleware.ts`)**: Global edge gateway protecting the entire routing tree and handling instant redirects.
- **Tier 2 (Server Component Entry Points - `app/page.tsx`, `app/(auth)/login/page.tsx`, `app/admin/layout.tsx`, `app/staff/layout.tsx`)**: Server-side validation inspecting `cookies()` and redirecting if Tier 1 was bypassed or in direct component invocation.

### Rationale
- Defends against proxy misconfigurations, non-matched routes, or environment edge cases.
- Ensures zero unauthorized data leakage from server layouts even if proxy header rewriting encounters upstream proxies.

---

## 4. Route Classification & Access Matrix

| Path Pattern | Classification | Unauthenticated | Authenticated (`admin`) | Authenticated (`staff`) |
| :--- | :--- | :--- | :--- | :--- |
| `/` or `/login` | `AUTH_HUB` | **ALLOW** (render login) | **REDIRECT** ➔ `/admin` | **REDIRECT** ➔ `/staff/pos` |
| `/admin` or `/admin/*` | `ADMIN_PORTAL` | **REDIRECT** ➔ `/` | **ALLOW** | **REDIRECT** ➔ `/staff/pos` |
| `/staff` or `/staff/*` | `STAFF_PORTAL` | **REDIRECT** ➔ `/` | **ALLOW** (supervisor access) | **ALLOW** |
| `/_next/*`, static, media | `PUBLIC_ASSET` | **ALLOW** | **ALLOW** | **ALLOW** |
