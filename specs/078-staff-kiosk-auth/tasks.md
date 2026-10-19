# Implementation Tasks: Staff Kiosk Authentication & Database Persistence

**Feature**: `078-staff-kiosk-auth`  
**Jira Issue**: [SIAA-78](https://the-three-devsketeers.atlassian.net/browse/SIAA-78)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5)  
**Status**: Ready for Implementation  

---

## Phase 1: Setup & Domain Contracts

- [ ] T001 Define Zod validation schemas and TypeScript contracts in `specs/078-staff-kiosk-auth/contracts/kiosk-auth.contract.ts`
- [ ] T002 Update `lib/staff/types.ts` to include `StaffKioskProfile`, `VerifyStaffPinResult`, and multi-staff session types

---

## Phase 2: Database Schema & Migrations

- [ ] T003 Create migration `supabase/migrations/20261021000000_staff_kiosk_auth_rpcs.sql`:
  - Add `pin_code VARCHAR(10) DEFAULT '1234'` column to `public.profiles`
  - Update `public.clock_in_shift(p_terminal_id, p_notes, p_profile_id)` to resolve `v_profile_id := COALESCE(auth.uid(), p_profile_id)` and persist real rows
  - Update `public.clock_out_shift(p_shift_id, p_notes, p_profile_id)` to accept `p_profile_id`
  - Update `public.toggle_shift_break(p_shift_id, p_profile_id)` to accept `p_profile_id`

---

## Phase 3: Domain Models & Server Actions

- [ ] T004 Implement `verifyStaffPinAction(profileId: string, pin: string)` in `lib/staff/actions.ts`:
  - Validate 4-digit PIN against `public.profiles` (or `DEFAULT_DEMO_PINS` fallback)
  - Return structured verification result with resolved employee profile
- [ ] T005 Adapt `clockInShiftAction`, `clockOutShiftAction`, and `toggleShiftBreakAction` in `lib/staff/actions.ts` to accept `profileId` and pass it to Postgres RPCs with cache revalidation
- [ ] T006 [P] Create unit test suite `lib/staff/__tests__/staff-kiosk-auth.test.ts` covering PIN validation, profile resolution, and shift action profile attribution

---

## Phase 4: Client State Engine (`PunchStore`) Multi-Staff Support

- [ ] T007 Enhance `PunchStore` in `lib/store/punch-store.ts`:
  - Add `currentProfileId` and `staffSessions: Record<string, StaffMemberShiftState>` to store state
  - Support `switchStaff(profile: StaffKioskProfile)` to load target employee's timer and status without corrupting other employees' running shifts
  - Update `clockIn`, `clockOut`, `toggleBreak` to update both global state and the active employee's session state
- [ ] T008 [P] Add unit test suite in `lib/store/__tests__/punch-store-kiosk.test.ts` testing multi-staff session isolation, switching without timer corruption, and duplicate shift guards

---

## Phase 5: UI Components & View Wiring

- [ ] T009 [P] Create `components/staff/clock/staff-pin-modal.tsx`:
  - 4-digit numeric input with touch-friendly numbers keypad (1-9, 0, Backspace, Clear)
  - Keyboard listeners for physical numeric keypads
  - Clear error feedback on invalid PIN
  - Strictly adherence to SWIFT semantic design tokens (`bg-bg-surface`, `border-border`, etc.)
- [ ] T010 [P] Create `components/staff/clock/staff-profile-switcher.tsx`:
  - Quick profile selector showing available staff members with avatar initials and role badges
  - Indicator showing current active staff member and shift status
  - Trigger opening `StaffPinModal` when switching or starting shift
- [ ] T011 Update `components/staff/clock/punch-clock-panel.tsx`:
  - Wire `StaffProfileSwitcher` into panel header
  - Prompt for PIN authentication on Time In or staff switch if not authenticated
  - Pass authenticated `profileId` to `clockInShiftAction`, `clockOutShiftAction`, and `toggleShiftBreakAction`
- [ ] T012 [P] Create component test suite `components/staff/clock/__tests__/staff-pin-modal.test.tsx` verifying modal rendering, input handling, and submission

---

## Phase 6: Verification & Architectural Convergence

- [ ] T013 Execute full test suite `npm test` inside the worktree
- [ ] T014 Execute static type check `npx tsc --noEmit`
- [ ] T015 Execute linter `npm run lint`
- [ ] T016 Verify all tasks in `tasks.md` are marked complete
