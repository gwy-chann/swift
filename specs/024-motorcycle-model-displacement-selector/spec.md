# Feature Specification: Motorcycle Make, Model & Displacement Selector Engine

**Feature Branch**: `feat/SIAA-23-motorcycle-model-displacement-selector`  
**Created**: 2026-10-14  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23) (STORY-4.1)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Executive Summary & Objective

In motorcycle spare parts retail and workshop service, incorrect part fitment is a leading cause of customer dissatisfaction, returned goods, and mechanic downtime. Customers often ask counter clerks for parts using common motorcycle nicknames (e.g. "NMAX V2", "Click 150", "Raider Fi", "ADV") without knowing specific technical OEM part numbers or year cutoffs.

While the foundation schema and migration for motorcycle models was established in SIAA-53 (`supabase/migrations/20261011000000_motomatcher_compatibility.sql`), the user-facing interface currently lacks an interactive, reactive selection engine. Both the Admin Portal (`/admin/motomatcher`) and the Staff Floor Terminal (`/staff/compat`) require a unified, lightning-fast Motorcycle Make, Model & Displacement Selector Engine.

This feature delivers:
1. **Interactive Visual Model Selection Grid**: Renders touch-friendly, keyboard-accessible quick-select model cards for popular Philippine motorcycle platforms (e.g. Yamaha NMAX 155, Honda Click 125i/150i, Suzuki Raider 150 Fi, Honda ADV 160 / PCX 160, Yamaha Aerox 155).
2. **Instant State & Highlight Switching**: Selection transitions complete instantaneously (< 50ms) with visible semantic highlight styling (`border-primary`, `bg-primary-light`, `text-primary`) without page reloads.
3. **Dynamic Brand & Substring Search Filtering**: Real-time debounce-free instant filtering across make, model name, displacement (cc), and category as the clerk types search queries.
4. **Empty State & Universal Fallback**: Helpful empty state display when no motorcycle model matches a search query, with clear affordances to explore Universal parts.
5. **Seamless Cross-Portal Consistency**: Responsive integration into both the Admin MotoMatcher Management view (`/admin/motomatcher`) and the Staff Floor Terminal (`/staff/compat`), adhering 100% to SWIFT semantic design tokens and Tailwind CSS v4.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### User Story 1 - Motorcycle Platform Selection & Visual Highlight (Priority: P1)

* **As a** Counter Clerk or Service Desk Advisor,
* **I want to** select a customer's specific motorcycle make, model, and engine displacement from an interactive visual selector grid,
* **so that** the system instantly activates the chosen bike profile and filters compatible parts without incompatible recommendations.

#### Scenario 1: Default Motorcycle Selection Grid Render
* **Given** the user navigates to the "MotoMatcher Search" view in Admin (`/admin/motomatcher`) or Staff portal (`/staff/compat`),
* **When** the view initializes,
* **Then** it renders quick-select model cards for popular Philippine models (e.g., Yamaha NMAX 155, Honda Click 125i/150i, Suzuki Raider 150 Fi, Honda ADV 160, Yamaha Aerox 155),
* **And** sets the default active model (e.g., Yamaha NMAX 155) with visible active highlight styling (`border-primary`, `bg-primary-light`),
* **And** displays motorcycle metadata on each card: Make badge, Model name, Displacement (cc), and Year coverage.

#### Scenario 2: Real-Time Model Switching (< 50ms)
* **Given** the visual motorcycle selection grid is rendered,
* **When** the clerk clicks a different motorcycle card (e.g. "Honda Click 125i/150i") or presses Enter/Space while focused,
* **Then** the active card highlight shifts instantly in under 50ms,
* **And** the selected motorcycle state updates reactively across parent containers without full page reloads.

---

### User Story 2 - Instant Search & Brand Filtering (Priority: P2)

* **As a** Counter Clerk handling high-volume customer inquiries,
* **I want to** search motorcycle models by brand, model name, or engine displacement keywords,
* **so that** I can rapidly locate a specific motorcycle platform from an expanding catalog of models.

