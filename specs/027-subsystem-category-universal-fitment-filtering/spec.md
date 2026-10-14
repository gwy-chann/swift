# Feature Specification: Subsystem Category & Universal vs. Dedicated Fitment Filtering

**Feature Branch**: `feat/SIAA-26-subsystem-category-universal-fitment-filtering`  
**Created**: 2026-10-14  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-26](https://the-three-devsketeers.atlassian.net/browse/SIAA-26) (STORY-4.4)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Executive Summary & Objective

In high-pace motorcycle repair bays and counter parts lookup, mechanics and counter specialists need to diagnose and quote specific repair jobs (such as brake servicing, CVT belt and roller replacement, or fluid changes). When a motorcycle platform is selected in MotoMatcher, the matrix returns dozens of compatible items across every category. Without focused subsystem filtering and universal item controls, users must sift through unrelated parts, slowing down quote preparation and increasing visual friction.

Building upon the Motorcycle Selector Engine ([SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23)) and Side-by-Side Comparison Matrix ([SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24)), this feature introduces:
1. **Interactive Subsystem Category Pill Filtering**: Quick chips/pills for primary subsystems (Brakes, CVT / Drivetrain, Fluids, Ignition, Engine, Tires, Electrical, Suspension) that filter both OEM and Aftermarket columns synchronously.
2. **"All Parts" Instant Reset**: A dedicated reset pill to immediately restore the unfiltered compatibility matrix.
3. **Universal Parts Visibility Toggle**: A toggle switch or checkbox ("Include Universal Parts") allowing mechanics to isolate dedicated, model-specific components (`model !== 'Universal'`) or include general-purpose fluids and consumables.
4. **Dynamic Synchronous Header Badges**: Real-time counter indicators in the OEM and Aftermarket column headers (`OEM (X)` vs `Aftermarket (Y)`) reflecting active filtered subsets.
5. **Cross-Portal Consistency**: Seamless availability across both Staff Floor Terminal (`/staff/compat`) and Admin MotoMatcher (`/admin/motomatcher`) views adhering strictly to SWIFT design tokens.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### User Story (Jira STORY-4.4)

* **As a** Floor Mechanic or Parts Specialist,
* **I want to** filter matched compatibility results by component subsystem and toggle universal parts visibility,
* **so that** I can rapidly troubleshoot specific repair areas (e.g. CVT, Brakes, Suspension) without visual clutter.

---

### Scenario 1: Subsystem Category Pill Filtering (Priority: P1)

* **Given** a selected motorcycle model with matched parts across multiple categories (e.g. Yamaha NMAX 155 with Brakes, CVT, Fluids, and Tires),
* **When** the user clicks a subsystem category chip (e.g., "CVT / Transmission", "Brakes", "Fluids", "Tires", "Electrical"),
* **Then** both OEM and Aftermarket columns filter synchronously to show only parts belonging to that category,
* **And** the selected chip receives active visual styling using SWIFT brand primary tokens (`bg-primary text-white border-primary`).

---

### Scenario 2: "All Categories" Reset Action (Priority: P1)

* **Given** a subsystem category filter is currently active,
* **When** the user selects the "All Parts" (or "All Systems") chip,
* **Then** the full matrix of compatible parts for the active motorcycle platform is restored instantly (< 16ms),
* **And** the "All Parts" chip displays active styling.

---

### Scenario 3: Universal Parts Visibility Toggle (Priority: P1)

* **Given** the MotoMatcher matrix view displaying both model-specific parts and universal items (e.g., universal 4T engine oils or brake fluids),
* **When** the user unchecks / toggles "Include Universal Parts" to disabled,
* **Then** parts tagged with `model === 'Universal'` or `isUniversal === true` are excluded immediately,
* **And** only model-specific dedicated OEM and aftermarket components are displayed,
* **When** the user re-enables "Include Universal Parts",
* **Then** compatible universal parts reappear in the results.

---

### Scenario 4: Result Count Indicators (Priority: P1)

* **Given** active category and fitment filters,
* **When** results are rendered in the MotoMatcher matrix,
* **Then** counter badges in the OEM and Aftermarket headers display the exact number of matching items (e.g., "OEM (4)" vs "Aftermarket (7)"),
* **And** the summary counter in the platform banner updates to reflect the sum of matching items.

---

### Scenario 5: Empty Filter State Feedback (Priority: P2)

* **Given** a motorcycle platform that has no matching parts in a specific subsystem category (e.g. "Suspension"),
* **When** the user selects that category chip,
* **Then** both columns render an informative, non-disruptive empty state (e.g., "No OEM parts in Brakes" / "No Aftermarket parts in Brakes"),
* **And** clear guidance is provided to reset filters or check distributor catalogs.

---

## 3. Dependencies & Relationships

* **Prerequisites (Blocked by)**:
  * [SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23) (Motorcycle Make, Model & Displacement Selector Engine)
  * [SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24) (Side-by-Side OEM vs. Aftermarket Performance Comparison Matrix)
* **Blocks (Enables)**:
  * [SIAA-27](https://the-three-devsketeers.atlassian.net/browse/SIAA-27) (Staff Floor Terminal Touch-Optimized MotoMatcher & Shelf Locator Integration)
* **Related To**:
  * [SIAA-13](https://the-three-devsketeers.atlassian.net/browse/SIAA-13) (Master Parts Catalog & Multi-Attribute Search Filtering - category taxonomy)
  * [SIAA-25](https://the-three-devsketeers.atlassian.net/browse/SIAA-25) (1-Click Fast-Lane POS Cart Insertion & Live Upsell Dispatch)

---

## 4. Requirements

### Functional Requirements

- **FR-001**: System MUST provide a responsive horizontal subsystem category filter bar containing standard motorcycle subsystem chips: "All Parts", "Brakes", "CVT / Drivetrain", "Fluids", "Ignition & Electrical", "Engine & Clutch", "Tires & Wheels", "Suspension", and "Accessories".
- **FR-002**: System MUST synchronously filter both OEM and Aftermarket columns in `<ComparisonMatrix />` whenever an active category chip changes.
- **FR-003**: System MUST provide an "All Parts" reset chip that clears category filtering and shows all matching components for the current model platform.
- **FR-004**: System MUST provide a toggle control labeled "Include Universal Parts" (default: enabled / checked) allowing users to exclude or include universal fitment items.
- **FR-005**: When "Include Universal Parts" is unchecked (`false`), all parts with `model.toLowerCase() === 'universal'` or `isUniversal === true` MUST be excluded from both matrix columns.
- **FR-006**: System MUST update column header count indicators (`OEM (N)` and `Aftermarket (M)`) and total count badges in real-time (< 16ms) reflecting the intersection of platform, category, and universal filters.
- **FR-007**: Subsystem category matching MUST support canonical category names as well as category aliases (e.g., "Brakes", "Drivetrain" / "CVT", "Fluids", "Ignition", "Engine", "Tires").
- **FR-008**: System MUST display graceful empty state notices when a selected category yields zero matching parts in one or both columns without causing layout collapse.
- **FR-009**: System MUST support keyboard navigation (`Tab`, `Space`, `Enter`) and accessible ARIA attributes (`role="radiogroup"` / `role="radio"`, `aria-checked`, `aria-pressed`) on all category chips and toggle controls.
- **FR-010**: All UI components and state transitions MUST strictly utilize SWIFT semantic design tokens (`bg-bg-surface`, `bg-primary`, `text-primary`, `border-border`, `bg-bg-card`, etc.) with zero hardcoded hex/rgb color values.

### Key Entities

- **SubsystemCategory**: Taxonomy entity representing standard motorcycle repair subsystem classifications (`ALL`, `Brakes`, `Drivetrain`, `Fluids`, `Ignition`, `Engine`, `Tires`, `Suspension`, `Electrical`, `Accessories`).
- **MotoMatcherFilterState**: In-memory state tracking active filter selections:
  - `selectedModel`: `MotorcycleModelRecord | null`
  - `systemCategory`: `string` ("ALL" or specific category ID)
  - `includeUniversal`: `boolean` (default `true`)
- **ComparisonPartItem**: Normalized representation of a compatible part item partitioned by OEM flag with shelf locator, pricing, and stock status.

---

## 5. Success Criteria & Quality Metrics

- **SC-001**: Clicking any subsystem category chip filters both OEM and Aftermarket columns with zero perceivable delay (< 16ms).
- **SC-002**: Unchecking "Include Universal Parts" filters out 100% of universal components, leaving only dedicated platform components in view.
- **SC-003**: Column header counters (`OEM (N)` and `Aftermarket (M)`) accurately equal the visible item count across 100% of filter combinations.
- **SC-004**: Selecting "All Parts" restores 100% of compatible components for the active motorcycle platform.
- **SC-005**: 100% compliance with SWIFT design tokens (zero hardcoded `#hex` or `rgb(...)` values) in light and dark mode.
- **SC-006**: 100% passing automated unit tests covering category filtering, universal exclusion, reset behavior, and badge counters.

---

## 6. Clarifications & Resolved Decisions

### Session 2026-10-14
- **Q: What is the initial default state of the "Include Universal Parts" toggle?**
  - **A**: Enabled (`includeUniversal = true`). By default, universal items (such as standard engine oils, fluids, and general-fit spark plugs) are visible alongside model-specific parts. When unchecked by the mechanic, universal items are excluded, focusing exclusively on dedicated platform parts.
- **Q: How does the category filter interact when the user selects the "Universal" platform card from the model selector?**
  - **A**: When "Universal / Multi-Fit Components" is selected as the active platform, the category pills continue to filter across universal items (e.g., clicking "Fluids" shows universal oils; clicking "Tires" shows universal tire sizes). The "Include Universal Parts" toggle remains enabled.
- **Q: How should category alias matching behave when inventory items have varied taxonomy strings (e.g., "CVT", "Drivetrain", "Drive & CVT")?**
  - **A**: The filter engine normalizes strings via an alias map: selecting "CVT / Drivetrain" matches items categorized under "Drivetrain", "CVT", or "Transmission", ensuring no compatible parts are lost due to vendor nomenclature discrepancies.

