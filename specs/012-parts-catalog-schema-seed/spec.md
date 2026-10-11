# Feature Specification: Supabase Master Parts Catalog Schema, Indexes, RLS & Baseline Seed Data

**Feature Branch**: `feat/SIAA-45-parts-catalog-schema-seed`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-45 - STORY-2.6: Supabase Master Parts Catalog Schema, Indexes, RLS & Baseline Seed Data. Complete motorcycle parts catalog, pricing tiers, and warehouse shelf locators persisted in Supabase PostgreSQL with strict integrity constraints, Row-Level Security, B-tree indexes, baseline 12-item seed data, Prisma ORM sync, and server hydration."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Idempotent Master Parts Catalog Schema & Index Provisioning (Priority: P1)

System administrators, warehouse managers, and workshop software components require a robust, persistent catalog structure storing motorcycle parts, multi-tier pricing, inventory quantities, and warehouse shelf locators with strict data integrity rules and high-performance search indexes.

**Why this priority**: The parts catalog is the central database foundation for all stock management, point-of-sale checkout, warehouse navigation, and inventory reordering workflows. Without it, product data cannot persist across sessions.

**Independent Test**: Can be independently tested by executing the database migration against a clean or existing database instance and verifying that the catalog schema, field constraints, unique SKU enforcement, and search indexes are established cleanly without runtime errors.

**Acceptance Scenarios**:

1. **Given** a database environment, **When** migration `20261010000000_inventory_products.sql` is applied, **Then** the `public.products` table is provisioned with primary key UUID `id`, unique `sku`, `name`, `category`, `brand`, `model` (defaulting to 'Universal'), non-negative monetary constraints for `cost`, `wholesale`, and `retail`, non-negative numeric constraints for `stock` and `min_threshold`, nullable `location`, boolean `oem`, `image_url`, `description`, and timestamp tracking fields (`created_at`, `updated_at`).
2. **Given** the provisioned catalog table, **When** examining database indexes, **Then** dedicated B-tree indexes exist for `sku`, `category`, `brand`, `model`, and `location` to accelerate catalog lookups.
3. **Given** an existing database with the migration already executed, **When** the migration is re-run during deployment or development reset, **Then** the operation completes idempotently without schema disruption or duplicate table errors.

---

### User Story 2 - Canonical Baseline Motorcycle Parts Seeding (Priority: P1)

Store managers, floor technicians, and onboarding staff need the standard baseline catalog of 12 motorcycle parts (brakes, drive belts, spark plugs, fluids, clutch components, tires, and universal bearings) pre-populated with exact shelf locations, multi-tier pricing markups, and vehicle compatibility so the shop is operational immediately upon initialization.

**Why this priority**: Eliminates manual product entry during initial system deployment, staging validation, automated testing runs, and stakeholder demonstrations.

**Independent Test**: Can be tested independently by running the database seed script on a migrated database and confirming that all 12 baseline motorcycle parts are populated with exact prices, initial quantities, and shelf locators matching the canonical shop data.

**Acceptance Scenarios**:

1. **Given** an initialized parts catalog table, **When** the baseline seed script (`supabase/seed.sql`) is executed, **Then** all 12 canonical motorcycle parts from the shop catalog are populated with their exact physical locations (e.g., 'Rack A-01 / Shelf 2', 'Aisle 1 / Shelf 1', 'Tire Rack 2 / Floor'), pricing tiers (cost, wholesale, retail), and fitment attributes.
2. **Given** a database where seed items already exist, **When** the seed script is executed again, **Then** the operation succeeds idempotently without inserting duplicate records or throwing unique constraint violations.

---

### User Story 3 - Role-Based Row-Level Security & Tamper Protection (Priority: P2)

Floor mechanics, cashier terminal users, and customer-facing lookups require instant read access to browse part specifications, stock levels, and shelf locators, while non-administrative staff must be strictly prevented from tampering with supplier acquisition costs or deleting parts records.

**Why this priority**: Protects sensitive wholesale/supplier margin data and enforces strict accounting governance, preventing unauthorized price alterations or accidental SKU deletions from shop terminals.

**Independent Test**: Can be tested independently by executing read and write operations under unauthenticated, standard staff, and administrative roles, verifying that query permissions and write boundaries strictly adhere to security policies.

**Acceptance Scenarios**:

1. **Given** unauthenticated counter visitors or floor staff terminals, **When** reading products from the catalog, **Then** `SELECT` operations succeed and return part details, stock counts, and shelf locations.
2. **Given** a non-administrative staff member or anonymous session, **When** attempting to update product base acquisition costs or delete a product SKU, **Then** the database security policy rejects the operation with an authorization failure.
3. **Given** an authenticated shop administrator, **When** updating product pricing tiers, modifying catalog attributes, or archiving SKUs, **Then** the operation is permitted and persists to the database.

---

### User Story 4 - Object-Relational Model & Server-Side Data Hydration (Priority: P2)

Application developers and inventory management interfaces need a synchronized object-relational model matching the database catalog schema, delivering initial catalog data via server-side rendering while hydrating client stores to maintain instant search and filtering.

**Why this priority**: Eliminates schema drift between database and application code, prevents blank loading spinners on initial page visits, and ensures the responsive client search experience remains sub-100ms.

**Independent Test**: Can be tested independently by running application schema validation (`npx prisma validate`) and verifying that the admin inventory page loads pre-fetched catalog data from the server and hydrates client stores without client-side network waterfalls.

**Acceptance Scenarios**:

