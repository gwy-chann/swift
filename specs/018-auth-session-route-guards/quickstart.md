# Quickstart & Verification Guide: Authenticated Session Route Guards

**Feature**: Authenticated Session Route Guards & Login Redirects ([SIAA-71](https://the-three-devsketeers.atlassian.net/browse/SIAA-71))
**Status**: Draft

---

## 1. Automated Verification Commands

Run unit tests covering the session route guards:

```bash
# Execute unit test suite
npm test

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint static analysis
npm run lint
```

---

## 2. Interactive Walkthrough Scenarios

### Scenario 1: Authenticated Administrator Visits Login Route
1. Navigate to `http://localhost:3000/`.
2. Click **"Use Admin"** on the Demo Credentials panel and click **"Access Admin Portal"**.
3. Confirm redirection to `/admin`.
4. In the browser URL bar, type `http://localhost:3000/` or `http://localhost:3000/login` and press Enter.
5. **Expected Result**: Immediately redirected back to `/admin`. The login card is never rendered or flashed.

### Scenario 2: Authenticated Staff Visits Login Route
1. Log in using **"Use Staff"** (`cashier@swift.local`).
2. Confirm redirection to `/staff/pos`.
3. In the browser URL bar, navigate to `http://localhost:3000/` or `http://localhost:3000/login`.
4. **Expected Result**: Immediately redirected back to `/staff/pos`. The login card is never rendered.

### Scenario 3: Unauthenticated Visitor Route Protection
1. Open an Incognito/Private window or click **"Log Out Account"** to clear session cookies.
2. Attempt to navigate directly to `http://localhost:3000/admin`.
3. **Expected Result**: The application intercepts the request and redirects to `http://localhost:3000/`.
4. Attempt to navigate directly to `http://localhost:3000/staff/pos`.
5. **Expected Result**: The application redirects to `http://localhost:3000/`.

### Scenario 4: Cross-Role Boundary Protection (Staff Accessing Admin)
1. Log in as **Staff** (`cashier@swift.local`).
2. Attempt to manually navigate to `http://localhost:3000/admin`.
3. **Expected Result**: The application redirects the user to `/staff/pos`.
