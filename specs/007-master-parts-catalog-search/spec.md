# Feature Specification: Master Parts Catalog & Multi-Attribute Search Filtering

**Feature Branch**: `feat/SIAA-13-master-parts-catalog-search`

**Created**: 2026-10-09

**Status**: Ready for Planning

**Input**: User description: "STORY-2.1: Master Parts Catalog & Multi-Attribute Search Filtering (Jira: SIAA-13). As an Inventory Clerk or Floor Mechanic, I want to search and filter the parts catalog in real-time by SKU, product name, brand, category, and stock status, so that I can rapidly inspect item availability, specifications, and pricing without manual catalog browsing."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Structured Parts Catalog Grid Display (Priority: P1)

As an Inventory Clerk or Shop Floor Mechanic,
I want to view a comprehensive, structured data table of all workshop motorcycle parts at `/admin/inventory`,
so that I can immediately inspect essential product attributes (SKU, Name, Brand & Model fitment, Category, Shelf Location, Stock count, and Retail Price) at a glance.

**Why this priority**: Core foundational view for warehouse operations, floor mechanics, and parts lookup; essential before downstream stock adjustments and barcode scanning can occur.

**Independent Test**: Can be independently verified by loading `/admin/inventory` in the Admin Portal and ensuring all catalog items render with full product attributes, appropriate badges, and formatted Philippine Peso (₱) pricing.

**Acceptance Scenarios**:
1. **Given** an authenticated user navigates to `/admin/inventory`, **When** the catalog page mounts, **Then** it renders a structured table displaying all products with columns: SKU, Product Name, Brand / Model Fitment, Category, Shelf Locator, Stock Level, and Retail Price (₱).
2. **Given** any catalog row, **When** inspected, **Then** the retail price is formatted in Philippine Pesos (e.g., `₱450.00`), the category is rendered as a clean semantic badge, and an "Adjust" action button is present.
3. **Given** a product with OEM status, **When** rendered in the table, **Then** an "OEM Genuine" badge is displayed alongside or beneath the product title, distinguishing it from aftermarket alternatives.

---

### User Story 2 - Instant Multi-Keyword Search (Priority: P1)

As an Inventory Clerk or Cashier,
I want to search across parts in real-time using multiple keyword attributes (SKU, product name, brand, motorcycle model, or shelf location),
so that I can locate required replacement parts in under 100 milliseconds without reloading the page.

**Why this priority**: Mechanics and clerks need rapid lookups during live counter customer interactions where parts are searched by colloquial names, bike model, or part numbers.

**Independent Test**: Can be independently tested by entering queries like `"Brake"`, `"NMAX"`, `"YAM-"`, `"Motul"`, or `"Rack A-01"` into the search input and verifying that the table instantly updates to display only matching rows.

**Acceptance Scenarios**:
1. **Given** the parts catalog view with multiple products, **When** the user types a keyword query into the search input (e.g. `"NMAX"`), **Then** the table filters in real-time (< 100ms) to show only products matching the query across SKU, Name, Brand, Model, or Shelf Location.
2. **Given** an active search query that matches zero products, **When** the catalog evaluates the search query, **Then** a friendly empty state component is displayed with a "Clear Search" or "Reset Filters" action button.
3. **Given** an active search query, **When** the user clicks the clear button or clears the input text, **Then** the catalog reverts to showing the complete parts list immediately.

---

### User Story 3 - Category & Stock Level Status Filtering (Priority: P1)

As an Inventory Manager or Floor Mechanic,
I want to filter the parts catalog by subsystem category and by stock availability status (All, In Stock, Low Stock Only, Out of Stock),
so that I can isolate specific component groups (e.g., Brakes, Fluids) and identify critical low-stock items requiring restock.

**Why this priority**: Critical for inventory auditing, supplier purchase order preparation, and ensuring technicians can verify if a service bay has replacement parts in stock.

**Independent Test**: Can be tested independently by toggling the category dropdown to `"Brakes"` and selecting `"Low Stock Only"`, confirming that only brake parts with `stock <= minThreshold` are rendered.

**Acceptance Scenarios**:
1. **Given** the parts catalog view, **When** the user selects a specific category from the category dropdown (e.g. `"Fluids"`), **Then** only products assigned to that category are displayed.
2. **Given** the parts catalog view, **When** the user selects `"Low Stock Only"` from the stock status filter, **Then** only products where `stock <= minThreshold` are displayed with danger alert badges.
3. **Given** combined filters (e.g. search `"NGK"` + category `"Ignition"` + stock status `"All"`), **When** applied, **Then** the table reflects the intersection (AND logic) of all active filter criteria.
4. **Given** multiple active filters, **When** the user clicks "Reset Filters", **Then** search term is cleared, category resets to `"All Categories"`, stock filter resets to `"All"`, and all items are displayed.

---

### User Story 4 - Summary Metric Header Cards & Stock Adjustment Action (Priority: P2)

