# Feature Specification: 7-Day Revenue Trend Comparison Engine (Parts Sales vs. Bay Labor Services)

**Feature Branch**: `feat/SIAA-34-7-day-revenue-trend-comparison-engine`  
**Created**: 2026-10-15  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (STORY-6.2)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Target View**: Admin Portal Dashboard (`/admin` and container `#view-dashboard`)  
**Prerequisites**: [SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9) (Admin Portal Shell), [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18) (Hybrid POS Cart Engine), [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (Executive KPI Dashboard & Real-Time Operational Health Metric Cards)  
**Blocks / Enables**: [SIAA-36](https://the-three-devsketeers.atlassian.net/browse/SIAA-36) (STORY-6.4: Categorized P&L Breakdown & COGS Engine), [SIAA-37](https://the-three-devsketeers.atlassian.net/browse/SIAA-37) (STORY-6.5: Multi-Period Sales Filter & Accounting CSV Export Dispatcher)  
**Related To**: [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35) (Live Service Bay Work Order Queue & Mechanic Utilization Monitor)  

---

## 1. Executive Summary & Objective

In modern motorcycle dealership and repair shop operations, managing profitability requires real-time insight into the two primary revenue streams: physical counter/over-the-counter parts sales (retail and wholesale) and service bay labor services. Without comparative visualization, managers struggle to recognize weekday vs. weekend demand surges, evaluate technician productivity, or identify underperforming revenue channels.

This feature delivers the **7-Day Revenue Trend Comparison Engine (SIAA-34)**:
1. **7-Day Grouped Comparative Bar Chart**: Displays a rolling 7-day comparative trend visualization contrasting Motorcycle Parts Sales against Repair Bay Labor Services for each day of the week (Monday through Sunday / Today).
2. **Standardized Color-Coded Bars & Semantic Classes**: Displays distinct color-coded bar pairs: Blue (`.bar-parts` / `bg-primary`) for Motorcycle Parts Sales and Sky/Cyan Blue (`.bar-labor` / `bg-info`) for Repair Bay Labor Services, mapped strictly to SWIFT semantic tokens.
3. **Dynamic Value Badges & Tooltips on Hover**: Each individual channel bar reveals exact monetary revenue formatted in Philippine Pesos (`₱48.0k`, `₱12.0k`) via a floating tooltip and accessible DOM `data-val` attribute.
4. **Context Header & Interactive Channel Legend**: Card header displays a neutral date badge indicating the 7-day calendar span (e.g., `Sept 22 - 28, 2026`), and a bottom legend with dot markers distinguishing channels with interactive toggle filtering.
5. **Proportional Scale Normalization Engine**: Dynamically calculates peak revenue across all days and channels, scaling bar heights proportionally from 0% to 100% with minimum height protection (e.g., 4%) to prevent visual collapse or clipping on slow days.

---

## 2. Clarifications & Architectural Decisions

### Session 2026-10-15
- **Q: How should bar heights be calculated when daily figures vary substantially?**  
  → **A**: Bar heights scale proportionally relative to the peak channel amount observed in the 7-day period (`peakThreshold = max(channelAmounts)`). A non-zero minimum height (4%) ensures visibility and hoverability for small values, and 100% caps maximum height.
- **Q: How should currency values be displayed on hover badges and data attributes?**  
  → **A**: Formatted in compact Philippine Peso notation (`formatCompactCurrencyPhp`): values >= 1,000 render as `₱<amount/1000>k` (e.g. `₱48.0k`, `₱12.0k`), while values < 1,000 render as `₱<amount>`. Both `data-val` and on-hover floating badges display this value.
- **Q: Which CSS classes must be present in the DOM for automated tests and styling conformity?**  
  → **A**: Each bar group container has `.chart-bar-group`, each bar has `.chart-bar`, parts bars have `.bar-parts`, and labor bars have `.bar-labor`, mirroring `../mockup/admin.html` and `../mockup/style.css`.
- **Q: How does real-time POS checkout affect today's bar?**  
  → **A**: Incremental parts sales or labor fees received via real-time events (`todayPartsIncrement`, `todayLaborIncrement`) update Sunday / Today's bar amounts and recalculate proportional heights dynamically.

---

## 3. User Scenarios & Acceptance Criteria (Gherkin)

### Scenario 1: 7-Day Comparative Bar Chart Rendering
```gherkin
Given historical sales and labor transactions for the rolling 7-day period (Monday to Sunday / Today)
When an executive opens the admin dashboard view
Then the chart container renders 7 grouped bar pairs representing each day of the week
And each day displays two distinct, color-coded bars: Blue (".bar-parts") for Motorcycle Parts Sales and Purple / Sky-Blue (".bar-labor") for Repair Bay Labor Services.
```

### Scenario 2: Data Value Badges & Tooltips on Hover
```gherkin
Given the 7-day revenue comparison chart
When a user hovers over an individual parts or labor bar
Then a floating tooltip or bar data attribute ("data-val", e.g., "₱48.0k") dynamically reveals the exact monetary revenue generated for that channel on that day.
```

### Scenario 3: Date Range Context Header & Chart Legend
```gherkin
Given the revenue comparison panel card
When rendered on screen
Then the card header displays a neutral date badge indicating the 7-day calendar span (e.g., "Sept 22 - 28, 2026")
And the bottom of the chart includes a visual legend with dot markers distinguishing "Motorcycle Parts Sales" from "Repair Bay Labor Services".
```

### Scenario 4: Proportional Scale Normalization
```gherkin
Given varying daily revenue figures across slow weekdays and peak weekend surges
When bar heights are computed
Then heights scale proportionally up to 100% relative to the peak revenue threshold, preventing visual clipping or zero-height distortion.
```

---

## 4. Non-Functional Requirements & Governance

1. **Design Tokens Compliance**: All colors must use SWIFT semantic tokens (`bg-bg-card`, `bg-bg-surface`, `bg-primary`, `bg-info`, `text-text-primary`, `text-text-secondary`, `border-border`, etc.). Zero hardcoded hex or RGB.
2. **Responsive Layout**: Accommodates screen sizes from mobile (`h-52`, compact gap) to wide desktop (`h-56`, `gap-6`).
3. **Accessibility (WCAG 2.1 AA)**: Interactive bars and legend filter buttons have keyboard support, descriptive ARIA attributes, and accessible contrast.
4. **Resilience**: Zero division protection and graceful handling of empty or missing daily data.
