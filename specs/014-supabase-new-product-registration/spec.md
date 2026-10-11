# Feature Specification: Supabase New Product Registration Server Action & SKU Uniqueness

**Feature Branch**: `feat/SIAA-47-supabase-new-product-registration`

**Created**: 2026-10-11

**Status**: Ready for Implementation

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-47 - STORY-2.8: Supabase New Product Registration Server Action & SKU Uniqueness. Newly registered motorcycle parts validated for unique SKUs and inserted directly into Supabase with automated markup calculations and initial inbound stock logging, so that new inventory is immediately salable, searchable, and assigned to physical storage before goods reach the shop floor."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Duplicate SKU Collision Guard & Validation (Priority: P1)

As an Inventory Manager or Store Admin, I need newly registered parts validated against existing catalog items for SKU uniqueness (case-insensitively) before persistence, so that duplicate item entries and inventory ambiguity are rejected at both the application and database tiers.

**Why this priority**: Uniqueness of SKUs is the primary invariant of the entire inventory management system. Duplicate SKUs corrupt barcode scanning, stock lookups, point-of-sale operations, and warehouse shelf locator resolution.

**Independent Test**: Can be independently verified by submitting registration payloads containing already registered SKUs with differing letter casings (e.g., `yam-nmax-bl01` vs `YAM-NMAX-BL01`), ensuring that insertion is rejected and returns error code `SKU_ALREADY_EXISTS`.

**Acceptance Scenarios**:

1. **Given** an existing product in the catalog with SKU `YAM-NMAX-BL01`, **When** a user attempts to register a new part with that identical SKU in lowercase (`yam-nmax-bl01`) or matching casing, **Then** the database unique constraint and server action reject the insertion and return error code `SKU_ALREADY_EXISTS` with an informative message.
2. **Given** a new product payload with a novel, unused SKU `HON-ADV160-FLTR01`, **When** the server action validates and processes the submission, **Then** the record successfully persists to `public.products` and returns a success response.
3. **Given** a submitted new product with negative unit cost, missing mandatory name, or invalid shelf location format, **When** server-side validation executes, **Then** the submission is rejected with field-level validation errors without attempting database mutation.

---

### User Story 2 - Atomic Creation with Initial Inbound Stock Log (Priority: P1)

As a Store Admin or Warehouse Clerk, I want newly registered items with initial on-hand quantities (>0) to automatically generate an initial inbound audit record in `public.stock_adjustment_logs`, so that initial inventory arrivals are completely accountable and immediately traceable from inception.

**Why this priority**: Maintaining an unbroken chain of custody requires every physical unit on hand to have a ledger trail. Without automated initial inbound logging, baseline stock quantities lack audit attribution.

**Independent Test**: Can be independently tested by registering a new product with an initial stock quantity of 15, then querying `public.stock_adjustment_logs` to verify that an initial inbound adjustment entry with delta +15, previous stock 0, and new stock 15 was created in the same transaction.

**Acceptance Scenarios**:

1. **Given** valid part registration fields and an initial stock quantity > 0 (e.g., 20 units), **When** `createProductAction(payload)` executes, **Then** the product is inserted into `public.products` with `stock = 20`, **And** an initial inbound stock record is automatically written into `public.stock_adjustment_logs` with `quantity_delta = 20`, `previous_stock = 0`, `new_stock = 20`, and `adjustment_type = 'restock'`.
2. **Given** a new product registered with initial stock of 0 units, **When** `createProductAction(payload)` executes, **Then** the product is created with `stock = 0`, and no unnecessary inbound log entry is generated.
3. **Given** an unexpected database failure during the stock adjustment log creation, **When** the transaction executes, **Then** the entire operation rolls back atomically so no orphaned product record remains without its corresponding stock log.

---

### User Story 3 - Server Action Revalidation & Real-Time Store Sync (Priority: P2)

As an Inventory Manager browsing the Admin Inventory Portal, I want the modal form submission to invoke `createProductAction()` and instantly prepend the newly created part into the active `InventoryStore`, so that the catalog table and KPI metrics update without a manual page refresh while server caches are revalidated via `revalidatePath('/admin/inventory')`.

**Why this priority**: High-tempo inventory intake requires instantaneous UI confirmation and seamless synchronization across client state and Next.js server-side rendered routes.

**Independent Test**: Can be tested by triggering the `+ Add Part` modal from `/admin/inventory`, filling out valid inputs, clicking Submit, and observing the catalog list and stats cards instantly render the new part at the top of the list while the modal closes and displays a success toast.

**Acceptance Scenarios**:

1. **Given** the Admin Inventory page (`/admin/inventory`), **When** the user clicks the `+ Add Part` header button, **Then** `NewProductModal` opens with focus automatically placed on the SKU input field.
2. **Given** a submitted valid product form, **When** `createProductAction()` returns successfully, **Then** `revalidatePath('/admin/inventory')` is called, the modal closes, a success toast notification appears, and the new item is prepended to the active `InventoryStore`.
3. **Given** an error response from `createProductAction()` (such as `SKU_ALREADY_EXISTS`), **When** the error is returned, **Then** the modal remains open or displays an error alert with the specific collision message, allowing the user to modify the SKU.

---

### Edge Cases

- **Mixed-Cased SKU Submissions**: An SKU submitted as `yam-aerox-plg01` must be normalized to uppercase `YAM-AEROX-PLG01` and collide with any case variation in the catalog.
- **Leading / Trailing Whitespace in SKU or Name**: Whitespace must be trimmed automatically during normalization.
- **Zero Initial Stock**: Registering a catalog placeholder or upcoming product with 0 stock is permitted, creating the product record without writing an inbound stock adjustment log.
- **Malformed Location String**: Locations must follow the warehouse rack/shelf format (e.g. `RACK-A1-S2` or `A-1-2`); invalid arbitrary strings must be flagged with validation errors.
- **Network / Database Outage**: If Supabase connection fails, the server action falls back to Prisma transaction if available, or returns a structured error object `{ success: false, error, code: 'DATABASE_ERROR' }`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a server action `createProductAction(payload)` in `lib/admin/product-actions.ts` to create new products in Supabase PostgreSQL.
- **FR-002**: System MUST enforce case-insensitive uniqueness on `sku` at both the database level (PostgreSQL unique constraint / index on `LOWER(sku)`) and application level.
- **FR-003**: System MUST return `{ success: false, error: 'SKU already exists in the catalog.', code: 'SKU_ALREADY_EXISTS' }` when a duplicate SKU is detected.
- **FR-004**: System MUST validate input fields: non-empty `name`, `sku`, `category`, `brand`, `model`, valid `location`, positive unit `cost`, positive `wholesale` and `retail` prices, non-negative integer `stock`, and positive integer `minThreshold`.
- **FR-005**: System MUST compute default wholesale (+18%) and retail (+35% OEM / +40% Aftermarket) markups if explicit pricing overrides are not provided.
- **FR-006**: System MUST atomically write an initial inbound entry to `public.stock_adjustment_logs` when initial stock quantity is greater than 0.
- **FR-007**: System MUST call `revalidatePath('/admin/inventory')` upon successful persistence.
- **FR-008**: System MUST wire the `+ Add Part` button in `app/admin/inventory/page.tsx` and `InventoryCatalog` to open `NewProductModal` / `ProductRegistrationModal`.
- **FR-009**: System MUST prepend newly registered products directly into the active `InventoryStore` state upon successful registration.
- **FR-010**: All user interface components MUST strictly use SWIFT design tokens (`bg-bg-surface`, `text-text-primary`, `bg-primary`, etc.) with zero hardcoded hex/rgb values.
