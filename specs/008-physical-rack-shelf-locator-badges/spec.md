# Feature Specification: Physical Rack & Shelf Locator Mapping & Warehouse Navigation Badges

- **Feature Key**: `SIAA-14`
- **Parent Epic**: `SIAA-2` (EPIC-2: Inventory & Warehouse Rack/Shelf Management)
- **Target Branch**: `feat/SIAA-14-shelf-locator-mapping`
- **Scope**: Components, Utilities, Domain Models & Catalog Integration

---

## 1. Executive Summary

In a high-throughput motorcycle parts retail and repair facility, mechanics and warehouse order pickers cannot afford wasted time searching through disorganized storage bays. Standardized, high-contrast shelf locator badges and real-time location filtering enable warehouse order pickers and floor technicians to identify the physical bin of any cataloged part in under 5 seconds.

Additionally, catalog items lacking a physical storage assignment present an operational vulnerability; an explicit amber warning badge (`Unassigned Bay`) alerts inventory managers immediately to allocate bin assignments before stock discrepancy occurs.

---

## 2. User Stories & Acceptance Criteria

### User Story (Mike Cohn Format)
**As a** Floor Mechanic or Warehouse Order Picker,  
**I want to** clearly see standardized physical aisle, rack, and shelf location tags for every cataloged part,  
**so that** I can walk straight to the correct storage bin and retrieve parts in under 5 seconds during busy service jobs.

### Acceptance Criteria (Gherkin Scenarios)

#### Scenario 1: Standardized Shelf Locator Badge Display
- **Given** a product row rendered in the inventory table or picking list
- **When** the location column is displayed
- **Then** it renders a distinct high-contrast `.shelf-location-tag` badge following the standardized format (e.g. `Rack A-01 / Shelf 2`, `Aisle 1 / Shelf 1`, `Tire Rack 2 / Floor`).

#### Scenario 2: Location-Specific Filtering on Shop Floor
- **Given** a floor picker looking for all items stored on a specific rack or shelf
- **When** they type "Rack A-01" or "Shelf 2" into the search bar
- **Then** all parts physically assigned to that rack/shelf are filtered and listed immediately without case sensitivity.

#### Scenario 3: Empty Location Fallback Warning
- **Given** a product in the catalog with no assigned physical location (empty string, whitespace, or undefined)
- **When** the row is rendered
- **Then** it displays an amber warning badge `Unassigned Bay` with an alert icon, prompting the inventory clerk to assign a location.

---

## 3. UI/UX & Design Tokens Conformance

All visual elements must adhere to the SWIFT Design System:
- **Shelf Locator Tag**:
  - CSS Class: `shelf-location-tag`
  - Colors: Surface `bg-secondary-light`, Text `text-secondary`, Border `border-secondary/20`
  - Icon: Lucide `MapPin` (or `Navigation` / `Box`) in `text-secondary`
  - High-contrast readability across both Light and Dark themes.
- **Unassigned Location Badge**:
  - CSS Class: `shelf-location-unassigned`
  - Colors: Surface `bg-accent-light`, Text `text-accent`, Border `border-accent/30`
  - Icon: Lucide `AlertTriangle` in `text-accent`
  - Copy: `Unassigned Bay`
- **Zero Hardcoded Colors**: Strictly using tokens defined in `lib/tokens.ts` and Tailwind CSS v4 variables.
