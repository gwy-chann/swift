# Quickstart & Verification Guide: 7-Day Revenue Trend Comparison Engine

**Feature**: 7-Day Revenue Trend Comparison Engine (Parts Sales vs. Bay Labor Services)  
**Jira Issue**: [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (STORY-6.2)  

---

## 1. Quick Verification Steps

### Step 1: Run Automated Tests
```bash
npm test
```
Verify that all unit tests in:
- `lib/analytics/__tests__/revenue-trend-engine.test.ts`
- `components/admin/__tests__/revenue-comparison-chart.test.tsx`
pass without errors.

### Step 2: TypeScript & Lint Verification
```bash
npx tsc --noEmit
npm run lint
```
Verify zero compiler errors and zero ESLint rule violations.

### Step 3: Interactive Visual Walkthrough
1. Run local dev server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/admin`.
3. Locate the **7-Day Revenue Comparison (Parts Sales vs Labor Services)** panel card:
   - Verify 7 grouped bar pairs representing `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun (Today)`.
   - Verify each day shows Blue (`.bar-parts`) and Sky-Blue (`.bar-labor`) bars.
   - Verify header badge displays `Sept 22 - 28, 2026`.
   - Hover over Saturday's parts bar: verify tooltip shows `₱48.0k` and DOM inspector shows `data-val="₱48.0k"`.
   - Click legend item "Motorcycle Parts Sales" or "Repair Bay Labor Services" to filter channels interactively.
