# Technical Implementation Plan: Terminal Device Binding

**Feature**: Terminal Device Binding: Enroll primary counter laptop and restrict remote mobile time-ins  
**Branch**: `feat/SIAA-82-terminal-device-binding`  
**Jira Issue**: [SIAA-82](https://the-three-devsketeers.atlassian.net/browse/SIAA-82)  

---

## 1. Architecture & Boundary Mapping

| Layer | Files | Purpose |
|---|---|---|
| **Contracts & Types** | `lib/terminal/types.ts`<br>`lib/terminal/contracts.ts` | Define `TerminalDevice`, validation results, registration schemas. |
| **Storage & Binding Engine** | `lib/terminal/device-binding.ts` | Client persistence (`swift_terminal_device_token` in localStorage + cookie), auto-enrollment, validation logic. |
| **Server Actions** | `lib/terminal/actions.ts`<br>`lib/staff/actions.ts` | Server-side token validation, enrollment with Master PIN (`8888`), reset actions, and `clockInShiftAction` token enforcement (`UNAUTHORIZED_TERMINAL_DEVICE`). |
| **Client State & Store** | `lib/store/punch-store.ts` | Extend `QueuedPunchAction` to store `deviceToken`, pass token to sync dispatcher. |
| **UI Components** | `components/staff/clock/terminal-enrollment-modal.tsx`<br>`components/staff/clock/punch-clock-panel.tsx`<br>`app/staff/clock/page.tsx` | Render terminal status badge ("Terminal #01 (Authorized)" vs "Unauthorized Remote Device"), handle blocked state, trigger enrollment modal. |
| **Testing** | `lib/terminal/__tests__/terminal-device-binding.test.ts`<br>`lib/staff/__tests__/staff-terminal-binding-actions.test.ts` | Unit and integration test coverage for all 4 Gherkin scenarios. |

---

## 2. Component Hierarchy & Flow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff / Cashier
    participant Terminal as Shop Floor Terminal (/staff/clock)
    participant DeviceStore as device-binding.ts (LocalStorage & Cookie)
    participant PunchPanel as PunchClockPanel
    participant Actions as Server Actions (lib/staff/actions.ts)
    participant Modal as TerminalEnrollmentModal

    Note over Terminal: Scenario 1: Laptop Auto-Enrollment / Manual Enrollment
    Terminal->>DeviceStore: initOrGetTerminalDevice()
    alt Not Enrolled & On Counter Laptop
        DeviceStore->>DeviceStore: Generate swift_terminal_device_token ("Terminal #01")
        DeviceStore->>Terminal: Return Authorized Terminal #01
    else Manual Enrollment
        Terminal->>Modal: Open Terminal Enrollment
        Staff->>Modal: Enter Master Admin PIN (8888) + Terminal ID
        Modal->>Actions: enrollTerminalDeviceAction(pin, id, name)
        Actions-->>Modal: { success: true, token, terminalId }
        Modal->>DeviceStore: setStoredTerminalDeviceToken(...)
    end

    Note over Terminal: Scenario 2: Authorized Punch In
    Staff->>PunchPanel: Enter PIN & Click "TIME IN"
    PunchPanel->>DeviceStore: getStoredTerminalDeviceToken()
    PunchPanel->>Actions: clockInShiftAction(terminalId, notes, profileId, deviceToken)
    Actions->>Actions: Validate token === active terminal token
    Actions-->>PunchPanel: { success: true, shiftId, terminalId: "Terminal #01" }
    PunchPanel->>Staff: Shift Started banner

    Note over Terminal: Scenario 3: Unauthorized Device Blocked
    Staff->>PunchPanel: Opens from personal smartphone (no token)
    PunchPanel->>Actions: clockInShiftAction(..., deviceToken: null)
    Actions-->>PunchPanel: { success: false, error: "UNAUTHORIZED_TERMINAL_DEVICE" }
    PunchPanel->>Staff: Render accessible alert banner: Punch restricted to store counter terminals
```

---

## 3. SWIFT Design Tokens Adherence
- Modals, status badges, banners, and buttons strictly use semantic design tokens:
  - Text: `text-text-primary`, `text-text-muted`, `text-text-secondary`, `text-danger`, `text-success`
  - Surfaces: `bg-bg-surface`, `bg-bg-card`, `bg-bg-muted`, `bg-danger-light`, `bg-success-light`
  - Borders: `border-border`, `border-danger`, `border-success`
  - Actions: `bg-primary`, `text-text-light`, `bg-primary-hover`
  - Zero hardcoded hex/rgb values.
