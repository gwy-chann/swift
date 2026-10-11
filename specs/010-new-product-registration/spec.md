# Feature Specification: New Product Registration with Automated Markup & Location Assignment

**Feature Branch**: `feat/SIAA-16-new-product-registration`

**Created**: 2026-10-11

**Status**: Ready for Planning

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-16 - STORY-2.4: New Product Registration with Automated Markup & Location Assignment"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registration Modal Invocation & Complete Part Entry (Priority: P1)

As an Inventory Manager or Store Administrator,  
I want to open a dedicated product registration modal directly from the inventory catalog view,  
so that I can capture all essential product attributes (SKU, description, category, brand, motorcycle fitment, shelf location, stock counts, cost, and pricing) in a unified workflow.

**Why this priority**: Foundational user journey for introducing new motorcycle merchandise into the business. Without this intake interface, new inventory cannot be recorded or sold.

**Independent Test**: Can be tested independently by navigating to the inventory management screen, clicking the "+ Add Part" button, and confirming the registration form renders all required fields with appropriate defaults and option dropdowns.

**Acceptance Scenarios**:
1. **Given** an authorized administrator on the inventory catalog screen, **When** they click the "+ Add Part" button, **Then** the product registration modal opens with blank input fields for SKU, Part Name, Category, Brand, Target Motorcycle Model, Part Specification Type, Shelf Location, Initial Stock Quantity, Low Stock Alert Level, and Unit Cost.
2. **Given** the modal dialog is rendered, **When** inspected, **Then** initial default values are present for Initial Stock (default `10`), Low Stock Alert Level (default `5`), and Part Specification Type (default `Performance / Aftermarket` or `OEM Standard Replacement`).
3. **Given** the user decides not to proceed, **When** they click "Cancel", click the backdrop overlay, or press the Escape key, **Then** the registration modal closes cleanly with zero unsaved changes committed to the catalog.

---

### User Story 2 - Real-Time Dynamic Markup Auto-Calculation & Manual Override (Priority: P1)

As an Inventory Manager entering supplier acquisition costs,  
I want the system to automatically compute wholesale and retail prices in real time based on established store markup percentages and part classification,  
so that I eliminate manual pricing math while retaining the flexibility to override final selling prices when needed.

**Why this priority**: Core commercial requirement ensuring consistent profit margins across retail walk-ins, wholesale trade partners, OEM standard parts, and aftermarket upgrades.

**Independent Test**: Can be tested independently by typing a Unit Cost of ₱500.00 into the cost field, verifying that Wholesale Price immediately updates to ₱590.00 (+18%) and Retail Price updates to ₱700.00 (+40% Aftermarket) or ₱675.00 (+35% OEM), and verifying that either price field can be manually edited.

**Acceptance Scenarios**:
1. **Given** a user inputs a Unit Cost of ₱500.00 with Part Specification set to OEM Standard Replacement, **When** the cost input changes, **Then** the Wholesale Price automatically computes to ₱590.00 (+18% markup) and the Retail Price automatically computes to ₱675.00 (+35% OEM markup).
2. **Given** a user inputs a Unit Cost of ₱500.00 with Part Specification set to Performance / Aftermarket, **When** the cost input changes or part type toggles to aftermarket, **Then** the Retail Price automatically recalibrates to ₱700.00 (+40% Aftermarket markup).
3. **Given** auto-calculated wholesale or retail values are displayed, **When** the user manually types custom amounts (e.g. promotional price or competitive adjustment), **Then** the manual values are retained upon submission without being forcibly overwritten.
4. **Given** the cost field is empty or set to ₱0.00, **When** viewed, **Then** wholesale and retail fields remain blank or zero without generating calculation errors or invalid currency values.

---

### User Story 3 - Case-Insensitive SKU Collision Prevention & Field Validation (Priority: P1)

As an Inventory Manager registering new catalog items,  
I want the system to enforce strict field validations and guard against duplicate SKU codes regardless of letter casing,  
so that every inventory product maintains a globally unique identifier and corrupted or incomplete entries are prevented.

**Why this priority**: Protects database referential integrity, barcode scanning accuracy, and point-of-sale inventory tracking from duplicate SKU collisions.

**Independent Test**: Can be tested independently by submitting a part with an existing catalog SKU (e.g., `yam-nmax-bl01` matching existing `YAM-NMAX-BL01`), verifying that submission is rejected with an inline duplicate alert, and verifying that required blank fields block submission.

**Acceptance Scenarios**:
1. **Given** an existing catalog product with SKU `YAM-NMAX-BL01`, **When** a user attempts to register a new part with SKU `yam-nmax-bl01` (lowercase) or `YAM-NMAX-BL01`, **Then** the form rejects the submission and displays a prominent error message indicating that the SKU already exists.
2. **Given** any required field (SKU, Part Name, Category, Brand, Shelf Location, Unit Cost) is blank, **When** the user attempts to submit, **Then** the form highlights the missing fields and prevents submission.
3. **Given** a user inputs negative numbers or non-numeric characters into Cost, Stock, or Reorder Threshold fields, **When** submitting, **Then** the form blocks submission with explicit field-level validation messages.

