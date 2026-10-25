# Technical Research & Architecture Decisions: SIAA-103 Inactive Staff Auth Blocking & Session Revocation

**Feature**: Immediate Auth Blocking & Session Revocation for Inactive Staff Accounts  
**Branch**: `feat/SIAA-103-auth-block-login-revoke-sessions-inactive-staff`  
**Date**: 2026-10-26  

---

## 1. Stack & System Constraints

- **Framework**: Next.js 16.3.8 (App Router), React 19, Node.js 20+
- **Styling**: Tailwind CSS v4 with semantic tokens in `app/globals.css` and `lib/tokens.ts` (strictly zero hardcoded colors)
- **Database & Auth**: PostgreSQL managed via Supabase (SSR client `@supabase/ssr`, `auth.users`, `public.profiles`), Prisma ORM
- **Authentication Flows**:
  1. *Email/Password Login*: Authenticates against `supabase.auth.signInWithPassword` with demo account fallback (`DEMO_ACCOUNTS`)
  2. *Terminal Kiosk PIN Login*: 4-digit PIN verification against `public.profiles(pin_code)` with fallback to `DEFAULT_DEMO_PINS`
  3. *Session Management*: Cookie-based session tracking (`swift-session-role`, `swift-user-name`, `swift-session-user-id`, `swift_admin_elevated`)
  4. *Route Protection*: `getServerSession()` & `evaluateRouteAccess()` evaluated in layout shells (`app/staff/layout.tsx`, `app/admin/layout.tsx`)

---

## 2. Key Architecture Challenges & Solutions

### Challenge 1: Inactive Account Login Gate
**Current State**:
- `authenticateUserAction` in `lib/auth/actions.ts` verifies email and password against Supabase Auth (or demo credentials) but does not inspect the `status` column in `public.profiles` or `memoryStaffUsers`.
- `verifyStaffPinAction` in `lib/staff/actions.ts` checks the PIN but does not reject when `data.status === 'Inactive'`.

**Architectural Solution**:
- Inject an explicit profile status lookup immediately after credential verification in both `authenticateUserAction` and `verifyStaffPinAction`.
- If `status === 'Inactive'` or `status === 'Suspended'`:
  - Prohibit cookie generation.
  - Return early with:
    ```typescript
    {
      success: false,
      code: 'ACCOUNT_INACTIVE',
      error: 'Account is inactive. Please contact your workshop administrator.',
    }
    ```
  - Log security event: `INACTIVE_ACCOUNT_LOGIN_REJECTED`.

### Challenge 2: Immediate Invalidation of Active Sessions
**Current State**:
- When an administrator deactivates an employee via `toggleUserStatusAction`, the database record is updated to `'Inactive'`.
- However, if that employee already holds valid session cookies on another terminal, `getServerSession()` trusts the cookies until expiry or until the next full re-auth.

**Architectural Solution**:
- In `toggleUserStatusAction`:
  1. Update `profiles.status = 'Inactive'`.
  2. Call Supabase Admin Auth: `supabaseAdmin.auth.admin.signOut(userId, 'all')` to revoke all active JWT refresh tokens on the backend.
  3. Register the deactivated user ID in an active session revocation registry (in-memory + database audit timestamp).
- In `getServerSession()` (`lib/auth/session-guards.ts`):
  1. Retrieve the session user ID (`swift-session-user-id` cookie or Supabase `auth.getUser()`).
  2. Validate current status from `public.profiles` (or `memoryStaffUsers` in offline mode).
  3. If status is `'Inactive'`:
     - Return `{ isAuthenticated: false, role: null, source: 'none', isInactive: true }`.
     - Purge session cookies immediately via `cookieStore.delete()`.
- In `evaluateRouteAccess()`:
  - If `session.isInactive`:
    - Return `{ action: 'REDIRECT', destination: '/login?notice=inactive', statusCode: 307 }`.

### Challenge 3: Login View Alert Banner & Accessibility
**Current State**:
- `components/auth/login-form.tsx` displays form inputs and general error banners.
- Needs to parse `notice=inactive` or `error=ACCOUNT_INACTIVE` from query params and render a high-visibility, accessible banner.

**Architectural Solution**:
- Update `components/auth/login-form.tsx` and `app/(auth)/login/page.tsx` to handle `notice=inactive`.
- Display:
  - Alert icon (`AlertTriangle` from `lucide-react`)
  - Title: *"Access Denied"*
  - Description: *"Account is inactive. Please contact your workshop administrator."*
  - Semantic styling: `bg-destructive/15 text-destructive border border-destructive/30 rounded-xl p-4` (pure semantic tokens, no hardcoded colors).

---

## 3. Test & Verification Strategy

1. **Unit Tests**:
   - `lib/auth/__tests__/inactive-account-guard.test.ts`: Test `authenticateUserAction` with active vs inactive accounts, verifying rejection code `ACCOUNT_INACTIVE` and exact error string.
   - `lib/staff/__tests__/inactive-staff-pin.test.ts`: Test `verifyStaffPinAction` rejects inactive staff PINs.
   - `lib/auth/__tests__/session-revocation.test.ts`: Test `getServerSession()` and `evaluateRouteAccess()` correctly detect inactive status and trigger redirect to `/login?notice=inactive`.
   - `lib/admin/__tests__/user-deactivation-revocation.test.ts`: Test `toggleUserStatusAction` invokes session sign-out and updates status cleanly.
2. **Regression Verification**:
   - Run full test suite (`npm test`) across all 94+ existing suites to ensure 100% pass rate.
   - Validate TypeScript compilation (`npx tsc --noEmit`).
   - Validate ESLint (`npm run lint`).
