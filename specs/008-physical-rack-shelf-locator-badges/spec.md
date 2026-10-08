# Feature Specification: Physical Rack & Shelf Locator Mapping & Warehouse Navigation Badges

**Feature Branch**: `feat/SIAA-14-shelf-locator-mapping`

**Created**: 2026-10-09

**Status**: Ready for Planning

**Input**: User description: "STORY-2.2: Physical Rack & Shelf Locator Mapping & Warehouse Navigation Badges (Jira: SIAA-14). As a Floor Mechanic or Warehouse Order Picker, I want to clearly see standardized physical aisle, rack, and shelf location tags for every cataloged part, so that I can walk straight to the correct storage bin and retrieve parts in under 5 seconds during busy service jobs."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Standardized Shelf Locator Badge Display (Priority: P1)

As a Floor Mechanic or Warehouse Order Picker,
I want to clearly see standardized physical aisle, rack, and shelf location tags for every cataloged part in the inventory table and order picking lists,
so that I can walk straight to the correct storage bin and retrieve parts in under 5 seconds during busy service jobs.

**Why this priority**: Essential foundational navigation for shop floor operations; prevents lost technician time and disorganization across warehouse racks.

**Independent Test**: Can be independently verified by loading `/admin/inventory` and ensuring that catalog items with location data display high-contrast `.shelf-location-tag` badges with the MapPin icon and formatted coordinates.

**Acceptance Scenarios**:
1. **Given** a product row rendered in the inventory table or POS picking list, **When** the location column is displayed, **Then** it renders a distinct high-contrast `.shelf-location-tag` badge following the standardized format (e.g. `Rack A-01 / Shelf 2`, `Aisle 1 / Shelf 1`, `Tire Rack 2 / Floor`).
2. **Given** a product with compound location format (e.g., `Rack B-03 / Shelf 4`), **When** rendered, **Then** the badge clearly delineates bay and shelf level with appropriate typography and spacing.
3. **Given** both Light and Dark mode appearances, **When** rendered, **Then** the badge maintains WCAG AA contrast ratio (> 4.5:1) utilizing semantic tokens (`bg-secondary-light`, `text-secondary`, `border-secondary/20`).

---

### User Story 2 - Real-Time Location-Specific Search & Filtering (Priority: P1)

As a Floor Order Picker or Inventory Clerk,
I want to search and filter the parts catalog in real-time by physical rack, aisle, shelf, or bin query in the search bar,
so that all items physically stored in that section are listed immediately for batch picking or bin audits.

**Why this priority**: Crucial during physical inventory counts and multi-item job picks so floor workers don't repeatedly traverse back and forth between aisles.

**Independent Test**: Can be tested independently by typing `"Rack A-01"`, `"Shelf 2"`, or `"Aisle 1"` into the catalog search bar and verifying that only products physically assigned to that rack/shelf are listed in under 50ms.

**Acceptance Scenarios**:
1. **Given** a floor picker looking for all items stored on a specific rack or shelf, **When** they type `"Rack A-01"` or `"Shelf 2"` into the search bar, **Then** all parts physically assigned to that rack/shelf are filtered and listed immediately without case sensitivity.
2. **Given** a search query with mixed casing or varied spacing (e.g. `"rack a-01"`, `"SHELF 2"`), **When** evaluated, **Then** the filter matches identically to exact casing.
3. **Given** a compound search matching multiple items in a storage zone, **When** the query is cleared, **Then** the catalog resets instantly to display the full inventory list.

---

### User Story 3 - Missing Location Fallback Warning (Priority: P2)

As an Inventory Clerk or Store Manager,
I want to see an amber `Unassigned Bay` warning badge for any catalog part missing physical coordinates or having blank whitespace,
so that inventory clerks are prompted immediately to allocate bin assignments before items are misplaced or lost in the warehouse.

**Why this priority**: Eliminates "phantom warehouse inventory" where items exist in stock counts but cannot be found on physical shelves.

**Independent Test**: Can be tested independently by rendering a catalog product with `location: ""` or `undefined`, verifying that an amber `Unassigned Bay` badge with an alert icon appears.

**Acceptance Scenarios**:
1. **Given** a product in the catalog with no assigned physical location or an empty string, **When** the row is rendered, **Then** it displays an amber warning badge `Unassigned Bay` prompting the inventory clerk to assign a location.
2. **Given** an inventory auditor searching for all unlocated products, **When** they type `"unassigned"` into the search bar, **Then** all products with empty or whitespace location assignments are filtered and returned.

---

### User Story 4 - Accessible Tooltips and Screen Reader Navigation (Priority: P3)