#### Scenario 3: Motorcycle Brand & Search Filtering
* **Given** a list of registered motorcycle platforms,
* **When** the clerk types a search term (e.g. `"ADV"`, `"Raider"`, `"Yamaha"`, or `"150"`),
* **Then** the model grid filters dynamically in real time to display only matching motorcycle models,
* **And** updates the visible match count badge.

#### Scenario 4: Empty Model State Handling & Universal Prompt
* **Given** a query for a non-existent or unsupported motorcycle model (e.g. `"Harley 1200"`),
* **When** no matching models are found,
* **Then** the system displays a clear "No matching motorcycle model found" message,
* **And** presents an actionable button to "Clear Search" or "View Universal / Multi-Fit Parts".

---

## 3. Business Invariants & Rules

1. **Active Selection Invariant**: An active motorcycle model must always be selected once models are loaded, unless an explicit "All Models" or "Universal" filter is engaged.
2. **Deterministic Fallback**: If the active model is filtered out by search criteria, the selector must retain selection state internally while presenting the empty search state, or allow selecting any visible matching card.
3. **Zero Hardcoded Colors**: All borders, backgrounds, text colors, and focus rings must strictly use SWIFT tokens (`bg-bg-surface`, `bg-bg-card`, `border-border`, `border-primary`, `bg-primary-light`, `text-primary`, `text-text-primary`, `text-text-muted`).
4. **Sub-50ms Reactivity**: Card selection and search filtering must be entirely client-side reactive without network latency pauses during interactive typing and clicking.

---

## 4. Functional Requirements

- **FR-001**: System MUST provide a reusable, client-side `MotorcycleSelector` component supporting both Admin and Staff portal layouts.
- **FR-002**: System MUST render model cards displaying `make`, `model`, `displacement_cc`, `year_start`, and optional `year_end`.
- **FR-003**: System MUST support instant search input filtering by `make`, `model`, `displacement_cc`, and `category`.
- **FR-004**: System MUST trigger an `onSelectModel(model)` callback upon user selection.
- **FR-005**: System MUST provide keyboard accessibility (Enter/Space to select, Tab navigation, ARIA `role="radiogroup"` or `role="button"` with `aria-pressed` / `aria-checked`).
- **FR-006**: System MUST render a dedicated empty state with "Reset Search" and "Universal Parts" actions when query produces 0 matches.
- **FR-007**: System MUST integrate with existing `getMotorcycleModelsAction()` from `lib/actions/motomatcher-actions.ts` for SSR and client hydration.
- **FR-008**: System MUST integrate with `/admin/motomatcher` to drive active model selection.
- **FR-009**: System MUST integrate with `/staff/compat` to drive floor compatibility searches.

---

## 5. Clarifications & Resolved Edge Cases

- **C-1: Brand Filter Chips & Text Search Coexistence**: In addition to text search, the selector provides brand filter chips ("All Brands", "Yamaha", "Honda", "Suzuki", "Universal") to enable 1-tap filtering on touch screens without opening the software keyboard.
- **C-2: Initial Active Selection**: By default, upon mounting with models present, the first model in the list (or `Yamaha NMAX 155` if available) is selected as the active model with visible highlight tokens.
- **C-3: Universal / Multi-Fit Representation**: When the user selects "Universal / Multi-Fit", an event with `isUniversal: true` or a model record with `model: "Universal"` is emitted, prompting parent views to display universal parts.
- **C-4: Search Query Reset on Brand Pill Click**: Clicking an explicit brand filter chip does not wipe out active text search unless the user taps "All Brands" or clears the search bar.

---

## 6. Non-Functional Requirements & Design System

- **Performance**: Selection state switch latency < 50ms; search input responsive with zero UI lag.
- **Accessibility**: WCAG 2.1 AA compliant; clear focus outlines (`focus-visible:ring-2 focus-visible:ring-primary`); minimum 44x44px interactive tap target sizes on touch devices.
- **Theming**: Automatic dark mode support via semantic CSS tokens (`.dark` / `[data-theme="dark"]`).
