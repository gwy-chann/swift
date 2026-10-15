# Quickstart & Verification Guide: Executive KPI Dashboard & Real-Time Operational Health Metric Cards

**Feature**: Executive KPI Dashboard & Real-Time Operational Health Metric Cards  
**Jira Issue**: [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (STORY-6.1)  

---

## 1. Quick Verification Steps

### Step 1: Run Unit Tests
```bash
npm test
```
Verify that `lib/analytics/__tests__/kpi-calculator.test.ts` passes all 4 scenarios.

### Step 2: TypeScript Typecheck
```bash
npx tsc --noEmit
```
Verify 0 compilation errors across the Next.js workspace.

### Step 3: Interactive Visual Verification
1. Start dev server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/admin`:
   - Inspect the top 4 KPI cards:
     - **Gross Revenue**: Formatted as `₱45,230.00`, variance badge showing `+14.2% vs yesterday`.
     - **Work Orders Queue**: Formatted as `8 Active`, subtext showing `3 Pending Parts Assembly`.
     - **Net Profit Margin**: Formatted as `34.8%`, subtext showing `₱182,400.00 Gross Profit`.
     - **Critical Low Stock**: Formatted as `3 SKUs`, badge showing `ALERT` with `text-danger`, and card is clickable with pointer cursor.
3. Click the **Critical Low Stock** card:
   - Notice immediate navigation to `/admin/inventory?status=low_stock`.
   - Verify that the inventory catalog table filters down to show only parts with stock at or below safety threshold.
