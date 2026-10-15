# Technical Implementation Plan: 7-Day Revenue Trend Comparison Engine

**Feature**: 7-Day Revenue Trend Comparison Engine (Parts Sales vs. Bay Labor Services)  
**Jira Issue**: [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (STORY-6.2)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6)  

---

## 1. Architectural Strategy

The 7-Day Revenue Trend Comparison Engine is a pivotal widget on the SWIFT Admin Dashboard (`/admin`).
To satisfy all 4 acceptance scenarios from Jira ticket `SIAA-34`:
1. **Scenario 1 (7 Grouped Bar Pairs)**:
   - Render exactly 7 grouped pairs representing each day of the week (Mon to Sun / Today).
   - Each group contains `.chart-bar-group` with two bars:
     - Blue (`.chart-bar.bar-parts` with `bg-primary`) for Motorcycle Parts Sales.
     - Sky-Blue / Purple (`.chart-bar.bar-labor` with `bg-info`) for Repair Bay Labor Services.
   - Container and bars use strictly semantic tokens (`bg-primary`, `bg-info`, `bg-bg-card`, etc.).
2. **Scenario 2 (Data Value Badges & Tooltips on Hover)**:
   - Each bar contains the HTML data attribute `data-val="₱XX.Xk"` (e.g. `data-val="₱48.0k"`).
   - On hover, an animated tooltip badge reveals the exact formatted monetary revenue for that channel and day.
3. **Scenario 3 (Context Header & Legend)**:
   - Panel card header displays a neutral date badge indicating the 7-day calendar span (e.g., `Sept 22 - 28, 2026`).
   - Bottom chart legend features color dot markers distinguishing Motorcycle Parts Sales from Repair Bay Labor Services, with interactive channel toggle filtering (`all`, `parts`, `labor`).
4. **Scenario 4 (Proportional Scale Normalization Engine)**:
   - Pure engine in `lib/analytics/revenue-trend-engine.ts` calculates the maximum peak revenue threshold observed across all 7 days and both channels.
   - Heights scale proportionally up to 100% relative to this peak, with a 4% floor for non-zero values to avoid visual clipping or zero-height distortion.
   - Dynamic real-time increment (`todayPartsIncrement`, `todayLaborIncrement`) triggers automatic re-normalization of all bars.

---

## 2. File & Component Boundary Changes

| Layer | File | Responsibilities |
| :--- | :--- | :--- |
| **Domain Logic** | `lib/analytics/revenue-trend-engine.ts` | Pure functions for peak finding, proportional height calculation (`computeHeightPercent`), compact PHP currency formatting (`formatCompactCurrencyPhp`), and weekly data normalization. |
| **Component** | `components/admin/revenue-comparison-chart.tsx` | Component rendering the panel card, 7 bar groups (`.chart-bar-group`), dual bars (`.chart-bar.bar-parts`, `.chart-bar.bar-labor`), `data-val` attributes, on-hover floating badges, responsive height, and interactive legend filter. |
| **Global Styles** | `app/globals.css` | Ensure `.chart-bar-group`, `.chart-bar`, `.bar-parts`, and `.bar-labor` classes match mockup specification seamlessly with token inheritance. |
| **Unit Test Suite** | `lib/analytics/__tests__/revenue-trend-engine.test.ts` | Test pure logic for proportional scaling, peak normalization, minimum height protection, compact currency formatting, and empty dataset handling. |
| **Component Test Suite** | `components/admin/__tests__/revenue-comparison-chart.test.tsx` | Test rendering of 7 bar pairs, `.bar-parts` and `.bar-labor` presence, `data-val` attributes, tooltip hover behavior, header date badge, and legend. |

---

## 3. Test & Verification Plan

1. **Unit Tests (`lib/analytics/__tests__/revenue-trend-engine.test.ts`)**:
   - Verify Scenario 1: Correct 7-day structure and channel split.
   - Verify Scenario 2: Compact currency display strings (`₱48.0k`, `₱12.0k`, `₱850`).
   - Verify Scenario 3: Date range header calculation and legend labels.
   - Verify Scenario 4: Proportional scaling up to 100%, 0-value handling, and minimum 4% height protection.
2. **Component Tests (`components/admin/__tests__/revenue-comparison-chart.test.tsx`)**:
   - Verify rendered markup contains 7 `.chart-bar-group` elements.
   - Verify each day has `.chart-bar.bar-parts` and `.chart-bar.bar-labor`.
   - Verify presence of `data-val` on bars.
   - Verify header badge displays `Sept 22 - 28, 2026` (or provided date range).
3. **Verification Commands**:
   - `npm test` verifying all test suites pass.
   - `npx tsc --noEmit` confirming 0 TypeScript errors.
   - `npm run lint` confirming clean ESLint on touched files.
