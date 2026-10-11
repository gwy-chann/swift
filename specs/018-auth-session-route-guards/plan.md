# Implementation Plan: Authenticated Session Route Guards & Login Redirects

**Feature**: Authenticated Session Route Guards & Login Redirects ([SIAA-71](https://the-three-devsketeers.atlassian.net/browse/SIAA-71))
**Parent Epic**: Foundation, Authentication Hub & App Shell ([SIAA-1](https://the-three-devsketeers.atlassian.net/browse/SIAA-1))
**Status**: Draft

---

## 1. Architecture Overview & Boundary Mapping

```mermaid
flowchart TD
    Req[Incoming HTTP Request] --> Proxy[Next.js 16 proxy.ts]
    Proxy --> UpdateSession[lib/supabase/middleware.ts : updateSession]
    UpdateSession --> SupabaseAuth[supabase.auth.getUser]
    UpdateSession --> Eval[lib/auth/session-guards.ts : evaluateRouteAccess]

    Eval -->|Unauthenticated on /admin or /staff| RedirHome[NextResponse.redirect to /]
    Eval -->|Admin on / or /login| RedirAdmin[NextResponse.redirect to /admin]
    Eval -->|Staff on / or /login| RedirStaff[NextResponse.redirect to /staff/pos]
    Eval -->|Staff on /admin/*| RedirStaff2[NextResponse.redirect to /staff/pos]
    Eval -->|Authorized / Public| Allow[NextResponse.next]

    Allow --> PageEntry[Page / Layout Component]
    PageEntry --> CheckDefense[Server Component Defense Check]
    CheckDefense -->|Session active on /| ServerRedir[next/navigation redirect]
    CheckDefense -->|Render| PageUI[Render UI]
```

---

## 2. Component Hierarchy & Module Touchpoints

1. **`lib/auth/session-guards.ts`** (New Domain Logic Module):
   - `classifyRoute(pathname: string): RouteClassification`
   - `evaluateRouteAccess(pathname: string, session: ResolvedSession): GuardDecision`
   - `resolveSessionFromCookies(cookieStore)` & `resolveSession(supabaseUser, cookies)`
2. **`lib/auth/__tests__/session-guards.test.ts`** (New Unit Test Suite):
   - Comprehensive test cases covering all 12+ matrix combinations of route categories, roles, and auth states.
3. **`lib/supabase/middleware.ts` & `proxy.ts`** (Network Layer Integration):
   - Integrate `evaluateRouteAccess` directly inside `updateSession(request: NextRequest)`.
   - Issue `NextResponse.redirect(new URL(destination, request.url))` when a redirect decision is made, preserving updated session cookies on the redirect response.
4. **`app/page.tsx` & `app/(auth)/login/page.tsx`** (Server Component Defense-in-Depth):
   - Check `cookies()` on initial server render; if session exists, invoke `redirect("/admin")` or `redirect("/staff/pos")`.
5. **`app/admin/layout.tsx` & `app/staff/layout.tsx`** (Portal Layout Defense-in-Depth):
   - Check session cookies at the layout boundary and redirect unauthorized callers to `/`.

---

## 3. Implementation Phases & Gate Sequence

- **Phase A**: Domain Engine & Pure Guard Module (`lib/auth/session-guards.ts`)
- **Phase B**: Automated TDD Unit Tests (`lib/auth/__tests__/session-guards.test.ts`)
- **Phase C**: Edge Proxy Guard Integration (`lib/supabase/middleware.ts`, `proxy.ts`)
- **Phase D**: Server Component Defense-in-Depth (`app/page.tsx`, `app/(auth)/login/page.tsx`, layouts)
- **Phase E**: End-to-End Verification (`npm test`, `npx tsc --noEmit`, `npm run lint`)
