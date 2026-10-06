# Quickstart & Verification Guide: Staff Shop Floor Terminal Layout Shell

## 1. Quick Verification Steps

1. Start development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/staff` (or `/staff/pos`).
3. Verify the layout renders with:
   - Sidebar on the left with `SWIFT` brand and `STAFF` badge pill.
   - 5 Navigation tabs: Fast-Lane POS, Stock & Shelf Finder, Model Fitment Search, Item Code Price Check, Punch Clock.
   - Punch Clock displaying `ON SHIFT` badge.
   - User profile footer with `Mike Morales` / `Cashier / Floor Staff`.
   - Topbar displaying active view title, active shift timer, and "Admin Portal Access" button.
4. Click each navigation tab to verify instantaneous client-side view transition and active tab highlighting (`bg-primary text-white`).
5. Click "Admin Portal Access" to verify modal or navigation to `/admin`.
6. Click "Log Out Account" in sidebar footer to verify redirection to `/login`.
7. Resize viewport to mobile width (<768px) and test the hamburger toggle and slide-out mobile drawer.
