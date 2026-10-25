# Quickstart & Verification Guide: Staff Two-Step Login (SIAA-106)

**Feature**: Auth: Enforce two-step login sequence (Password then PIN) for all staff roles  
**Ticket**: [SIAA-106](https://the-three-devsketeers.atlassian.net/browse/SIAA-106)  

---

## 1. Automated Verification Commands

Run the dedicated test suite validating the two-step sequence and route guards:

```bash
# Run unit & integration tests
node --env-file=.env.local --experimental-strip-types --test lib/auth/__tests__/two-step-login.test.ts

# Run complete TypeScript verification
npx tsc --noEmit
```

---

## 2. Interactive Manual Walkthrough Scenarios

### Scenario 1: Successful Cashier Two-Step Login
1. Open the SWIFT application at `http://localhost:3000` (or `http://localhost:3000/login`).
2. Switch to the **Staff Portal** tab.
3. Click **"Use Cashier"** in the Demo Credentials Box (or manually type `cashier@swift.local` and password).
4. Click **"Continue"** / **"Access Staff Fast-Lane POS"**.
5. Observe the UI transition:
   - The password form transitions smoothly to the **"Enter PIN"** keypad view.
   - Cashier name *"Mike Morales"* is displayed.
   - The browser has **NOT** navigated to `/staff/pos`.
6. Click keypad buttons for `1`, `2`, `3`, `4`.
7. Click **"Authorize Terminal"** (or auto-submit on 4th digit).
8. Observe:
   - Full session is authorized.
   - Browser redirects to `/staff/pos`.

---

### Scenario 2: Incorrect PIN Rejection
1. On the Step 2 "Enter PIN" screen, enter an incorrect PIN (e.g. `9999`).
2. Submit the PIN.
3. Observe:
   - Error banner appears: *"Invalid PIN. Please try again."*
   - Terminal access is denied.
   - The browser remains on the PIN screen.
   - No session cookies (`swift-session-role`) are granted.

---

### Scenario 3: Direct Route Access Bypass Attempt
1. Complete Step 1 with valid staff credentials (reaching the Step 2 keypad).
2. Without submitting the PIN, manually enter `http://localhost:3000/staff/pos` into the browser address bar.
3. Observe:
   - Route session guards intercept the request.
   - The request is redirected back to `/login` with the pending PIN challenge intact.
