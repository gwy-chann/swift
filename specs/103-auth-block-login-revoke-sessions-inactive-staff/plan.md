# Implementation Plan: Immediate Auth Blocking & Session Revocation for Inactive Staff Accounts (SIAA-103)

**Branch**: `feat/SIAA-103-auth-block-login-revoke-sessions-inactive-staff` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/103-auth-block-login-revoke-sessions-inactive-staff/spec.md`

## Summary

Implement immediate authentication blocking and active session eviction for inactive staff members. When an account is marked `Inactive`:
1. Login attempts (via email/password or 4-digit PIN) are rejected with error code `ACCOUNT_INACTIVE` and message *"Account is inactive. Please contact your workshop administrator."*
2. Active sessions on any terminal or client are terminated upon the very next request or page transition, clearing cookies and redirecting to the login screen with an accessible warning banner.
3. Administrator deactivation actions trigger backend session revocation and security audit logging.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Next.js 16.3.8 (App Router), React 19, `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `lucide-react`  
**Storage**: PostgreSQL (`public.profiles`, `auth.users`), browser cookies (`swift-session-*`), in-memory fallback cache  
**Testing**: Node.js built-in test runner (`node --experimental-strip-types --test`)  
**Target Platform**: Desktop POS terminals, shop floor kiosks, modern web browsers  
**Performance Goals**: Auth status validation < 50ms, session eviction in 1 round-trip  
**Constraints**: Zero hardcoded colors (strict SWIFT semantic design tokens), WCAG AA compliance, zero test regressions  

## Constitution Check

- [x] **Principle I: Semantic Design Tokens & Zero Hardcoded Colors**: All warning banners and notification components use `var(--destructive)` and semantic borders (`border-destructive/30`). Zero hex or arbitrary Tailwind color classes.
- [x] **Principle II: Single Source of Truth & Specification Fidelity**: Adheres strictly to Jira SIAA-103 acceptance criteria text and flow.
- [x] **Principle III: Type-Safe Data Architecture & Domain Integrity**: Strict Zod contracts and TypeScript definitions across `AuthResult`, `VerifyStaffPinResult`, and `ResolvedSession`.
- [x] **Principle IV: Test-First Quality & Contract Verification**: Unit and integration test suites covering active vs inactive logins, PIN attempts, route guard redirects, and session cookie clearance.
- [x] **Principle V: Server-First Performance & Accessibility Standards**: Server actions and server layout guards handle session evaluation without client-side waterfalls. Accessible alert banners with ARIA attributes.

## Project Structure

### Documentation & Specs (this feature)
```text
specs/103-auth-block-login-revoke-sessions-inactive-staff/
├── spec.md              # User stories & Gherkin acceptance criteria
├── research.md          # Stack constraints & architectural decisions
├── data-model.md        # State machine & entity contracts
├── contracts/
│   └── inactive-auth-contracts.ts # Zod contracts & error constants
├── checklists/
│   └── requirements.md  # Quality validation checklist
├── plan.md              # Implementation plan (this document)
├── quickstart.md        # Verification walkthrough guide
└── tasks.md             # Dependency-ordered tasks
```

### Affected Source Code Layout
```text
lib/
├── auth/
│   ├── actions.ts           # authenticateUserAction - inactive status check & rejection
│   ├── session-guards.ts    # getServerSession & evaluateRouteAccess - inactive check & cookie purge
│   ├── types.ts             # AuthResult & ResolvedSession types with ACCOUNT_INACTIVE code
│   └── __tests__/
│       ├── inactive-account-guard.test.ts  # Inactive login rejection tests
│       └── session-revocation.test.ts      # Active session eviction tests
├── staff/
│   ├── actions.ts           # verifyStaffPinAction - inactive staff PIN rejection
│   └── __tests__/
│       └── inactive-staff-pin.test.ts      # Inactive PIN rejection tests
├── admin/
│   ├── user-actions.ts      # toggleUserStatusAction - session revocation & audit event
│   └── __tests__/
│       └── user-deactivation-revocation.test.ts # Status toggle & revocation tests
components/
└── auth/
    └── login-form.tsx       # Notice banner handling (?notice=inactive)
app/
└── (auth)/login/
    └── page.tsx            # Login page passing query params to login-form
```

## Complexity Tracking

No constitution violations detected. Standard Next.js server actions and cookie manipulation patterns are leveraged.
