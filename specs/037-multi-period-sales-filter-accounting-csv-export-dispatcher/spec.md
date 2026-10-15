# Feature Specification: Multi-Period Sales Filter & Accounting CSV Export Dispatcher

**Feature Branch**: `feat/SIAA-37-multi-period-sales-filter-accounting-csv-export-dispatcher`  
**Created**: 2026-10-16  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-37](https://the-three-devsketeers.atlassian.net/browse/SIAA-37) (STORY-6.5)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Prerequisites**: [SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9) (Admin Portal Shell), [SIAA-36](https://the-three-devsketeers.atlassian.net/browse/SIAA-36) (Categorized P&L Breakdown & COGS Engine), [SIAA-67](https://the-three-devsketeers.atlassian.net/browse/SIAA-67) (Executive Analytics & P&L RPCs)  
**Downstream Dependents**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  

---

## Executive Summary & Business Intent

In a fast-paced motorcycle parts dealership and repair workshop, business owners and CPAs require dynamic financial timeframes to assess real-time performance. Daily sales guide immediate cashflow reconciliation, weekly figures track shop mechanic throughput, and monthly reports serve tax filings and accounting audits.

This feature implements the **Multi-Period Sales Filter & Accounting CSV Export Dispatcher** in the SWIFT Admin Portal reports module (`#view-reports`, `/admin/reports`). It enables administrators to seamlessly toggle between **Daily Sales**, **Weekly Sales**, and **Monthly Sales** filters with reactive state transitions and immediate recalculation of Gross Sales Revenue, COGS, Net Profit, and Invoice count. Furthermore, it provides an accounting-grade RFC 4180-compliant **CSV Export Dispatcher** for external ledger reconciliation, along with a printable executive summary trigger that automatically strips away navigation bars, action buttons, and non-printable chrome.

---

## Clarifications & Edge Cases

### Clarification Session
- **Q**: What specific time boundaries define Daily, Weekly, and Monthly sales periods?  
  **A**: 
  - **Daily**: The current calendar day from `00:00:00.000` to `23:59:59.999` local time.
  - **Weekly**: Rolling 7-day interval covering the previous 6 days through current end-of-day.
  - **Monthly**: Current calendar month from the 1st of the month at `00:00:00.000` through the current timestamp.
- **Q**: What file naming convention and data sanitization standard must be used for CSV exports?  
  **A**: Filenames follow `swift_revenue_report_YYYY-MM-DD.csv` (or period-annotated `swift_revenue_report_<period>_YYYY-MM-DD.csv`). Cells containing commas, quotes, or newlines must be enclosed in double quotes with internal quotes escaped (`""`), conforming to RFC 4180.
- **Q**: How does the printable executive summary behave across different devices?  
  **A**: When the print action is triggered (or browser `window.print()` invoked), the dedicated `@media print` CSS rules ensure the navigation sidebar, mobile drawers, header buttons, and theme toggles are hidden (`display: none !important`), rendering an unobstructed, clean white-background report layout suitable for PDF archiving or physical paper distribution.
- **Q**: What happens when an empty date range or zero transactions exist?  
  **A**: The summary cards safely display `₱0.00` across `0 Completed Invoices` without division-by-zero errors or NaN crashes. The CSV export outputs valid headers with zero-value total rows.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Period Date Filter Switching (Priority: P1)

As a Motorcycle Shop Owner or Certified Public Accountant (CPA),  
I want to toggle reporting views between Daily, Weekly, and Monthly sales periods,  
so that I can evaluate business velocity across distinct operational horizons without manual data aggregation.

**Why this priority**: Essential requirement for high-level store health and multi-interval performance evaluation.

**Independent Test**: Navigate to `#view-reports`, click "Daily Sales", "Weekly Sales", and "Monthly Sales" filter buttons, asserting that the active button reflects primary active styling (`bg-primary text-text-light`) while inactive buttons switch to secondary styling (`text-text-secondary hover:text-text-primary`), and all metrics immediately refresh.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Multi-Period Date Filter Switching
  Given the reporting view ("#view-reports")
  When a user clicks between "Daily Sales", "Weekly Sales", or "Monthly Sales" filter buttons
  Then the active button reflects primary active styling ("btn-primary" / "bg-primary text-text-light")
  And inactive buttons switch to secondary styling ("btn-secondary" / "text-text-secondary")
  And the gross sales, COGS, net profit, and invoice count immediately recalculate to reflect the chosen timeframe
```

---

### User Story 2 - Accounting-Grade CSV Export Generation (Priority: P1)

As a Certified Public Accountant (CPA) or Bookkeeper,  
I want to export structured sales and P&L data directly into a sanitized CSV file,  
so that I can import financial figures into external accounting software and conduct tax preparation.

**Why this priority**: Mandated workflow for external compliance, tax filing, and bookkeeping integration.

**Independent Test**: Click "Export CSV / Print" button in `#view-reports`, verifying that a valid CSV file `swift_revenue_report_YYYY-MM-DD.csv` is compiled and downloaded with correct RFC 4180 formatting and headers.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Accounting-Grade CSV Export Generation
  Given calculated sales and category margin figures in the active report view
  When the user clicks the "Export CSV" or "Export CSV / Print" button
  Then the system compiles a sanitized CSV data string containing headers:
    | Category | Units Sold | Gross Revenue | COGS | Net Profit | Margin % |
  And triggers a direct browser file download (e.g. "swift_revenue_report_2026-10-16.csv")
  And formatted for immediate import into Excel or accounting software
```

---

### User Story 3 - Printable Executive Summary Layout Trigger (Priority: P1)

As an Executive preparing an in-person briefing or printed store audit,  
I want to trigger a clean printable report view that strips away interface chrome,  
so that the resulting printout or PDF is clean, professional, and free of extraneous website controls.

**Why this priority**: Supports shop owner physical record-keeping and formal management meetings.

**Independent Test**: Trigger print modal or verify `@media print` rules, confirming that sidebars, action buttons, theme toggles, and filters are suppressed while financial summary cards and category tables print cleanly.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Printable Executive Summary Layout Trigger
  Given an executive preparing a printed briefing
  When triggering the print/export dialog
  Then the application triggers clean print stylesheet styling removing sidebar navigation, interactive buttons, and non-printable chrome
```

---

### User Story 4 - Graceful Zero-Data & Empty Period Handling (Priority: P1)

As a New Shop Operator or Store Manager inspecting an off-peak period,  
I want the reporting dashboard and export dispatcher to handle zero transactions gracefully,  
so that the interface never crashes or displays arithmetic errors like NaN or Infinity.

**Why this priority**: Critical for system reliability, new store onboarding, and resilient edge-case handling.

**Independent Test**: Load the report with zero transactions or select an empty timeframe, verifying summary cards show `₱0.00` across 0 invoices and CSV export downloads with clean zero-value records.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Graceful Zero-Data / Empty Range Handling
  Given a newly initialized store or selected time period with zero transactions
  When viewing reports or triggering CSV export
  Then the summary cards display "₱0.00" with 0 invoices
  And the export outputs valid CSV headers without errors or crashes
```

---

## Technical Invariants & Requirements

1. **Design Tokens Compliance**: ZERO hardcoded colors. All UI elements must strictly use semantic token utility classes (`bg-bg-card`, `bg-bg-surface`, `bg-primary`, `text-text-primary`, `text-text-secondary`, `text-success`, `border-border`, etc.).
2. **Container Identifier**: The parent section element must maintain `id="view-reports"` to satisfy mockup and automated test selectors.
3. **Print Stylesheet Isolation**: Dedicated print CSS utility (`print:hidden`, `@media print`) ensuring that navigation sidebars, buttons, and app headers are excluded from printed documents.
4. **RFC 4180 Conformance**: All CSV cell values containing commas, double quotes, or newlines must be quoted with internal quotes escaped as `""`.
5. **Accessibility (WCAG 2.1 AA)**: All filter toggle buttons must have distinct aria-pressed or role="tab" attributes with high contrast states and keyboard navigable focus indicators.