As an Inventory Manager,
I want to see high-level summary cards at the top of the inventory page (Total SKUs, Low Stock Alert Count, Total Inventory Valuation, and Active Categories) and an "Adjust" action button on each row,
so that I have immediate operational visibility and can initiate stock adjustment workflows.

**Why this priority**: Elevates the inventory view from a passive table to an operational management dashboard, aligning with SWIFT design mockups.

**Independent Test**: Can be tested independently by reviewing the summary metric cards against the underlying store data and verifying the "Adjust" button triggers a callback/action for future modal integration (SIAA-15).

**Acceptance Scenarios**:
1. **Given** the inventory screen loads, **When** rendered, **Then** the top metric bar displays 4 cards: Total SKUs, Low Stock Alerts, Total Valuation (₱), and Monitored Categories.
2. **Given** a row in the catalog, **When** the user clicks the "Adjust" button, **Then** it triggers the stock adjustment handler with the target product SKU.

---

### Edge Cases

- **Case Insensitive Search**: Queries matching `"yamaha"`, `"YAMAHA"`, or `"YamAha"` yield identical correct results.
- **Leading / Trailing Whitespace**: User inputs with accidental spaces (e.g., `"  Brake  "`) are trimmed before evaluation.
- **Zero Stock Items**: Items with `stock === 0` display an "Out of Stock" danger badge rather than merely "Low Stock".
- **Empty Inventory State**: When no products exist in the store, a prominent "No inventory items registered" empty state card is displayed.
- **Special Characters in Search**: Queries with dashes, slashes, or parentheses (e.g. `"125i/150i"`, `"CPR8EA-9"`, `"A-01"`) are safely matched without regex escaping errors.
- **Narrow Mobile / Tablet Viewports**: The data table supports horizontal scroll or responsive container wrapping with fixed column proportions to prevent clipping on mobile mechanic tablets.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a master parts catalog data table at `/admin/inventory` sourcing product records from the reactive `inventoryStore`.
- **FR-002**: Table columns MUST display: SKU, Product Name (with OEM/Aftermarket indicator), Brand & Motorcycle Model fitment, Category badge, Shelf Locator coordinates, Stock level with status badge, and Retail Price in Philippine Pesos (`₱`).
- **FR-003**: System MUST provide an instant search input filtering table rows across SKU, Product Name, Brand, Motorcycle Model, and Shelf Locator in `< 100ms`.
- **FR-004**: System MUST provide a Category filter dropdown allowing selection of `"All Categories"` or specific categories (`Brakes`, `Drivetrain`, `Fluids`, `Ignition`, `Engine`, `Tires`, etc.).
- **FR-005**: System MUST provide a Stock Availability filter supporting options: `"All"`, `"In Stock"` (`stock > minThreshold`), `"Low Stock"` (`stock <= minThreshold && stock > 0`), and `"Out of Stock"` (`stock === 0`).
- **FR-006**: Products with `stock <= minThreshold` MUST display a high-visibility danger warning badge indicating reorder urgency.
- **FR-007**: System MUST provide top-level KPI overview cards showing Total SKUs, Low Stock Items count, Total Inventory Retail Valuation (₱), and Active Categories count.
- **FR-008**: System MUST display an intuitive empty state when no products match the active search/filter criteria, with a one-click "Reset Filters" action.
- **FR-009**: All UI styling MUST strictly use SWIFT semantic design tokens (`bg-bg-*`, `text-text-*`, `border-border*`, `bg-primary`, `bg-danger-light`, `text-danger`, etc.) with zero hardcoded hex/RGB values.

---

### Key Entities

- **Product**: Core motorcycle part record (`sku`, `name`, `category`, `stock`, `minThreshold`, `location`, `cost`, `wholesale`, `retail`, `oem`, `model`, `brand`).
- **CatalogFilterState**: Filter parameters (`searchQuery: string`, `selectedCategory: string`, `stockFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'`).
- **CatalogStats**: Aggregated metrics (`totalSkus: number`, `lowStockCount: number`, `totalValuation: number`, `categoriesCount: number`).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Search and filter updates reflect in the catalog table in `< 50ms` upon keystroke / dropdown change.
- **SC-002**: 100% of products with `stock <= minThreshold` are immediately flagged with semantic danger alert styling.
- **SC-003**: Zero hardcoded color values in component styling, verified by design token linting and theme compliance checks.
- **SC-004**: 100% test coverage across catalog search, multi-attribute filter predicates, and stock status categorization logic.

---

## Assumptions

- Product data is managed reactively via `inventoryStore` (`@/lib/store/inventory-store.ts`), which is initialized with canonical seed data from `MOCK_PRODUCTS`.
- Future stock adjustment modal execution is decoupled under SIAA-15; SIAA-13 provides the UI table trigger and row action hook.
- Currency formatting standard is Philippine Peso (`₱`) formatted to 2 decimal places with comma separation (e.g. `₱1,250.00`).
