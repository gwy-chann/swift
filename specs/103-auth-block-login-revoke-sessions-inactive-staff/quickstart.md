# Quickstart: SIAA-103 Inactive Staff Auth Blocking & Session Revocation

**Feature**: Immediate Auth Blocking & Session Revocation for Inactive Staff Accounts  
**Branch**: `feat/SIAA-103-auth-block-login-revoke-sessions-inactive-staff`  
**Date**: 2026-10-26  

---

## 1. Quick Verification Scenarios

### Scenario 1: Inactive Staff Member Denied Login
1. Open the Admin Portal at `/admin/users` as Administrator.
2. Locate an active staff member (e.g., `cashier@swift.ph` - Mike Morales) in the User Ledger.
3. Click the status dropdown or toggle and select **Inactive**.
4. In an Incognito window (or after logging out), navigate to the login screen at `/login`.
5. Enter `cashier@swift.ph` and password `CashierSecure#2026` (or demo staff credentials).
6. Click **Sign In**.
7. **Expected Verification**:
   - Authentication fails immediately.
   - An alert banner displays:
     > *"Account is inactive. Please contact your workshop administrator."*
   - No session cookies (`swift-session-role`, `swift-user-name`) are created.

---

### Scenario 2: Immediate Invalidation of Active Session
1. Log in to the Staff Terminal at `/staff/pos` as a staff member in Browser Window A.
2. In Browser Window B, log in as Administrator at `/admin/users`.
3. In Window B, toggle the status of the logged-in staff member to **Inactive**.
4. In Window A, perform any subsequent action (e.g. click "Shelf Locator", "Price Check", or refresh `/staff/pos`).
5. **Expected Verification**:
   - The staff member is immediately evicted from the terminal.
   - All session cookies are cleared.
   - The browser redirects to `/login?notice=inactive`.
   - The login page renders the warning banner:
     > *"Account is inactive. Please contact your workshop administrator."*

---

### Scenario 3: Inactive Staff PIN Verification Blocked
1. On the Staff Terminal, open the Digital Shift Punch Clock or Admin Elevation modal.
2. Enter the PIN of the deactivated employee (e.g., `1234`).
3. **Expected Verification**:
   - PIN verification is rejected with code `ACCOUNT_INACTIVE`.
   - Modal displays: *"Account is inactive. Please contact your workshop administrator."*
   - No punch-in or elevation is registered.

---

## 2. Automated Test Suite Execution

Run the targeted test suites inside the worktree:
```bash
# 1. Inactive account login guard tests
node --env-file=.env.local --experimental-strip-types --test lib/auth/__tests__/inactive-account-guard.test.ts

# 2. Inactive staff PIN verification tests
node --env-file=.env.local --experimental-strip-types --test lib/staff/__tests__/inactive-staff-pin.test.ts

# 3. Session revocation & route guard tests
node --env-file=.env.local --experimental-strip-types --test lib/auth/__tests__/session-revocation.test.ts

# 4. User deactivation & admin action tests
node --env-file=.env.local --experimental-strip-types --test lib/admin/__tests__/user-deactivation-revocation.test.ts

# 5. Full regression test suite
npm test
```
