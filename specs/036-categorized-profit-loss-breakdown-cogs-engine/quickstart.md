# Quickstart & Verification Guide: SIAA-36 P&L Breakdown & COGS Engine

**Feature**: SIAA-36 (Categorized P&L Breakdown & COGS Engine)  
**Parent Epic**: SIAA-6 (Executive Analytics, Revenue & Profit Margins)  
**Date**: 2026-10-15  

---

## 1. Automated Verification Commands

Run from the feature worktree root (`.worktrees/SIAA-36`):

```bash
# 1. Typecheck the entire project
npx tsc --noEmit

# 2. Run unit and integration tests specifically for SIAA-36
npm test -- lib/admin/__tests__/pnl-cogs-utils.test.ts lib/admin/__tests__/pnl-actions.test.ts components/admin/reports/__tests__/category-pnl-table.test.tsx

# 3. Run all tests to ensure zero regressions
npm test
```

---

## 2. Manual Verification Scenarios in Browser

### Scenario 1: Navigate to Admin Reports View
1. Open local dev server: `http://localhost:3000/admin/reports`.
2. Inspect the DOM element: verify `<section id="view-reports" ...>` exists.
3. Observe the 4 Financial Summary Cards:
   - **Gross Sales Revenue**: Formatted with `₱` symbol (e.g., `₱45,230.00`) and invoice count subtext.
   - **Cost of Goods (COGS)**: Wholesale direct cost (e.g., `₱29,400.00`).
   - **Net Profit Margin**: Styled with `text-success` (e.g., `₱15,830.00`).
   - **Profit Margin %**: Formatted as percentage (e.g., `35.0%`) with `>30%` target indicator badge.

### Scenario 2: Category Breakdown Table Verification
1. Inspect the "Category Revenue & Margin Breakdown" table.
2. Confirm the presence of key categories:
   - Fluids & Engine Oils
   - Drivetrain & Belts
   - Labor / Service Bay (displays unit count formatted as `X Jobs`, e.g., `14 Jobs`)
   - Tires & Tubeless
   - Brake Systems
   - Electrical & Batteries
3. Verify that Net Profit equals `Gross Revenue - COGS`.
4. Verify that Margin % equals `(Net Profit / Gross Revenue) * 100` rounded to one decimal place.

### Scenario 3: Visual High-Yield Green Styling
1. Identify high-yield categories (such as Labor / Service Bay at 82.3% or Fluids at 33.3%).
2. Verify that their Net Profit values display bold green font (`text-success font-semibold`).
3. For underperforming categories (< 30.0%), verify normal or warning contrast is applied.
