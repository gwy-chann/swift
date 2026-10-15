# Quickstart & Verification Guide: Executive Analytics Next.js Server Actions, Accounting CSV Dispatcher & UI Wiring

**Feature**: SIAA-69 (STORY-6.9)  
**Parent Epic**: SIAA-6 (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Date**: 2026-10-15  

---

## 1. Automated Verification Commands

### 1.1 Run Unit Tests
```bash
node --env-file=.env.local --experimental-strip-types --test "lib/analytics/__tests__/*.test.ts"
```

### 1.2 TypeScript Typecheck
```bash
npx tsc --noEmit
```

### 1.3 ESLint Linter
```bash
npx eslint lib/analytics/ app/admin/
```

---

## 2. Manual Verification Scenarios

### Scenario A: Admin Dashboard Live Hydration
1. Open browser to `http://localhost:3000/admin`.
2. Verify:
   - Gross Revenue metric card shows real number (e.g. ₱45,230.00).
   - 7-Day Trend Chart renders bars for Sun through Sat.
   - Service Bay Status card displays Bay 1, Bay 2, and Bay 3.
   - Trigger a simulated POS checkout event in browser console:
     ```javascript
     window.dispatchEvent(new CustomEvent('swift:pos:checkout', { detail: { totalDue: 1500 } }));
     ```
   - Observe Gross Revenue incrementing with green `LIVE` pulse.

### Scenario B: Reports & Financial Analytics View
1. Navigate to `http://localhost:3000/admin/reports`.
2. Verify:
   - 4 summary cards display Total Gross Revenue, Total COGS, Net Profit, and Overall Margin %.
   - P&L table renders rows for Fluids, Drivetrain, Brakes, Ignition, Engine, Tires, Accessories, and Workshop Labor.
   - Workshop Labor displays in `text-success font-bold` (margin $\ge 70\%$).
   - Click "Weekly Sales" and "Monthly Sales" filter tabs; confirm table recalculates immediately.
   - Click "Export CSV / Print"; confirm browser downloads `swift_financial_report_<date>.csv`.
   - Inspect downloaded CSV in text editor or Excel to confirm headers, numerical precision, and footer totals.
