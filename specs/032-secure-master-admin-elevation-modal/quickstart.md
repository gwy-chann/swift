# Quickstart & Verification Guide: Secure Master Admin Elevation Modal

**Feature**: `032-secure-master-admin-elevation-modal`  
**Jira Ticket**: [SIAA-32](https://the-three-devsketeers.atlassian.net/browse/SIAA-32)  

---

## 1. Quick Verification Steps

### Step 1: Start the Local Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000/staff/pos` in your browser.

---

### Step 2: Test Elevation Trigger (Scenario 1)
1. In the Staff Terminal topbar, locate and click the **"Admin Portal Access"** button.
2. Verify that `#switchPortalModal` opens centered with smooth animation.
3. Verify that:
   - Target Account `#switchUsernameInput` is pre-populated with `admin@swift.local` (readonly).
   - Password input `#switchPasswordInput` is focused automatically with placeholder `"Enter Admin Password..."`.
   - The Demo Credentials box is visible showing `admin123`.

---

### Step 3: Test Failed Authentication (Scenario 3)
1. Type `wrongpassword` into `#switchPasswordInput` and press Enter (or click "Verify & Access Admin Portal").
2. Verify that:
   - Navigation is blocked; the modal remains open.
   - `#switchAuthError` appears displaying: `"Invalid administrator password."` in red (`text-danger`).
   - `#switchPasswordInput` remains active and focused.
3. Test empty submission: clear the input and click submit. Verify the prompt: `"Please enter the administrator password."`

---

### Step 4: Test 1-Click Autofill & Successful Elevation (Scenario 2)
1. Click the **"Autofill Admin Password"** button in the Demo Credentials box.
2. Verify that `#switchPasswordInput` is immediately populated with `admin123` and any error disappears.
3. Click **"Verify & Access Admin Portal"** or press Enter.
4. Verify that:
   - The modal closes immediately.
   - The browser navigates smoothly to `/admin`.
   - The session cookie `swift_admin_elevated` is set.

---

### Step 5: Test Modal Dismissal & State Preservation (Scenario 4)
1. Add an item to the POS cart on `/staff/pos`.
2. Click "Admin Portal Access" to open the modal.
3. Click "Cancel", click the `✕` close button, or press the `Escape` key.
4. Verify that the modal closes and the active cart items remain unchanged without state loss.

---

## 2. Automated Test Execution

Run the dedicated test suite:
```bash
node --env-file=.env.local --experimental-strip-types --test lib/staff/__tests__/admin-elevation-modal.test.ts
```

Run full static analysis and TypeScript check:
```bash
npx tsc --noEmit
npm run lint
```
