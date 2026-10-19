# Tasks: Terminal Device Binding

**Feature**: Terminal Device Binding: Enroll primary counter laptop and restrict remote mobile time-ins  
**Branch**: `feat/SIAA-82-terminal-device-binding`  
**Jira Issue**: [SIAA-82](https://the-three-devsketeers.atlassian.net/browse/SIAA-82)  

---

## Phase 1: Contracts, Types & Domain Models
- [ ] **TASK-1.1**: Create `lib/terminal/types.ts` and `lib/terminal/contracts.ts` with domain interfaces and Zod schemas for `TerminalDevice`, `TerminalRegistrationPayload`, and `TerminalValidationResult`.
- [ ] **TASK-1.2**: Extend `lib/staff/types.ts` and `lib/contracts/offline-shift-sync.ts` with optional `deviceToken` property.

## Phase 2: Client Terminal Binding & Storage Engine
- [ ] **TASK-2.1**: Implement `lib/terminal/device-binding.ts` with browser storage utilities (`swift_terminal_device_token` in localStorage and cookies), auto-enrollment as `Terminal #01`, token validation, and reset helpers.
- [ ] **TASK-2.2**: Extend `lib/store/punch-store.ts` offline punch queue to record and dispatch `deviceToken`.

## Phase 3: Server Actions & Enforcement
- [ ] **TASK-3.1**: Implement `lib/terminal/actions.ts` with `validateTerminalTokenAction`, `enrollTerminalDeviceAction` (requiring master PIN `8888`), and `resetTerminalDeviceAction`.
- [ ] **TASK-3.2**: Update `clockInShiftAction` in `lib/staff/actions.ts` to validate `deviceToken` (or cookie) and reject unauthorized devices with `UNAUTHORIZED_TERMINAL_DEVICE`.

## Phase 4: UI Components & Experience
- [ ] **TASK-4.1**: Implement `TerminalEnrollmentModal` (`components/staff/clock/terminal-enrollment-modal.tsx`) with Master Admin PIN (`8888`) elevation and terminal registration.
- [ ] **TASK-4.2**: Update `PunchClockPanel` (`components/staff/clock/punch-clock-panel.tsx`) with terminal status pill badge, enrollment modal trigger, `deviceToken` propagation, and accessible `UNAUTHORIZED_TERMINAL_DEVICE` warning banner.

## Phase 5: Automated Testing & Verification
- [ ] **TASK-5.1**: Create unit & integration tests in `lib/terminal/__tests__/terminal-device-binding.test.ts` and `lib/staff/__tests__/staff-terminal-binding-actions.test.ts` covering all 4 Gherkin scenarios.
- [ ] **TASK-5.2**: Run `npm test` and `npm run typecheck` to verify zero regressions.
