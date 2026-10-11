# Feature Specification: Automated Low-Stock Threshold Detection & Floor Restock Alerts

**Feature Branch**: `feat/SIAA-17-low-stock-threshold-alerts`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-17 - STORY-2.5: Automated Low-Stock Threshold Detection & Floor Restock Alerts"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dynamic Visual Badging for Low-Stock and Out-of-Stock Items (Priority: P1)

As an inventory clerk or counter staff member browsing the parts catalog or cashier terminal,  
I want products that are at or below minimum safety stock to be immediately recognizable with prominent, color-coded visual badges,  
so that I can anticipate impending stockouts, inform customers accurately, and prevent selling depleted inventory.

**Why this priority**: Immediate visual awareness of inventory depletion at the point of discovery and transaction is the foundation for avoiding stockouts and customer disappointment.

**Independent Test**: Can be independently verified by loading the inventory catalog with products with varying stock counts (healthy stock, stock equal to or below threshold, and zero stock) and confirming that each product renders with distinct, accurate status badges without requiring background alert engines or reports.

**Acceptance Scenarios**:

1. **Given** a product with on-hand quantity greater than its configured minimum threshold,  
   **When** viewed in the inventory catalog or point-of-sale picker,  
   **Then** the item displays a healthy status badge indicating the current available quantity (e.g., "15 in stock") with neutral or positive visual emphasis.

2. **Given** a product with on-hand quantity greater than 0 but less than or equal to its configured minimum threshold,  
   **When** viewed in the inventory catalog or point-of-sale picker,  
   **Then** the item displays a high-contrast danger alert badge showing remaining units and minimum threshold (e.g., "Low: 3 left (Min 10)").

3. **Given** a product with exactly 0 units on hand,  
   **When** viewed in the inventory catalog or point-of-sale picker,  
   **Then** the item displays an explicit "Out of Stock" warning badge.

---

### User Story 2 - Real-Time Inventory Summary Operational Health Metrics (Priority: P2)

As a store manager or inventory supervisor opening the inventory management screen,  
I want to view top-level operational summary metric cards displaying overall catalog volume, on-hand units, critical low-stock items count, and total inventory monetary valuation,  
so that I can quickly assess the store's asset value and stock health without manually tabulating hundreds of individual SKU rows.

**Why this priority**: Operational metrics provide warehouse supervisors and owners with high-level visibility into capital tied up in stock and immediately highlight how many items require urgent purchase orders.

**Independent Test**: Can be tested independently by viewing the inventory dashboard header and verifying that the summary statistics match the mathematical aggregation of the active catalog (total distinct SKUs, sum of units, count of items below threshold, and total valuation in ₱).

**Acceptance Scenarios**:

1. **Given** an inventory catalog containing registered parts,  
   **When** the user accesses the inventory management overview,  
   **Then** four summary cards are prominently presented:
     - **Total SKUs**: Total count of unique active catalog items.
     - **Total Units on Hand**: Sum total of physical units across all SKUs.
     - **Critical Low Stock**: Total count of distinct SKUs currently at or below their safety threshold.
     - **Total Inventory Valuation**: Cumulative monetary worth of on-hand inventory formatted in Philippine Pesos (₱).

2. **Given** any stock modification (such as receiving an inbound shipment or registering a sale),  
   **When** the inventory count changes,  
   **Then** the summary metric cards update dynamically to reflect the updated counts and valuation.

---

### User Story 3 - Quick-Filter Reorder Workflow for Depleted Inventory (Priority: P3)

As an inventory clerk preparing a purchase order for suppliers,  
I want to toggle a dedicated "Low Stock Alerts" quick-filter on the parts catalog,  
so that all adequately stocked items are hidden and only items requiring restocking are displayed in a clean list.

**Why this priority**: Reduces manual sorting time and cognitive fatigue when compiling weekly or urgent restocking orders from suppliers.

**Independent Test**: Can be tested by clicking the "Low Stock Alerts" toggle switch or filter chip and confirming that only items with stock less than or equal to their threshold remain visible, and toggling it off restores the complete catalog view.

**Acceptance Scenarios**:

1. **Given** the parts catalog displaying both healthy and depleted items,  
   **When** the user toggles on the "Low Stock Alerts" filter,  
   **Then** the table immediately filters to show exclusively products where available stock is less than or equal to their configured safety threshold.

2. **Given** the "Low Stock Alerts" filter is active,  
   **When** combined with search queries or category filters (e.g., searching for "Brake Pad" or filtering by "Tires"),  
   **Then** the catalog displays only low-stock items matching the combined search criteria.

3. **Given** the "Low Stock Alerts" filter is active,  
   **When** the user toggles the filter off,  
   **Then** the full product catalog view is restored while preserving any existing category or search term selections.

---

### User Story 4 - Point-of-Sale Depletion Warnings & Zero-Stock Protection (Priority: P4)

As a cashier or counter staff building a customer sale,  
I want the point-of-sale terminal to warn me when adding low-stock items and disallow adding zero-stock items without authorized override,  
so that the store does not commit to sales of inventory that physically does not exist.

**Why this priority**: Prevents discrepancies between physical shelf stock and point-of-sale transactions that cause customer friction during order fulfillment.

**Independent Test**: Can be tested by attempting to add a zero-stock item to a point-of-sale cart and verifying that adding is blocked or prompts for manager authorization, while low-stock items display an advisory indicator.