---

### User Story 4 - Immediate Catalog Insertion & Dual Audit Trail Recording (Priority: P1)

As a Store Administrator or Compliance Auditor,  
I want newly registered parts to immediately appear at the top of the inventory catalog and generate both an initial inbound stock movement record and a system audit trail log,  
so that new parts are instantly available for point-of-sale lookups and all creation actions have full operational accountability.

**Why this priority**: Ensures seamless end-to-end inventory lifecycle continuity from warehouse intake to POS sales, while preserving an immutable history of initial stock reception.

**Independent Test**: Can be tested independently by successfully submitting a valid part, confirming that the new part is prepended to the inventory table with an updated product count, and verifying that both stock adjustment logs and administrative audit logs contain corresponding new records.

**Acceptance Scenarios**:
1. **Given** valid registration details submitted for a part with an initial stock of `10` units, **When** "Save & Register Product" is clicked, **Then** the product is prepended to the inventory table immediately without a full page reload.
2. **Given** a successful product registration with initial stock greater than 0, **When** checking stock adjustment records, **Then** an initial inbound stock record is logged with an adjustment identifier, product SKU, adjustment type `Restock Inbound`, quantity delta `+10 Units`, reason `"New product master registration"`, user attribution, and timestamp.
3. **Given** a successful product registration, **When** checking administrative audit logs, **Then** an immutable audit record is appended recording the user name, product SKU, part name, and action summary.
4. **Given** a product registered with an initial stock of `0` units, **When** submitted, **Then** the product is cataloged as out of stock without creating false positive inbound movement entries.

---

### User Story 5 - Physical Shelf Locator Assignment & Motorcycle Fitment Linking (Priority: P2)

As a Warehouse Clerk stocking arriving inventory,  
I want each newly registered part to be linked to a physical warehouse rack/shelf location and compatible motorcycle model,  
so that warehouse staff can immediately shelve the item and technicians can find compatible parts during repair workflows.

**Why this priority**: Eliminates lost warehouse stock, optimizes order picking speed, and directly feeds the MotoMatcher compatibility engine.

**Independent Test**: Can be tested independently by creating a part with shelf location `Rack B-03 / Shelf 2` and motorcycle model `Yamaha Aerox 155`, then confirming that the newly created catalog row displays the physical location badge and accurate motorcycle compatibility metadata.

**Acceptance Scenarios**:
1. **Given** a user selecting a shelf location (e.g. `Rack B-03 / Shelf 2`), **When** the part is saved, **Then** the catalog displays the standardized location badge with rack and shelf indicators.
2. **Given** a user selecting a motorcycle model (e.g. `Yamaha Aerox 155` or `Universal Fitment`), **When** the part is saved, **Then** the item is indexed under that vehicle model for compatibility lookups.

---

### Edge Cases

- **Zero Initial Stock Intake**: If a part is registered prior to receiving physical goods, Initial Stock can be set to `0`. The catalog marks the part with an "Out of Stock" indicator, and the system skips generating a positive inbound inventory movement log.
- **Manual Price Below Unit Cost**: If a user manually overrides retail or wholesale prices to an amount lower than the unit cost (negative profit margin), the form displays a cautionary confirmation warning to prevent accidental financial loss.
- **Whitespace and Character Normalization in SKU**: Leading and trailing whitespace is automatically trimmed, and SKUs are automatically converted to uppercase alphanumeric format before duplicate comparison and persistence.
- **Special Characters in Product Names and Locations**: Form fields safely sanitize and accept standard automotive characters (e.g. `125i/150i`, `54.5mm`, `Rack A-01 / Shelf 2`) without truncation or display anomalies.
- **Simultaneous / Double Click Submission**: The submission button is disabled upon first click, showing a progress indicator until the registration transaction completes.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an interactive "+ Add Part" trigger in the inventory catalog view that displays a dedicated product registration modal.
- **FR-002**: Registration form MUST collect and validate mandatory product attributes:
  - SKU / Item Code (required, unique, automatically converted to uppercase)
  - Part Name / Description (required)
  - Category (required, selectable from predefined workshop categories: Brakes, Drivetrain, Fluids & Oils, Ignition, Engine & Clutch, Tires)
  - Brand / Manufacturer (required)
  - Target Motorcycle Model (required, selectable from supported models or Universal Fitment)
  - Shelf Location (required, physical warehouse coordinates)
  - Part Specification Type (required, OEM Standard Replacement vs. Performance / Aftermarket)
  - Initial Stock Quantity (required, non-negative integer, default 10)
  - Low Stock Alert Level (required, positive integer >= 1, default 5)
  - Supplier Unit Cost (required, positive decimal currency value)
  - Wholesale Price (required, positive decimal currency value)
  - Retail Price (required, positive decimal currency value)
