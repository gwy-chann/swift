# Quickstart Verification Guide: Active Shift Time-In Guard in Staff POS

**Feature**: `070-staff-pos-time-in-guard`  
**Jira Issue**: [SIAA-74](https://the-three-devsketeers.atlassian.net/browse/SIAA-74)  

---

## 1. Automated Test Execution

Inside the worktree, run:
```bash
npm test tests/unit/pos/shift-guard.test.ts
npm test tests/unit/components/active-shift-guard-modal.test.tsx
npx tsc --noEmit
npm run lint
```

---

## 2. Interactive Walkthrough Scenarios

### Scenario A: Attempt Checkout While Clocked Out / Inactive
1. Navigate to `/staff/clock` and click "CLOCK OUT" (or ensure shift status is idle/clocked out).
2. Navigate to `/staff/pos`.
3. Verify that the cart pane displays the **"Shift Inactive / Not Timed In"** warning banner.
4. Add any fast-pick part or service to the cart.
5. Click **"COMPLETE SALE (F12)"** or press `F12`.
6. Verify:
   - `CashTenderModal` does **NOT** open.
   - `ActiveShiftGuardModal` appears with the message:
     *"Active Shift Required: You must clock in / time in before processing customer orders."*
7. Click the **"Go to Punch Clock"** button.
8. Verify immediate navigation to `/staff/clock`.

### Scenario B: Normal Checkout While Timed In
1. At `/staff/clock`, click "TIME IN / CLOCK IN". Verify shift status is "On Shift".
2. Navigate to `/staff/pos`.
3. Add an item to the cart.
4. Verify the inactive banner is **not** present.
5. Click **"COMPLETE SALE (F12)"** or press `F12`.
6. Verify `CashTenderModal` opens seamlessly.
7. Complete tender and verify transaction attributes the logged-in staff name.
