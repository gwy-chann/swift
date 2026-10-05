# Implementation Plan: Role-Based Authentication Hub & Login Switcher

**Branch**: `feat/SIAA-8-auth-hub-login-switcher` | **Date**: 2026-10-06 | **Spec**: [`specs/001-auth-hub-login-switcher/spec.md`](spec.md)

**Input**: Feature specification from `specs/001-auth-hub-login-switcher/spec.md`

## Summary

Implement the SWIFT Role-Based Authentication Hub & Login Switcher at `/login` (and `/` route handler). The feature provides an accessible, high-performance portal switcher allowing users to toggle between "Admin Portal" (routing to `/admin`) and "Staff Portal" (routing to `/staff/pos`), featuring one-click demo credential autofill ("Use Admin" and "Use Staff"), terminal mode preference persistence, and robust validation against Supabase SSR / session store without page reload glitches or hardcoded styles.

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16.3.8 App Router / React 19.2.8

**Primary Dependencies**: Next.js App Router, `@supabase/ssr` (v0.12.7), `@supabase/supabase-js` (v2.117.2), `lucide-react` (v1.52.0), Tailwind CSS v4

**Storage**: PostgreSQL (via Supabase / Prisma client), LocalStorage (`swift_terminal_role`) for client-side terminal role memory

**Testing**: Unit & contract validation via TypeScript type checks (`tsc --noEmit`), linting (`eslint`), and end-to-end browser walkthroughs

**Target Platform**: Web application (Desktop workshop terminals 1024x768+, responsive mobile / tablets)

**Project Type**: Next.js Full-Stack Web Application

**Performance Goals**: Instant role toggle transition (<50ms), sub-second auth feedback, zero layout shifts (CLS 0)

**Constraints**: Strict adherence to SWIFT semantic design tokens (`app/globals.css`, `lib/tokens.ts`); zero hardcoded colors; WCAG AA contrast compliance; zero hydration mismatch

**Scale/Scope**: Multi-user workshop operations (Admin, Cashier, Mechanic roles)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Assessment | Status |
| :--- | :--- | :--- | :---: |
| **I. Semantic Design Tokens** | All UI surfaces, inputs, buttons, and badges must use `bg-bg-card`, `bg-bg-input`, `border-border`, `bg-primary`, `bg-secondary`, `text-text-primary`, etc. | Verified. Full compliance with `app/globals.css` and `lib/tokens.ts`. | **PASS** |
| **II. Single Source of Truth** | Layout, typography, demo credentials, and interactions must replicate `mockup/index.html` & `docs/features.md`. | Verified. Component hierarchy directly derives from `mockup/index.html`. | **PASS** |
| **III. Type-Safe Data Architecture** | Authentication payloads, session state, and role types must be strictly typed in TypeScript. | Verified. Explicit schemas defined in `data-model.md` and `contracts/`. | **PASS** |
| **IV. Test-First Quality** | Validation and auth redirection workflows must be testable via deterministic contracts and scenarios. | Verified. Comprehensive quickstart and unit acceptance criteria defined. | **PASS** |
| **V. Server-First & Accessibility** | Semantic HTML (`<form>`, `<button>`, `<label>`), full keyboard navigation, and WCAG AA contrast. | Verified. ARIA attributes, semantic form structures, and keyboard handlers included. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-hub-login-switcher/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research and architecture decisions (Phase 0)
├── data-model.md        # Domain entities, session structures, and validation rules (Phase 1)
├── quickstart.md        # End-to-end verification and testing guide (Phase 1)
├── contracts/           # UI and Server Action interface contracts (Phase 1)
│   └── auth-hub-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Implementation tasks (Phase 2 output via /speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── (auth)/
│   └── login/
│       └── page.tsx              # Role-based login hub page component
├── globals.css                   # Tailwind v4 semantic tokens & global theme variables
└── layout.tsx                    # Root layout wrapping application

components/
└── auth/
    ├── auth-card.tsx             # Interactive login container with role tabs & demo box
    ├── role-tab-switcher.tsx     # Animated/accessible Admin vs. Staff tab selector
    ├── login-form.tsx            # Form handling email/password, validation & submit
    └── demo-credentials-box.tsx  # Quick-fill demo accounts trigger box

lib/
├── auth/
│   ├── types.ts                  # Auth, role, and credential TypeScript types
│   └── actions.ts                # Server action / authentication handler
├── supabase/
│   ├── client.ts                 # Browser Supabase client
│   └── server.ts                 # Server-side Supabase client
└── tokens.ts                     # Single source of truth for design tokens
```

**Structure Decision**: Standard Next.js App Router route group `(auth)/login` paired with modular, isolated components under `components/auth/` and strongly typed helpers under `lib/auth/`.

## Complexity Tracking

> *Constitution Check passed with zero violations. No complexity exemptions required.*
