# Feature Specification: Categorized Profit & Loss (P&L) Breakdown & Cost of Goods Sold (COGS) Engine

**Feature Branch**: `feat/SIAA-36-categorized-profit-loss-breakdown-cogs-engine`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-36](https://the-three-devsketeers.atlassian.net/browse/SIAA-36) (STORY-6.4)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Prerequisites**: [SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9) (Admin Portal Shell), [SIAA-12](https://the-three-devsketeers.atlassian.net/browse/SIAA-12) (Domain Models & Mock Engine), [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18) (Hybrid POS Cart Engine), [SIAA-67](https://the-three-devsketeers.atlassian.net/browse/SIAA-67) (Executive Analytics & P&L RPCs)  
**Downstream Dependents**: [SIAA-37](https://the-three-devsketeers.atlassian.net/browse/SIAA-37) (Multi-Period Sales Filter & Accounting CSV Export Dispatcher)  

---

## Executive Summary & Business Intent

For an active motorcycle dealership and service workshop, gross revenue alone can be deceptive. A high-volume parts line sold near wholesale cost generates little net income, while workshop repair labor and specialized fluids yield high profit margins. 

This feature implements the **Categorized Profit & Loss (P&L) Breakdown & Cost of Goods Sold (COGS) Engine** in the SWIFT Admin Portal (`#view-reports`, `/admin/reports`). It contrasts Gross Sales Revenue against direct wholesale inventory acquisition costs (COGS) and labor consumables, providing shop owners and accountants with instant visibility into net profits and margin percentages across each parts category and workshop service.

---

## Clarifications

### Session 2026-10-15
- **Q**: What constitutes the target margin threshold for visual highlighting?  
  **A**: 30.0% (`>= 30.0%`). Categories meeting or exceeding 30.0% display bold green profit styling (`text-success font-semibold`), while categories below 30.0% are visually flagged (`text-text-secondary` or `text-accent` badge) for pricing review.
- **Q**: How are unit quantities displayed for workshop labor versus physical parts?  
  **A**: Physical spare parts display integer counts (e.g., `24`), whereas workshop labor displays as `X Jobs` (e.g., `14 Jobs`).
- **Q**: What mathematical formulas govern the calculations?  
  **A**:  
  `Net Profit = Gross Revenue - COGS`  
  `Margin % = (Net Profit / Gross Revenue) * 100`, rounded to 1 decimal place. When Gross Revenue is 0, Margin % is safely evaluated as `0.0%` without division-by-zero errors.
- **Q**: What is the section anchor and routing structure?  
  **A**: Mounted at `/admin/reports` with root container identifier `id="view-reports"`, maintaining consistency with `../mockup/admin.html` and `../docs/swift_site_map.md`.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aggregate Financial Metric Cards in Reports (Priority: P1)

As a Motorcycle Shop Owner or Accountant,  
I want to review consolidated financial cards showing Gross Sales Revenue, COGS, Net Profit, and overall Margin % in the reports view,  
so that I can evaluate high-level business health and net margins at a single glance.

**Why this priority**: Fundamental executive reporting baseline required before inspecting granular category details.

**Independent Test**: Mount `#view-reports` with settled transaction data and verify all four metric cards render formatted currency (PHP `₱`) and target indicators.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Aggregate Financial Metric Cards in Reports
  Given settled invoices in the reporting store
  When an administrator navigates to the "#view-reports" section
  Then four financial summary cards display:
    1. Gross Sales Revenue (e.g., "₱45,230.00" across 38 completed invoices)
    2. Cost of Goods / COGS (e.g., "₱29,400.00" direct wholesale inventory cost)
    3. Net Profit Margin in currency (e.g., "₱15,830.00" net after labor and parts cost)
    4. Profit Margin % (e.g., "35.0%" with a target range indicator ">30%")
```

---

### User Story 2 - Category Revenue & Margin Breakdown Table (Priority: P1)

As a Parts Inventory Manager or Accountant,  
I want an itemized breakdown table detailing Units Sold, Gross Revenue, COGS, Net Profit, and Margin % grouped by category,  
so that I can identify our most profitable inventory lines and detect low-margin categories.

**Why this priority**: Core deliverable of STORY-6.4 allowing managers to make informed inventory purchasing and retail pricing decisions.

**Independent Test**: Render the Category Breakdown table with transactions spanning Fluids, Drivetrain, Labor, Tires, Brakes, and Electrical, verifying that each row accurately lists unit counts, revenue, COGS, net profit, and margin.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Category Breakdown Table Rendering
  Given transactions across distinct merchandise and workshop categories (Fluids & Engine Oils, Drivetrain & Belts, Labor / Service Bay, Tires & Tubeless)
  When viewing the "Category Revenue & Margin Breakdown" table
  Then each category row displays Units Sold, Gross Revenue, COGS, Net Profit, and Margin percentage
```

---

### User Story 3 - Accurate Net Profit & Margin Computation Formula (Priority: P1)

As a Financial Auditor or Business Analyst,  
I want all category profit figures and margin percentages to be mathematically verified with zero-denominator safety,  
so that financial statements and decisions are based on accurate formulas.

**Why this priority**: Prevents arithmetic bugs, runtime NaN / Infinity crashes, and misreported financial ratios.

**Independent Test**: Test calculation engine with various sales figures including ₱0 revenue, zero-cost service labor, and negative profit items.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Accurate Net Profit & Margin Computation Formula
  Given any category line item
  When calculating financial figures
  Then Net Profit = Gross Revenue - COGS
  And Margin % = (Net Profit / Gross Revenue) * 100, rounded to one decimal place
  And high-margin service categories (e.g., Labor at 82.3%) are clearly highlighted
```

---

### User Story 4 - High-Yield Margin Visual Highlighting (Priority: P1)

As an Executive or Shop Supervisor,  
I want product categories meeting or exceeding our target margin (>=30%) to be highlighted in bold green styling and underperforming lines clearly marked,  
so that profitable categories stand out instantly during review.

**Why this priority**: Enhances visual scanability and adheres to SWIFT design token standards (`text-success`, `bg-success-light`).

**Independent Test**: Render table with categories above and below 30% margin and assert proper CSS token classes are applied.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: High-Yield Margin Visual Highlighting
  Given computed margin percentages across all product categories
  When the table is rendered
  Then categories meeting or exceeding target margins display bold green net profit styling (text-success font-semibold)
  And underperforming margins are flagged for pricing review
```

---

## Technical Invariants & Requirements

1. **Semantic Design Tokens**: ZERO hardcoded hex/RGB colors; all styles must strictly use `bg-bg-card`, `bg-bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `bg-success-light`, `text-success`, `bg-accent-light`, `text-accent`.
2. **Container Identifier**: Root section must maintain `id="view-reports"` to support site-map anchors and automated test selectors.
3. **Currency Formatting**: Standardized Philippine Peso symbol (`₱`) with comma thousands separator and two decimal places (`₱#,##0.00`).
4. **Data Engine**: Server-first architecture with React Server Action / Supabase RPC integration (`get_category_pnl`) and resilient fallback mock data engine for offline/development mode.
5. **Accessibility**: All table headers must have proper scope (`scope="col"`), high contrast ratio (WCAG AA), and descriptive aria labels for stat cards.
