# Quickstart & Verification Guide: Admin Portal Shell

**Feature**: Admin Portal Navigation Shell & Collapsible Sidebar ([SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9))
**Status**: Completed

## 1. Prerequisites & Server Start

```bash
# Start Next.js development server
npm run dev
```

Visit the application at: `http://localhost:3000/admin` (or log in via `/login` as Administrator).

---

## 2. End-to-End Verification Scenarios

### Scenario A: Module Navigation & Active Tab Highlighting
1. Navigate to `http://localhost:3000/admin`.
2. Verify:
   - Sidebar renders on the left with brand header "SWIFT" and "ADMIN" badge.
   - "Admin Dashboard" is highlighted in primary blue (`bg-primary text-white`).
   - Topbar displays "Admin Dashboard".
3. Click **"Inventory & Stock"**:
   - URL updates to `/admin/inventory`.
   - "Inventory & Stock" is highlighted with the red "3 Low" badge visible.
   - Topbar title dynamically updates to "Inventory & Stock".
4. Click **"MotoMatcher Search"**:
   - URL updates to `/admin/motomatcher`.
   - Active highlighting updates instantly.

---

### Scenario B: Topbar Operational Status & Portal Switch
1. In the topbar, verify the status badge reads `[ONLINE] Terminal #01`.
2. Click **"Switch to Staff Portal"**:
   - Verifies navigation to `/staff/pos`.

---

### Scenario C: User Profile & Admin Session Logout
1. Look at the sidebar footer.
2. Confirm user profile shows:
   - Initials Avatar (e.g. "CR" or "AD")
   - User Name ("Carlos Rodriguez" / "System Admin")
   - Role badge
3. Click **"Log Out Account"**:
   - Verifies session cookies are removed and browser redirects to `/login`.

---

### Scenario D: Responsive Mobile Drawer (< 768px)
1. Open DevTools (`F12`) and toggle device toolbar to Mobile Viewport (e.g., iPhone 14, width: 390px).
2. Verify:
   - Desktop sidebar is hidden.
   - Topbar displays a hamburger menu button.
3. Click the hamburger button:
   - Slide-out navigation drawer appears with dark backdrop overlay.
4. Click any navigation link or backdrop:
   - Drawer dismisses cleanly.

---

## 3. Automated Verification Commands

```bash
# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```
