# Implementation Tasks: Role-Based Authentication Hub & Login Switcher

**Feature**: Role-Based Authentication Hub & Login Switcher ([SIAA-8](https://the-three-devsketeers.atlassian.net/browse/SIAA-8))
**Branch**: `feat/SIAA-8-auth-hub-login-switcher` | **Date**: 2026-10-06
**Specification**: [`specs/001-auth-hub-login-switcher/spec.md`](spec.md) | **Plan**: [`specs/001-auth-hub-login-switcher/plan.md`](plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish core TypeScript types, constants, and data definitions for authentication.

- [X] T001 Create auth type definitions, interfaces, and error codes in `lib/auth/types.ts`
- [X] T002 [P] Configure demo account constants and role routing metadata in `lib/auth/constants.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core authentication handler and client storage utilities required by all user stories.

**⚠️ CRITICAL**: No user story UI implementation can begin until this foundational phase is complete.

- [X] T003 Implement authentication action handler with Supabase SSR integration and session setting in `lib/auth/actions.ts`
- [X] T004 [P] Implement hydration-safe terminal role persistence helper in `lib/auth/storage.ts`

**Checkpoint**: Core auth schemas and storage utilities ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Administrator Portal Access (Priority: P1) 🎯 MVP

**Goal**: Enable workshop administrators to authenticate via the dedicated "Admin Portal" mode and redirect directly to `/admin`.

**Independent Test**: Navigate to `/login`, ensure "Admin Portal" tab is active, submit valid admin credentials, and verify immediate redirect to `/admin`.

### Implementation for User Story 1

- [X] T005 [P] [US1] Create accessible `RoleTabSwitcher` component styled with SWIFT semantic design tokens in `components/auth/role-tab-switcher.tsx`
- [X] T006 [US1] Create `LoginForm` component with email/password validation, admin submit action, and error alert rendering in `components/auth/login-form.tsx`
- [X] T007 [US1] Construct the `/login` authentication hub page layout with brand header and card wrapper in `app/(auth)/login/page.tsx`

**Checkpoint**: Administrator authentication flow is functional and testable independently.

---

## Phase 4: User Story 2 - Staff Shop Floor & Fast-Lane POS Access (Priority: P1)

**Goal**: Enable shop floor cashiers and mechanics to toggle into "Staff Portal" mode, view dynamic button labels, and authenticate directly into `/staff/pos`.

**Independent Test**: Select the "Staff Portal" tab on `/login`, authenticate with cashier credentials, and verify deterministic routing to `/staff/pos`.

### Implementation for User Story 2

- [X] T008 [US2] Implement dynamic staff button styling (`bg-secondary`), secondary tab highlighting, and `/staff/pos` redirect routing in `components/auth/login-form.tsx`
- [X] T009 [US2] Update application root entry route to intelligently route unauthenticated visits to `/login` in `app/page.tsx`

**Checkpoint**: Both Administrator and Staff Fast-Lane POS portals are independently accessible and routable.

---

## Phase 5: User Story 3 - Rapid Evaluation & Demo One-Click Credential Autofill (Priority: P2)

**Goal**: Provide one-click demo account buttons ("Use Admin" and "Use Staff") for rapid testing, evaluator demonstrations, and onboarding.

**Independent Test**: Click "Use Admin" or "Use Staff" in the demo credentials box; verify that the email input is filled and the corresponding role tab activates instantly.

### Implementation for User Story 3

- [X] T010 [P] [US3] Create `DemoCredentialsBox` component with structured account cues in `components/auth/demo-credentials-box.tsx`
- [X] T011 [US3] Integrate demo account click triggers to synchronously fill credentials and switch active role tab in `components/auth/auth-card.tsx`

**Checkpoint**: Demo credentials autofill is fully integrated and accelerates test workflows.

---

## Phase 6: User Story 4 - Terminal Role Preference Persistence (Priority: P3)

**Goal**: Preserve the chosen role mode across browser launches when the user enables "Remember this terminal".

**Independent Test**: Select "Staff Portal", check "Remember this terminal", log in, reload the page, and confirm "Staff Portal" is active by default without hydration flicker.

### Implementation for User Story 4

- [X] T012 [US4] Implement terminal persistence state binding and checkbox handler in `components/auth/auth-card.tsx`

**Checkpoint**: Terminal preference persistence is active and tested across page reloads.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Visual quality audit, accessibility compliance, and verification across themes.

- [X] T013 [P] Audit semantic token usage and WCAG AA contrast for dark/light themes in `app/(auth)/login/page.tsx`
- [X] T014 Execute full quickstart validation scenarios and run automated code checks (`npx tsc --noEmit` and `npm run lint`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — blocks all UI stories.
- **User Story 1 (Phase 3 - MVP)**: Depends on Phase 2.
- **User Story 2 (Phase 4)**: Depends on Phase 3 components.
- **User Story 3 (Phase 5)**: Depends on Phase 3 & 4 container integration.
- **User Story 4 (Phase 6)**: Depends on Phase 2 storage helpers and Phase 3 container.
- **Polish (Phase 7)**: Runs after all user story implementations.

### Parallel Opportunities

- `T001` and `T002` in Setup can run in parallel.
- `T004` (storage helper) and `T005` (`RoleTabSwitcher`) can be authored in parallel with `T003`.
- `T010` (`DemoCredentialsBox`) can be built in parallel.
- `T013` (design token audit) can run alongside final verification.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Implement Phase 3 (User Story 1: Administrator Portal Access).
3. Validate MVP locally against `/admin` redirect.

### Incremental Delivery
1. Add User Story 2 (Staff POS mode & routing).
2. Add User Story 3 (One-click demo autofill box).
3. Add User Story 4 (Terminal persistence).
4. Run full Polish and verification checks.