As an Assistive Tech User or Tablet Operator,
I want accessible labels and semantic contrast on location tags,
so that screen readers and mobile warehouse tablets clearly communicate storage coordinates.

**Why this priority**: WCAG 2.1 AA requirement mandated by SWIFT Project Constitution Principle V.

**Independent Test**: Can be independently tested using screen reader software or DOM inspection to verify `aria-label` tags and semantic container structures.

**Acceptance Scenarios**:
1. **Given** a rendered `.shelf-location-tag`, **When** inspected by an accessibility tool, **Then** it provides an `aria-label` with descriptive text (e.g., `"Physical location: Rack A-01 / Shelf 2"`).
2. **Given** an unassigned bay badge, **When** inspected, **Then** it exposes an alert status informing the user that physical coordinates are missing.

---

### Edge Cases

- **Empty / Whitespace Location**: Values like `""`, `"   "`, `null`, or `undefined` gracefully resolve to the `Unassigned Bay` amber warning badge without causing runtime crashes or rendering blank gaps.
- **Single-Word Locations**: General locations without shelf separators (e.g., `"Showroom"`, `"Mezzanine"`, `"Floor"`) are displayed cleanly without unexpected trailing slashes or delimiters.
- **Unconventional Separators**: Coordinates formatted with hyphens or commas (e.g., `"Rack A-01 - Shelf 2"`, `"Aisle 1, Bay 3"`) are safely parsed and preserved without truncation.
- **Overlong Bay Names**: Abnormally long location descriptions (e.g., `"Main Warehouse North Bay Mezzanine Tier 3 Shelf 14"`) are gracefully truncated with an ellipsis and full tooltip on hover to prevent table layout distortions.
- **Case-Insensitive Search**: Queries matching `"rack a-01"`, `"RACK A-01"`, and `"Rack A-01"` yield identical correct results.
- **Special Characters in Search**: Queries containing hyphens, slashes, or spaces (e.g. `"A-01 / 2"`) are sanitized and matched safely without regex errors.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a standardized, high-contrast `.shelf-location-tag` badge component for every product with an assigned physical location.
- **FR-002**: Badge styling MUST strictly consume SWIFT semantic design tokens: `bg-secondary-light` background, `text-secondary` text, `border-secondary/20` border, with a `MapPin` icon in `text-secondary`.
- **FR-003**: System MUST render an amber fallback badge `Unassigned Bay` (`bg-accent-light`, `text-accent`, `border-accent/30`) with an `AlertTriangle` icon when a product's location is null, undefined, empty, or whitespace.
- **FR-004**: Catalog search engine MUST include the product `location` field in its multi-attribute search index, returning matching rows in `< 50ms`.
- **FR-005**: Searching for the keyword `"unassigned"` MUST surface all products lacking physical bin assignments.
- **FR-006**: Location badges MUST include accessible `aria-label` attributes describing physical location or unassigned alert status for screen readers.
- **FR-007**: Pure utility function `parseShelfLocation(location?: string)` MUST safely parse raw location strings into structured bay and shelf metadata.
- **FR-008**: All visual elements MUST strictly adhere to the SWIFT Design System (`lib/tokens.ts` and Tailwind CSS v4 variables) with zero hardcoded hex/RGB values.

---

### Key Entities

- **ShelfLocation**: Structured domain model representing storage bin coordinates (`bay: string`, `shelf?: string`, `isAssigned: boolean`, `raw: string`).
- **Product**: Motorcycle part entity containing SKU, name, brand, model, retail price, stock count, and `location: string`.
- **LocationFilterQuery**: Search query string evaluated against product `location` attributes or `"unassigned"` fallback keyword.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mechanics and warehouse order pickers can identify physical part storage coordinates in under 5 seconds of viewing the catalog row.
- **SC-002**: Location-specific search queries filter catalog records in `< 50ms` on keystroke.
- **SC-003**: 100% of products with empty or whitespace locations display the `Unassigned Bay` warning badge with zero runtime exceptions.
- **SC-004**: 100% compliance with SWIFT design token system (zero hardcoded hex/RGB colors) across both Light and Dark themes.
- **SC-005**: 100% automated test coverage across location parsing utilities, unassigned search matching, and component badge rendering.

---

## Assumptions

- Product data is managed reactively via `inventoryStore` (`@/lib/store/inventory-store.ts`), populated with canonical mock parts.
- Standard warehouse location format follows `<Bay / Shelf>` convention (e.g. `Rack A-01 / Shelf 2`), while non-standard strings are rendered safely.
- Assigning or reallocating storage locations is handled during product registration and editing workflows (SIAA-16).
- Location badges will be reused across `/admin/inventory`, `/staff/locator`, and POS picking screens (SIAA-3, SIAA-5).
