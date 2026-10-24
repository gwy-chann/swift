# Research & Architectural Analysis: Terminal Device Binding

**Feature**: Terminal Device Binding: Enroll primary counter laptop and restrict remote mobile time-ins  
**Branch**: `feat/SIAA-82-terminal-device-binding`  
**Jira Issue**: [SIAA-82](https://the-three-devsketeers.atlassian.net/browse/SIAA-82)  

---

## 1. Context & Security Threat Model

In motorcycle workshop operations, employee attendance is directly tied to payroll, billable labor rates, and bay availability.
Without hardware terminal binding:
- Any employee with network access to the SWIFT app could open `/staff/clock` on their personal smartphone or home laptop.
- The employee could enter their 4-digit PIN remotely and clock in before arriving at the shop ("remote time-in fraud").
- The shop owner loses visibility over whether employees are physically on the floor.

### Security Objective:
Restrict shift clock-in (`clockInShiftAction` and `/staff/clock`) so that time-ins are **only** accepted from physically enrolled shop terminals (e.g. `Terminal #01 - Primary Counter Laptop`, `Terminal #02 - Service Bay Tablet`).

---

## 2. Technical Decisions & Architecture

### 2.1 Device Token Generation & Storage
- **Device Token Format**:
  - Secure high-entropy UUID string prefixed with `term_token_` (e.g. `term_token_550e8400-e29b-41d4-a716-446655440000`) or signed HMAC payload.
- **Client-Side Persistence**:
  - `localStorage.setItem('swift_terminal_device_token', JSON.stringify({ token, terminalId, enrolledAt, deviceName }))`
  - Cookie: `document.cookie = "swift_terminal_device_token=" + token + "; path=/; max-age=31536000; SameSite=Lax"` (ensures server actions and SSR can inspect the token directly if desired).
- **Auto-Enrollment & Graceful Boot**:
  - When accessing the shop terminal for the first time, or if no binding exists, the primary counter laptop can either auto-enroll as `Terminal #01` or prompt the manager with a one-click enrollment using Master Admin PIN `8888`.
  - For seamless demonstration and out-of-the-box shop operations, client helper `initOrGetTerminalDevice()` provides automatic enrollment as `Terminal #01` on counter laptops while providing an easy toggle/reset to simulate unauthorized devices.

### 2.2 Server Action Enforcement
- In `lib/staff/actions.ts`:
  - `clockInShiftAction(terminalId?: string, notes?: string, profileId?: string, deviceToken?: string)`:
    - Extracts `deviceToken` from parameter or `cookies().get('swift_terminal_device_token')?.value`.
    - Validates token against registered terminal devices (or valid token format in mock/offline mode).
    - If missing or invalid:
      ```ts
      return {
        success: false,
        error: 'UNAUTHORIZED_TERMINAL_DEVICE',
        message: 'Punch-in is restricted to authorized physical store counter terminals.'
      };
      ```
    - If valid:
      Attaches verified `terminalId` (e.g. `'Terminal #01'`) to the shift record.

### 2.3 Terminal Management Server Actions
- In `lib/terminal/actions.ts`:
  - `validateTerminalTokenAction(token?: string)`: returns `{ valid: boolean, terminalId?: string, deviceName?: string }`.
  - `enrollTerminalDeviceAction(masterPin: string, terminalId: string, deviceName: string)`:
    - Verifies master PIN `8888`.
    - Generates and registers new terminal token.
    - Sets cookie and returns `{ success: true, token, terminalId, deviceName }`.
  - `resetTerminalDeviceAction(masterPin: string)`:
    - Verifies master PIN `8888`.
    - Revokes binding, clears cookie, and returns `{ success: true }`.

### 2.4 UI & User Experience
- **`/staff/clock` Status Badge**:
  - Displays a pill badge in the punch clock header:
    - Authorized: `[Terminal #01 - Counter Laptop (Authorized)]` with green dot.
    - Unauthorized: `[Unauthorized Remote Device - Punch In Restricted]` with red dot and an "Enroll Terminal" button.
- **Block & Feedback on Punch In**:
  - When an employee attempts to punch in from an unauthorized device, `PunchClockPanel` catches `UNAUTHORIZED_TERMINAL_DEVICE`.
  - Displays an accessible alert banner (`bg-danger-light border-danger text-danger`) explaining the physical counter restriction.
- **Terminal Enrollment Modal (`TerminalEnrollmentModal`)**:
  - Accessible dialog prompting for Master Admin PIN `8888` and terminal name/ID selection (`Terminal #01`, `Terminal #02`, etc.).
  - On submit, enrolls the device and updates local state immediately without requiring page refresh.

---

## 3. Design Tokens Adherence
- Strict adherence to `app/globals.css` and `lib/tokens.ts`:
  - `bg-bg-surface`, `bg-bg-card`, `bg-bg-muted`, `bg-bg-hover`
  - `text-text-primary`, `text-text-muted`, `text-danger`, `text-success`
  - `bg-danger-light`, `bg-success-light`, `border-border`
  - Zero hardcoded colors.
