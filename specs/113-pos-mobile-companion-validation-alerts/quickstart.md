# Quickstart & Verification Guide: POS Mobile Companion Validation Alerts (SIAA-113)

**Feature**: `113-pos-mobile-companion-validation-alerts`  
**Jira Ticket**: [SIAA-113](https://the-three-devsketeers.atlassian.net/browse/SIAA-113)  

---

## 1. Quick Verification Commands

Inside the isolated worktree directory (`.worktrees/SIAA-113`):

```bash
# 1. Run unit test suite
npm test

# 2. Run TypeScript compilation verification
npx tsc --noEmit

# 3. Run ESLint static analysis
npm run lint
```

---

## 2. Interactive Scenarios & Verification Walkthrough

### Scenario 1: Successful Item Addition
1. **Trigger**: An SKU scan resolves with `{ status: 'SUCCESS', sku: 'YAM-NMAX-BL01', productName: 'Yamaha NMAX Brake Pad Set', unitPrice: 480, remainingStock: 12 }`.
2. **Observed Behavior**:
   - Viewfinder perimeter flashes emerald green (`var(--success)`) for 400ms.
   - A 1200Hz high chime tone plays via phone speaker.
   - Mobile device triggers an 80ms haptic vibration.
   - Floating card slides in from the top with:
     - Part name: `"Yamaha NMAX Brake Pad Set"`
     - SKU: `"YAM-NMAX-BL01"`
     - Price: `"₱480.00"`
     - Stock badge: `"12 units remaining"`.

### Scenario 2: Sold-Out Item Rejection
1. **Trigger**: An SKU scan resolves with `{ status: 'OUT_OF_STOCK', sku: 'HON-CLK-DRV01', reason: 'Item out of stock', remainingStock: 0 }`.
2. **Observed Behavior**:
   - Viewfinder perimeter pulses crimson red (`var(--danger)`) with alert animation for 400ms.
   - A distinct 250Hz low-frequency double buzz plays.
   - Mobile device vibrates with double pulse (`[200, 100, 200]`).
   - High-contrast modal banner slides down: `"SOLD OUT / UNAVAILABLE — NOT ADDED TO CART"` with SKU `"HON-CLK-DRV01"`.

### Scenario 3: Auto-Dismiss & Tap Dismissal
1. **Trigger**: Leave validation card visible for 3.5 seconds OR tap anywhere on screen.
2. **Observed Behavior**:
   - Card smoothly slides up and fades out, clearing the viewfinder for the next scan.

### Scenario 4: Live Bottom Cart Summary
1. **Trigger**: Cart updates via broadcast to `{ itemCount: 3, subtotal: 1250 }`.
2. **Observed Behavior**:
   - Sticky bottom dock updates in real-time to display: `"Cart: 3 items | Subtotal: ₱1,250.00"`.
