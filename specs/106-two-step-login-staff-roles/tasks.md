# Implementation Tasks: Staff Two-Step Login Sequence (SIAA-106)

**Feature**: Auth: Enforce two-step login sequence (Password then PIN) for all staff roles  
**Ticket**: [SIAA-106](https://the-three-devsketeers.atlassian.net/browse/SIAA-106)  

---

## Phase 1: Contracts & Type Definitions

- [X] **T001**: Define two-step authentication contracts and types in `specs/106-two-step-login-staff-roles/contracts/two-step-auth.contract.ts` and `lib/auth/types.ts`.
  - Export `InitiateStaffLoginSchema`, `CompleteStaffTwoStepLoginSchema`, and `StaffPinSchema`.
  - Add `PendingStaffAuthChallenge`, `PendingStaffSummary`, and `InitiateStaffLoginResult` to `lib/auth/types.ts`.

---

## Phase 2: Server Actions & Route Guard Hardening

- [X] **T002**: Update `authenticateUserAction` in `lib/auth/actions.ts` to branch on staff roles.
  - When authenticating a staff role, verify credentials, verify account status is active, and set the transient `swift-pending-staff-auth` cookie without setting `swift-session-role`.
  - Return `requiresPin: true` and `step: 'ENTER_PIN'` with staff summary.
- [X] **T003**: Implement `completeStaffTwoStepLoginAction` and `cancelStaffPinChallengeAction` in `lib/auth/actions.ts`.
  - Verify the submitted PIN against `public.profiles.pin_code` (or demo profiles/fallback).
  - Enforce error `"Invalid PIN. Please try again."` on PIN mismatch.
  - On valid PIN: remove `swift-pending-staff-auth`, set authoritative `swift-session-role`, `swift-user-name`, `swift-session-user-id`, and return target redirect URL.
- [X] **T004**: Enhance `resolveSession` and `evaluateRouteAccess` in `lib/auth/session-guards.ts`.
  - Detect `swift-pending-staff-auth` challenge cookie.
  - Classify requests to `/staff/*` with only pending challenge as unauthenticated and redirect to `/login?notice=pin_required`.

---

## Phase 3: Automated Test Coverage (TDD)

- [X] **T005**: Create automated test suite `lib/auth/__tests__/two-step-login.test.ts`.
  - Test Step 1 credential initiation for Cashier, Mechanic, and Inventory Clerk (returns `requiresPin: true`, sets pending challenge cookie).
  - Test Step 2 PIN verification with matching PIN (returns success, sets full session cookies).
  - Test Step 2 with incorrect PIN (returns `"Invalid PIN. Please try again."`, no session cookies).
  - Test route session guard direct URL bypass prevention for `/staff/pos`, `/staff/work-orders`, `/staff/pricecheck`.
  - Test admin single-step login remains direct without PIN prompt.

---

## Phase 4: UI Components & Keypad Implementation

- [X] **T006**: Create `StaffPinKeypad` in `components/auth/staff-pin-keypad.tsx`.
  - Implement 3x4 numeric keypad with digits 0-9, backspace, clear, dot indicators, and employee name banner.
  - Strictly use semantic SWIFT design tokens (`bg-bg-card`, `border-border`, `text-text-primary`, `bg-primary`, `bg-secondary`).
  - Wire keyboard event listeners (`0-9`, `Backspace`, `Enter`, `Escape`).
- [X] **T007**: Integrate two-step flow into `LoginForm` in `components/auth/login-form.tsx` and `AuthCard`.
  - Transition view smoothly from `step === 'CREDENTIALS'` to `step === 'PIN'`.
  - Provide a "Back / Switch User" control that invokes `cancelStaffPinChallengeAction` and restores Step 1.
  - Wire error state display for `"Invalid PIN. Please try again."`

---

## Phase 5: Verification & Convergence

- [X] **T008**: Run full test suite, TypeScript typecheck (`npx tsc --noEmit`), and linter.
- [X] **T009**: Execute atomic git commits with mandatory Jira key `[SIAA-106]`.