1. **Given** the database schema migration, **When** schema validation is executed, **Then** the `Product` model in `prisma/schema.prisma` aligns 1:1 with `public.products` with 0 type errors.
2. **Given** a user navigating to `app/admin/inventory/page.tsx`, **When** the page renders, **Then** initial products are fetched on the server via `getProductsAction()` and passed as `initialProducts` to `<InventoryCatalog initialProducts={products} />`.
3. **Given** the rendered inventory catalog component, **When** mounted on the client, **Then** `InventoryStore` hydrates with server data on mount, preserving sub-100ms client search and filtering in `CatalogFilterBar`.

---

### Edge Cases

- **Duplicate SKU Insertion**: If an operator or script attempts to insert a record with an existing SKU, the unique constraint on `sku` rejects the insertion with an unambiguous conflict error.
- **Negative Pricing or Stock Values**: If invalid negative numbers are supplied for cost, wholesale price, retail price, stock quantity, or minimum safety threshold, table check constraints immediately reject the record.
- **Unassigned Warehouse Shelf Locations**: If a newly registered part does not yet have an assigned shelf locator, the `location` field allows `NULL` and the user interface displays a neutral "Unassigned" indicator without failing catalog search or indexing.
- **Undefined Motorcycle Model Compatibility**: If a model is not specified during product entry, the column defaults to `'Universal'` to ensure fitment filtering functions predictably.
- **Database Reset or Re-migration**: If migrations and seed scripts are executed repeatedly in continuous integration or local development workflows, all operations execute idempotently without throwing duplicate key errors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an idempotent SQL migration (`20261010000000_inventory_products.sql`) creating the `public.products` table with columns: `id` (UUID PK), `sku` (TEXT UNIQUE NOT NULL), `name` (TEXT NOT NULL), `category` (TEXT NOT NULL), `brand` (TEXT NOT NULL), `model` (TEXT NOT NULL DEFAULT 'Universal'), `cost` (NUMERIC NOT NULL CHECK (cost >= 0)), `wholesale` (NUMERIC NOT NULL CHECK (wholesale >= 0)), `retail` (NUMERIC NOT NULL CHECK (retail >= 0)), `stock` (INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)), `min_threshold` (INTEGER NOT NULL DEFAULT 0 CHECK (min_threshold >= 0)), `location` (TEXT NULLABLE), `oem` (BOOLEAN NOT NULL DEFAULT false), `image_url` (TEXT NULLABLE), `description` (TEXT NULLABLE), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT now()), and `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT now()).
- **FR-002**: System MUST generate B-tree indexes on `sku`, `category`, `brand`, `model`, and `location` to optimize query execution and search filtering.
- **FR-003**: System MUST enable Row-Level Security (RLS) on `public.products`.
- **FR-004**: System MUST permit `SELECT` queries on `public.products` for unauthenticated visitors and authenticated floor staff terminals.
- **FR-005**: System MUST restrict `UPDATE` and `DELETE` operations on `public.products` strictly to authenticated users possessing the `admin` role.
- **FR-006**: System MUST provide an automated database seed script in `supabase/seed.sql` populating the 12 canonical motorcycle parts with their exact rack/shelf locations, multi-tier pricing, and model fitment attributes.
- **FR-007**: System MUST synchronize the Prisma ORM schema (`prisma/schema.prisma`) with a corresponding `Product` model matching `public.products` with 0 validation errors.
- **FR-008**: System MUST provide a server action (`getProductsAction()`) that queries the persistent catalog from the database.
- **FR-009**: System MUST pre-fetch products on the server in `app/admin/inventory/page.tsx` and pass them as `initialProducts` to `<InventoryCatalog initialProducts={products} />`.
- **FR-010**: System MUST hydrate `InventoryStore` with server data on mount, maintaining sub-100ms client search and multi-attribute filtering in `CatalogFilterBar`.

### Key Entities *(include if feature involves data)*

- **Product (Motorcycle Part)**: Central catalog entity representing inventory items. Key attributes include unique SKU, descriptive product name, product category (Brakes, Drivetrain, Fluids, Ignition, Engine, Tires, Accessories), brand name, motorcycle model fitment (or 'Universal'), cost price, wholesale tier price, retail tier price, on-hand stock count, minimum reorder threshold, warehouse location string, and OEM status flag.
- **Warehouse Shelf Locator**: Physical storage coordinate within the workshop warehouse (e.g., "Rack A-01 / Shelf 2", "Aisle 1 / Shelf 1", "Tire Rack 2 / Floor") indicating the exact physical bin where parts are retrieved.
- **Multi-Tier Pricing Structure**: Three-level pricing model covering acquisition cost (supplier base cost), wholesale price (trade/mechanic discounted rate), and retail price (counter customer rate).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Database migration applies cleanly with 0 errors on clean or existing database instances and executes idempotently.
- **SC-002**: Catalog lookups and multi-attribute search queries across indexed fields complete in under 50 milliseconds.
- **SC-003**: All 12 baseline motorcycle products are fully seeded with 100% attribute fidelity to canonical shop data on initialization.
- **SC-004**: 100% of unauthorized cost modification or deletion attempts by non-administrative sessions are blocked by database security policies.
- **SC-005**: Prisma schema validation (`npx prisma validate`) and TypeScript type-checking pass with 0 errors or discrepancies.
- **SC-006**: Admin inventory page displays pre-fetched catalog products on initial render with 0 layout shift, and interactive client filter searches respond in under 100 milliseconds.

## Assumptions

- Database connection credentials and Supabase environment variables are properly configured in `.env.local` / `.env`.
- Currency for all product monetary figures (`cost`, `wholesale`, `retail`) is denominated in Philippine Pesos (₱).
- Unassigned shelf locations are represented by `NULL` or empty strings in the database and display as "Unassigned" in user interfaces.
- The 12 canonical seed parts provide the initial standard inventory dataset and will not overwrite newer user-created products if the seed script is rerun.
