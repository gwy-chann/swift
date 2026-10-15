# Technical Research & Architecture Decisions: 7-Day Revenue Trend Comparison Engine

**Feature**: 7-Day Revenue Trend Comparison Engine (Parts Sales vs. Bay Labor Services)  
**Jira Issue**: [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (STORY-6.2)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6)  

---

## 1. Context & Architectural Analysis

The SWIFT Admin Dashboard (`/admin`) requires a dedicated visualization comparing parts sales vs. workshop bay labor across a rolling 7-day period.

### Current State & Findings:
- `components/admin/revenue-comparison-chart.tsx` exists and renders a static hardcoded array `INITIAL_WEEKLY_DATA`.
- The current implementation lacks:
  1. Mandatory CSS classes `.chart-bar-group`, `.chart-bar`, `.bar-parts`, and `.bar-labor` called out in Jira acceptance criteria and `mockup/admin.html`.
  2. The DOM `data-val` attribute on each bar (e.g. `data-val="₱48.0k"`).
  3. Proportional height calculation engine: heights were statically hardcoded (e.g. 60%, 35%) rather than dynamically computed from amounts relative to the rolling peak value.
  4. Dynamic prop consumption: does not accept `data?: WeeklyRevenueData | DailyRevenueData[]` or `dateRange?: string`.
  5. Isolated pure logic helper module for currency formatting, peak finding, and proportional scaling.

---

## 2. Design System & Semantic Color Tokens

In strict compliance with `AGENTS.md` and repo user rules:
- **Card Container**: `bg-bg-card border border-border rounded-lg shadow-xs overflow-hidden`
- **Header**: `bg-bg-surface border-b border-border text-text-primary`
- **Date Badge**: `bg-bg-muted text-text-secondary border border-border-subtle text-[10px] sm:text-[11px] font-bold tracking-wider uppercase`
- **Motorcycle Parts Bar (`.bar-parts`)**: `bg-primary hover:bg-primary-hover` (Theme variable `--primary`)
- **Repair Bay Labor Bar (`.bar-labor`)**: `bg-info hover:bg-info/90` (Theme variable `--info`)
- **Tooltip**: `bg-text-primary text-white text-[11px] font-bold rounded shadow-md`
- **X-Axis Day Labels**: `text-text-muted text-[11px] sm:text-xs font-semibold`
- **Zero hardcoded colors**: Strictly zero `#hex` or `rgb(...)` classes in TSX.

---

## 3. Proportional Scale Normalization Logic

Given 7 daily records, each with `partsAmount` and `laborAmount`:
1. Peak Detection:
   ```typescript
   const maxAmount = Math.max(
     ...days.flatMap((d) => [d.partsAmount, d.laborAmount]),
     1
   );
   ```
2. Height Computation:
   ```typescript
   function computeHeightPercent(amount: number, peak: number): number {
     if (amount <= 0) return 0;
     // Scale relative to peak, minimum 4% to prevent visual collapse
     return Math.min(100, Math.max(4, Math.round((amount / peak) * 100)));
   }
   ```
3. Currency Formatting:
   ```typescript
   function formatCompactCurrencyPhp(amount: number): string {
     if (amount >= 1000) {
       return `₱${(amount / 1000).toFixed(1)}k`;
     }
     return `₱${Math.round(amount)}`;
   }
   ```

---

## 4. Accessibility & Responsive Standards

- **Mobile Viewports (`< 640px`)**: Chart container uses `h-52` with tighter bar spacing (`gap-1 sm:gap-1.5`).
- **Desktop Viewports (`>= 1024px`)**: Chart container expands to `h-56` with generous column separation (`gap-4 md:gap-6`).
- **Interactive Legend**: Toggle buttons for filtering channels (`all`, `parts`, `labor`) provide full keyboard navigation (`Tab`, `Enter`, `Space`) and distinct focus/hover indicators.
- **Screen Reader Support**: Bars include accessible `aria-label` detailing the channel, day, and exact revenue amount.