**Acceptance Scenarios**:

1. **Given** a product with 0 units on hand,  
   **When** the cashier attempts to add the product to an active sale,  
   **Then** the system prevents adding the item and informs the user that the item is out of stock, unless a supervisor override is granted.

2. **Given** a product with low stock (e.g., 2 units remaining),  
   **When** the cashier selects the item,  
   **Then** the cart item indicates a low-stock advisory tag and restricts incrementing the sale quantity beyond the available physical stock.

---

### Edge Cases

- **Zero Threshold Configured**: When a product's minimum safety threshold is explicitly set to 0, the product should only display an alert badge when stock drops to 0 (Out of Stock), never triggering a low-stock alert when stock is 1 or more.
- **Negative Stock Prevention**: If legacy data or an adjustment attempts to produce a negative stock count, the system treats available stock as 0 and flags an out-of-stock condition.
- **Empty Catalog**: When the catalog has no registered products, the summary cards must display zero values (0 SKUs, 0 Units, 0 Low Stock, ₱0.00 Valuation) without errors or blank layouts.
- **All Items Healthy**: When no products are below their safety thresholds, activating the "Low Stock Alerts" filter displays an informative empty state informing the user that all inventory levels are currently healthy.
- **High Threshold Relative to Stock**: If a newly registered or high-turnover item has a high threshold (e.g., 50 units) and has 49 units, it must correctly flag as low stock ("Low: 49 left (Min 50)") despite having substantial absolute units.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compute the stock status of every catalog item dynamically based on `stock` and `minThreshold`:
  - `stock == 0`: **Out of Stock**
  - `stock > 0` and `stock <= minThreshold`: **Low Stock**
  - `stock > minThreshold`: **In Stock / Healthy**
- **FR-002**: System MUST render distinct, accessible visual status badges on each product row and product card:
  - High-contrast alert badge for Low Stock (displaying current stock and minimum threshold value).
  - Out-of-Stock warning badge for zero-quantity items.
  - Neutral/success badge for healthy stock items.
- **FR-003**: System MUST provide four top-level summary metric cards on the inventory management dashboard:
  - Total Catalog SKUs (count of distinct items).
  - Total Physical Units on Hand (sum of available quantities across all SKUs).
  - Critical Low Stock Items (count of distinct SKUs where `stock <= minThreshold`).
  - Total Inventory Valuation (sum of `stock * costPrice` or standard valuation base, formatted in Philippine Pesos `₱`).
- **FR-004**: System MUST update all summary metric cards instantly whenever inventory quantities or product records are updated, without requiring a page reload.
- **FR-005**: System MUST provide a dedicated "Low Stock Alerts" toggle control within the inventory filter bar.
- **FR-006**: When the "Low Stock Alerts" toggle is enabled, the catalog table and card views MUST restrict visibility to only items where `stock <= minThreshold`.
- **FR-007**: The "Low Stock Alerts" filter MUST compose seamlessly with text search (name, SKU, brand), category filters, and shelf location filters.
- **FR-008**: System MUST provide an empty state when the "Low Stock Alerts" filter is enabled and zero items are below threshold, confirming that all items meet safety stock requirements.
- **FR-009**: Point-of-Sale item selectors MUST display the same low-stock and out-of-stock indicators to prevent blind sales.
- **FR-010**: System MUST disallow adding zero-stock items to a sales transaction by default, with an optional workflow for authorized staff override if physical backorders are permitted.
- **FR-011**: All badges and indicators MUST adhere to high-contrast accessibility standards and avoid relying on color alone (incorporating explicit text labels such as "Low: X left (Min Y)" or "Out of Stock").
- **FR-012**: System MUST format all monetary valuation figures using the Philippine Peso currency symbol (`₱`) with standard comma grouping and two decimal places (e.g., `₱1,250,450.00`).

### Key Entities

- **Product**: Represents a physical motorcycle part or accessory. Key attributes include unique SKU, name, brand, category, current on-hand stock quantity, minimum safety threshold, retail price, and cost/wholesale price.
- **StockThresholdStatus**: Evaluated state of a product's inventory level (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`).
- **InventorySummaryMetrics**: Aggregated metrics representing the overall operational status of the catalog, including SKU count, physical unit count, low stock count, out-of-stock count, and total inventory monetary valuation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Inventory clerks can identify all items requiring restock in under 3 seconds using the dedicated Low Stock filter toggle.
- **SC-002**: 100% of products with stock at or below minimum threshold display visible low-stock or out-of-stock badges across inventory and cashier views.
- **SC-003**: Summary operational metric cards accurately reflect inventory counts and monetary valuation across the entire catalog with zero calculation discrepancies.
- **SC-004**: Accidental sales attempts on zero-stock items without authorized override are reduced to 0%.
- **SC-005**: All status indicators and badges meet WCAG AA contrast compliance standards in both light and dark visual presentation modes.

## Assumptions

- Each product record has an established numeric `minThreshold` property (defaulting to a sensible safety level such as 5 or 10 if not explicitly customized upon creation).
- Total inventory valuation is calculated using unit cost price (or unit selling price if cost price is unrecorded), adhering to consistent business accounting principles.
- Store managers and inventory clerks have permission to view all inventory summary cards and valuation figures, while cashier terminal views focus on stock availability indicators and sale prevention rules.
- Hardware barcode scanners and manual search entries in POS query the same underlying product availability states.
