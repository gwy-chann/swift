# Quickstart & Verification Guide: Terminal Device Binding

**Feature**: Terminal Device Binding: Enroll primary counter laptop and restrict remote mobile time-ins  
**Jira Issue**: [SIAA-82](https://the-three-devsketeers.atlassian.net/browse/SIAA-82)  

---

## 1. Automated Test Execution

Run the targeted unit and integration test suite:
```bash
npm test lib/terminal/__tests__/terminal-device-binding.test.ts
npm test lib/staff/__tests__/staff-terminal-binding-actions.test.ts
```

Run full project test suite and type check:
```bash
npm test
npm run typecheck
```

---

## 2. Manual UI Walkthrough

### Scenario 1: Primary Laptop Device Auto-Enrollment
1. Navigate to `/staff/clock` on the counter laptop.
2. Observe the terminal status badge:
   - Green pill: `[Terminal #01 (Authorized)]`.
   - Browser storage has key `swift_terminal_device_token`.

### Scenario 2: Authorized Counter Laptop Successfully Clocks In
1. On `/staff/clock` with an authorized terminal badge, click **TIME IN**.
2. Select staff member (e.g. Mike Morales) and enter PIN `1234`.
3. Verify clock-in succeeds with terminal attribution `Terminal #01`.
4. Observe shift status turns to **CURRENT STATUS: ON SHIFT**.

### Scenario 3: Unauthorized Personal Phone Blocked from Time-In
1. Clear the terminal token (e.g., via the Reset button or opening an incognito window/simulating phone).
2. Observe the status indicator: `[Unauthorized Remote Device - Punch In Restricted]`.
3. Click **TIME IN**, enter PIN `1234`.
4. Verify the system rejects the time-in with error `UNAUTHORIZED_TERMINAL_DEVICE`.
5. Verify an accessible red alert banner displays explaining that punch-in is restricted to physical store counter terminals.

### Scenario 4: Admin Bypass / Elevation for Device Enrollment
1. On the unauthorized device or via the terminal status badge, click **Enroll Terminal**.
2. The `TerminalEnrollmentModal` opens.
3. Enter Master Admin PIN `8888`.
4. Select `Terminal #01` or name a new tablet `Terminal #02`.
5. Click **Authorize & Bind Terminal**.
6. Verify device token is generated, stored, and the device is immediately authorized.
7. Click **TIME IN** and verify punch-in now succeeds.
