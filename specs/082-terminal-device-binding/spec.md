# Feature Specification: Terminal Device Binding

**Feature Branch**: `feat/SIAA-82-terminal-device-binding`  
**Created**: 2026-10-20  
**Status**: Ready for Planning / Implementation  
**Jira Issue**: [SIAA-82](https://the-three-devsketeers.atlassian.net/browse/SIAA-82)  
**Parent Epic**: [SIAA-77](https://the-three-devsketeers.atlassian.net/browse/SIAA-77) (Staff Terminal POS & Attendance Controls)  
**Target View**: Staff Shop Floor Terminal (`/staff/clock`, `components/staff/clock/punch-clock-panel.tsx`, `components/staff/clock/terminal-enrollment-modal.tsx`, `lib/terminal/*`, `lib/staff/actions.ts`, `lib/store/punch-store.ts`)

---

## 1. Executive Summary & Objective

The SWIFT workshop operates physical sales and service bays where attendance tracking directly informs labor accountability, mechanic bay utilization, and payroll. Because staff can navigate to `/staff/clock` on any web browser, employees could potentially open the URL on their personal smartphones or home laptops, punching in remotely before physically arriving at the shop ("buddy punching" or remote attendance fraud).

This specification implements **Terminal Device Binding**:
1. **Physical Counter Laptop Enrollment**:
   - Establish the primary counter laptop as an authorized physical station (`Terminal #01`).
   - Store a secure, persistent terminal device token (`swift_terminal_device_token`) in browser storage (and secure cookie).
   - Provide auto-enrollment for the primary shop laptop or one-click enrollment via Master Admin PIN (`8888`).
2. **Server-Side Terminal Token Enforcement**:
   - `clockInShiftAction` strictly validates the `swift_terminal_device_token`.
   - Clock-in requests from unauthorized personal smartphones or external devices lacking an authorized token are rejected with machine-readable error code `UNAUTHORIZED_TERMINAL_DEVICE`.
3. **Accessible UI Guidance & Warnings**:
   - When an unauthorized device attempts to clock in, `/staff/clock` displays an accessible warning banner explaining that punch-in is restricted to physical store counter terminals.
   - Render a terminal status indicator on `/staff/clock` indicating whether the current browser is an authorized terminal (`Terminal #01`) or an unauthorized remote device.
4. **Master Admin Elevation & Multi-Device Management**:
   - Store managers can authorize additional shop tablets or re-bind terminals using Master Admin PIN `8888`.
   - Provide a terminal device management modal allowing elevation, enrollment, and token reset.
5. **SWIFT Semantic Design Tokens**:
   - Strict adherence to SWIFT tokens (`bg-bg-surface`, `bg-bg-card`, `text-text-primary`, `text-danger`, `bg-danger-light`, `text-success`, `bg-success-light`, `border-border`) with zero hardcoded hex/rgb.

---

## 1.1 Clarifications & Decisions

### Session 2026-10-20
- **Q1: How is the primary shop laptop recognized on first boot?**  
  - **A**: The primary terminal auto-enrolls if no authorized terminal exists, generating and persisting `swift_terminal_device_token` with `terminalId: "Terminal #01"`. Alternatively, clicking "Enroll as Terminal #01" with Master Admin PIN (`8888`) explicitly binds the device.
- **Q2: Where is the device token persisted on the client?**  
  - **A**: `localStorage` under `swift_terminal_device_token` and synchronized via cookie `swift_terminal_device_token` to enable seamless SSR / server action access.
- **Q3: What error code is returned when an unauthorized device attempts to clock in?**  
  - **A**: The server action returns `{ success: false, error: 'UNAUTHORIZED_TERMINAL_DEVICE', message: 'Clock-in is restricted to physical store counter terminals.' }`.
- **Q4: How can a manager test or enroll another counter tablet?**  
  - **A**: By opening the Terminal Enrollment Modal and submitting Master Admin PIN `8888`, generating a valid terminal device token for `Terminal #02` or `Terminal #01`.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-82)

* **As a** store manager and workshop owner,  
* **I want** the system to enroll my current laptop as the primary authorized physical terminal (`Terminal #01`) and require a valid terminal token on punch actions,  
* **So that** staff members attempting to access `/staff/clock` from their personal smartphones or home laptops cannot remotely punch in or commit attendance fraud.

---

### Scenario 1: Primary laptop device auto-enrollment (Priority: P1)

* **Given** the manager accesses the SWIFT application on the primary shop laptop
* **When** the terminal initialization executes or the manager clicks "Enroll as Terminal #01"
* **Then** a secure, persistent device token (`swift_terminal_device_token`) is stored in browser storage
* **And** the device is registered with `terminalId: "Terminal #01"` and active authorization status.

---

### Scenario 2: Authorized counter laptop successfully clocks in (Priority: P1)

* **Given** an employee opens `/staff/clock` on the enrolled shop laptop
* **When** they enter their 4-digit PIN and click "TIME IN"
* **Then** the terminal device token is validated by `clockInShiftAction`
* **And** the shift is recorded with terminal attribution `Terminal #01`.

---

### Scenario 3: Unauthorized personal phone blocked from time-in (Priority: P1)

* **Given** an employee opens `/staff/clock` on their personal smartphone or external device without an authorized device token
* **When** they attempt to clock in
* **Then** the action is blocked with error `UNAUTHORIZED_TERMINAL_DEVICE`
* **And** the UI displays an accessible warning explaining that punch-in is restricted to physical store counter terminals.

---

### Scenario 4: Admin bypass / elevation for testing (Priority: P2)

* **Given** a manager needs to authorize a new tablet or reset terminal binding
* **When** they enter their master admin PIN (`8888`) in terminal settings
* **Then** they can enroll the new device or view active terminal binding status.

---

## 3. Functional Requirements

- **FR-001**: Implement `TerminalDevice` model and token validation contracts in `lib/terminal/types.ts` and `lib/terminal/contracts.ts`.
- **FR-002**: Implement client-side terminal device binding service in `lib/terminal/device-binding.ts` managing `swift_terminal_device_token` storage, retrieval, auto-enrollment, and enrollment clearing.
- **FR-003**: Update `clockInShiftAction` in `lib/staff/actions.ts` to accept and validate `deviceToken?: string` (or inspect `swift_terminal_device_token` cookie), rejecting invalid tokens with `UNAUTHORIZED_TERMINAL_DEVICE`.
- **FR-004**: Implement server actions `enrollTerminalDeviceAction(masterPin, terminalId, deviceName)` and `validateTerminalTokenAction(token)` in `lib/terminal/actions.ts`.
- **FR-005**: Update `PunchClockPanel` in `components/staff/clock/punch-clock-panel.tsx` to retrieve active terminal token, pass it to `clockInShiftAction`, and display an accessible alert banner upon `UNAUTHORIZED_TERMINAL_DEVICE`.
- **FR-006**: Add a terminal status badge / enrollment trigger to `/staff/clock` allowing managers to view terminal status ("Terminal #01 - Authorized" vs "Unauthorized Remote Device") and open `TerminalEnrollmentModal`.
- **FR-007**: Implement `TerminalEnrollmentModal` requiring Master Admin PIN `8888` to enroll the current device or reset binding.
- **FR-008**: Update offline punch queue in `PunchStore` (`lib/store/punch-store.ts`) to attach `deviceToken` so offline shifts preserve terminal attribution.
- **FR-009**: All UI modifications must strictly adhere to SWIFT Semantic Design Tokens in `app/globals.css` and `lib/tokens.ts` (zero hardcoded hex/rgb).

---

## 4. Success Criteria & Non-Functional Requirements

- **SC-001**: 100% of punch-in attempts from browsers lacking `swift_terminal_device_token` are blocked with `UNAUTHORIZED_TERMINAL_DEVICE`.
- **SC-002**: Authorized counter laptops complete punch-in within < 500ms with full `Terminal #01` attribution.
- **SC-003**: Master Admin PIN `8888` successfully elevates and enrolls a new device in < 1 second.
- **SC-004**: Zero hardcoded hex/rgb styling colors used across all new and modified components.
- **SC-005**: 100% test pass rate across all unit, integration, and contract tests.

---

## 5. Assumptions & Dependencies

- **A-001**: Primary store laptop uses modern evergreen browsers (Chrome/Edge/Firefox) with `localStorage` and cookie support enabled.
- **A-002**: Master Admin PIN is `8888` matching the ratified master credential standard in `lib/mock-data/users.ts`.
- **A-003**: Default terminal ID is `Terminal #01` matching existing shift schemas.