- **FR-003**: System MUST automatically compute Wholesale Price dynamically from Unit Cost using the global wholesale markup rate (+18%).
- **FR-004**: System MUST automatically compute Retail Price dynamically from Unit Cost based on part specification (+35% for OEM Standard Replacement, +40% for Performance / Aftermarket).
- **FR-005**: System MUST allow users to manually override automatically calculated Wholesale and Retail prices.
- **FR-006**: System MUST enforce case-insensitive uniqueness on SKU codes, preventing duplicate part registration with an informative collision notice.
- **FR-007**: System MUST immediately prepend newly registered products to the active inventory catalog without requiring a page refresh.
- **FR-008**: System MUST generate an initial inbound stock adjustment record for parts registered with stock greater than zero, documenting the initial quantity, user attribution, and timestamp.
- **FR-009**: System MUST generate an administrative audit log entry documenting the creation event, user identity, product SKU, and timestamp.
- **FR-010**: All interactive modal elements and form controls MUST strictly adhere to semantic design tokens, zero hardcoded colors, and accessible keyboard navigation in light and dark modes.

---

### Key Entities *(include if feature involves data)*

- **Product / CatalogPart**:
  - `sku`: Unique uppercase string identifier
  - `name`: Descriptive part name
  - `category`: Workshop domain category
  - `brand`: Manufacturer or aftermarket brand
  - `model`: Compatible motorcycle vehicle or universal tag
  - `location`: Physical warehouse coordinates (rack, shelf)
  - `oem`: Boolean flag distinguishing OEM standard from aftermarket
  - `stock`: Current on-hand quantity
  - `minThreshold`: Reorder alert threshold
  - `cost`: Supplier acquisition cost (₱)
  - `wholesale`: Trade / reseller selling price (₱)
  - `retail`: Walk-in customer selling price (₱)
- **PricingRules**:
  - `retailMarkup`: Default percentage markup applied to OEM parts (+35%)
  - `wholesaleMarkup`: Default percentage markup applied to wholesale (+18%)
  - `aftermarketMarkup`: Default percentage markup applied to aftermarket parts (+40%)
- **StockAdjustmentLog**:
  - `id`: Unique adjustment identifier
  - `sku`: Associated product SKU
  - `type`: Adjustment category (`Restock Inbound`)
  - `change`: Signed quantity change string (e.g. `+10 Units`)
  - `reason`: Audit explanation (`New product master registration`)
  - `user`: Performing staff member name
  - `timestamp`: Event creation date and time
- **AuditLog**:
  - `id`: Unique audit identifier
  - `user`: Performing administrator
  - `action`: Human-readable summary of registration event
  - `timestamp`: Event creation date and time

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Store staff can complete registration of a new part from clicking "+ Add Part" to catalog confirmation in under 45 seconds.
- **SC-002**: Automatic markup calculations for wholesale and retail prices update in under 50ms upon entering or modifying unit cost.
- **SC-003**: 100% of newly registered products with non-zero stock produce both an initial inbound stock record and an administrative audit record.
- **SC-004**: 0% duplicate SKU occurrences allowed into the catalog across all entry attempts.
- **SC-005**: 100% compliance with semantic design tokens with zero hardcoded color values and seamless light/dark mode presentation.

---

## Assumptions

- Product registration is an administrative function accessible to authenticated Inventory Managers, Store Administrators, and authorized counter staff.
- Markup percentages are initialized from store pricing configurations (+18% wholesale, +35% OEM retail, +40% aftermarket retail) and can be configured globally in store settings.
- Shelf location coordinates follow standard warehouse aisle/rack/shelf naming conventions (e.g. `Rack A-01 / Shelf 1`).
- Newly registered products are immediately available for Point of Sale transactions, MotoMatcher compatibility filtering, and stock adjustments without separate activation steps.
- If initial stock is entered as 0, the item is created without generating a restock movement record.

---

## UI/UX & Design Tokens Conformance

In strict compliance with SWIFT Project Constitution Principle I & V:
- **Modal Window & Dialog**:
  - Backdrop: `bg-black/50 backdrop-blur-xs`
  - Container: `bg-bg-surface border border-border rounded-xl shadow-lg`
  - Max width: Constrained to clean desktop/tablet modal sizing (~580px - 640px)
- **Form Controls & Inputs**:
  - Text, number, and select inputs: `bg-bg-input border border-border text-text-primary focus:border-primary`
  - Field labels: `text-text-secondary text-sm font-medium`
  - Action buttons: Primary CTA `bg-primary hover:bg-primary-hover text-text-light font-medium`, Secondary Cancel `bg-bg-muted hover:bg-bg-hover text-text-secondary border border-border-subtle`
- **Zero Hardcoded Colors**: Strictly tokenized via `@/lib/tokens.ts` and Tailwind CSS v4 variables with complete theme harmony in both light and dark modes.
