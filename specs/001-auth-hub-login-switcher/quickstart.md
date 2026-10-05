# Quickstart & Verification Guide: Role-Based Authentication Hub

**Feature**: Role-Based Authentication Hub & Login Switcher ([SIAA-8](https://the-three-devsketeers.atlassian.net/browse/SIAA-8))
**Status**: Completed

## 1. Prerequisites & Setup

Ensure dependencies are installed and dev server is ready:

```bash
# Verify TypeScript & Next.js environment
npm run dev
```

Visit the application at: `http://localhost:3000/login` (or `http://localhost:3000/`).

---

## 2. End-to-End Verification Scenarios

### Scenario A: Admin Portal Authentication & Redirection
1. Navigate to `/login`.
2. Ensure the **"Admin Portal"** tab is active.
3. Verify the primary submit button reads **"Access Admin Portal"** with the primary brand style (`bg-primary`).
4. Click **"Use Admin"** in the demo account box:
   - Verify the username field is filled with `admin@swift.local`.
5. Click **"Access Admin Portal"**:
   - Verify the system establishes the admin session and routes to `/admin`.

---

### Scenario B: Staff Fast-Lane POS Mode & Redirection
1. Navigate to `/login`.
2. Click the **"Staff Portal"** tab.
3. Verify:
   - The **"Staff Portal"** tab highlights with the secondary slate token (`bg-secondary`).
   - The submit button dynamically updates to **"Access Staff Fast-Lane POS"**.
4. Click **"Use Staff"** in the demo account box:
   - Verify the username field is populated with `cashier@swift.local`.
5. Click **"Access Staff Fast-Lane POS"**:
   - Verify the system establishes a staff session and routes to `/staff/pos`.

---

### Scenario C: Terminal Memory & Persistence
1. Navigate to `/login`.
2. Select **"Staff Portal"**.
3. Check the **"Remember this terminal"** checkbox.
4. Refresh the browser page (`Ctrl+R` / `F5`).
5. Verify that **"Staff Portal"** remains the active tab upon initial load without hydration mismatch warnings in the browser console.

---

### Scenario D: Design Token & Dark Mode Inspection
1. Toggle system or UI theme between Light and Dark mode.
2. Confirm:
   - Login card container uses `bg-bg-card` and `border-border`.
   - Typography uses high-contrast `text-text-primary` and `text-text-secondary`.
   - Zero hardcoded colors or raw utility classes.

---

## 3. Automated Verification Commands

```bash
# Type check verification
npx tsc --noEmit

# Lint verification
npm run lint
```
