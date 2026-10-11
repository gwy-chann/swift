# Feature Specification: Supabase Motorcycle Models & Fitment Compatibility Matrix Schema, Indexes, RLS & Baseline Seed Data

**Feature Branch**: `feat/SIAA-53-motomatcher-compatibility-schema-seed`  
**Created**: 2026-10-12  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-53](https://the-three-devsketeers.atlassian.net/browse/SIAA-53) (STORY-4.6)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Relational Motorcycle Models & Fitment Schema Provisioning (Priority: P1)

As a Parts Catalog Administrator or Shop Mechanic,  
I want a dedicated relational database schema for motorcycle makes/models and multi-part fitment mappings persisted in Supabase PostgreSQL with strict foreign keys, B-tree indexes, and Row-Level Security,  
so that fitment relationships are persistent, relational integrity is guaranteed, and query response times remain under 50ms across thousands of cataloged parts.

**Why this priority**: The motorcycle fitment matrix is the relational foundation for MotoMatcher (EPIC-4), enabling precise bike compatibility lookups, parts interchangeability, and floor terminal filtering without error-prone loose text matching.

**Independent Test**: Can be tested by executing SQL migration `20261011000000_motomatcher_compatibility.sql` against the database and confirming the tables, foreign keys, unique constraints, and B-tree indexes exist with zero syntax or constraint errors.

**Acceptance Scenarios**:

1. **Given** a Supabase PostgreSQL instance with existing `public.products`,  
   **When** migration `20261011000000_motomatcher_compatibility.sql` is executed,  
   **Then** the `public.motorcycle_models` table is created with:
     - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid())
     - `make` (TEXT NOT NULL)
     - `model` (TEXT NOT NULL)
     - `displacement_cc` (INTEGER NOT NULL CHECK (displacement_cc > 0))
     - `year_start` (INTEGER NOT NULL CHECK (year_start > 1900))
     - `year_end` (INTEGER NULLABLE CHECK (year_end IS NULL OR year_end >= year_start))
     - `category` (TEXT NOT NULL)
     - `image_url` (TEXT NULLABLE)
     - `created_at` (TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()))
     - `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()))
     - UNIQUE constraint on `(make, model, year_start)`.
2. **And** the `public.product_fitments` table is created with:
     - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid())
     - `product_id` (UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE)
     - `model_id` (UUID NOT NULL REFERENCES public.motorcycle_models(id) ON DELETE CASCADE)
     - `fitment_type` (TEXT NOT NULL CHECK (fitment_type IN ('oem', 'aftermarket', 'universal')))
     - `year_range` (TEXT NULLABLE)
     - `notes` (TEXT NULLABLE)
     - `created_at` (TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()))
     - UNIQUE constraint on `(product_id, model_id)`.
3. **And** B-tree indexes are created on:
     - `public.product_fitments(model_id, fitment_type)`
     - `public.product_fitments(product_id)`
     - `public.motorcycle_models(make, model)`.
4. **Given** the migration executed once,  
   **When** executed again during re-runs or resets,  
   **Then** the script completes idempotently (`IF NOT EXISTS` guards) without errors.

---

### User Story 2 - Row-Level Security Access Boundaries (Priority: P1)

As a Counter Cashier or Shop Floor Mechanic,  
I want unrestricted read access to motorcycle models and fitment records from floor terminals,  
while ensuring non-admin staff cannot alter or delete verified motorcycle model compatibility matrices.

**Why this priority**: Prevents accidental catalog corruption and unauthorized fitment overrides while maintaining instant zero-auth lookup performance on cashier POS and floor inquiry terminals.

**Independent Test**: Can be tested by executing `SELECT` queries as anonymous and authenticated users (both succeed) and attempting `INSERT`/`UPDATE`/`DELETE` queries under standard user vs admin credentials (only admin succeeds).

**Acceptance Scenarios**:

1. **Given** unauthenticated counter visitors or staff floor terminals,  
   **When** querying `public.motorcycle_models` and `public.product_fitments`,  
   **Then** `SELECT` access is granted to all authenticated and anonymous clients (`anon`, `authenticated`).
2. **Given** non-admin authenticated users (e.g. `cashier`, `mechanic`),  
   **When** attempting `INSERT`, `UPDATE`, or `DELETE` on `public.motorcycle_models` or `public.product_fitments`,  
   **Then** the operation is rejected by RLS policy `Admin full control on fitments` and `Admin full control on motorcycle models`.
3. **Given** an authenticated user with role `admin`,  
   **When** performing `INSERT`, `UPDATE`, or `DELETE` on fitments or models,  
   **Then** the operation is permitted and persists.

---

### User Story 3 - Baseline Seed Data Population (Priority: P1)

As a Store Manager or MotoMatcher Terminal Operator,  
I want canonical motorcycle models and 12 baseline part compatibility rules pre-populated in the database,  
so that the MotoMatcher compatibility finder is functional immediately upon database provisioning.

**Why this priority**: Eliminates manual motorcycle data entry and establishes the canonical test bed matching `mockup/app.js` and `lib/mock-data/motorcycles.ts`.

**Independent Test**: Can be tested by running `supabase/seed.sql` on a clean or reset database and verifying 5 motorcycle models and 12 fitment records exist and link accurately to baseline parts.

**Acceptance Scenarios**:

1. **Given** an initialized database running `supabase/seed.sql`,  
   **When** seed execution completes,  
   **Then** 5 baseline models are populated in `public.motorcycle_models`:
     - Yamaha NMAX 155 (Displacement: 155, Years: 2020-2026, Category: Scooter)
     - Yamaha Aerox 155 (Displacement: 155, Years: 2019-2026, Category: Scooter)
     - Honda Click 125i/150i (Displacement: 150, Years: 2018-2026, Category: Scooter)
     - Honda ADV 160 (Displacement: 160, Years: 2022-2026, Category: Scooter)
     - Suzuki Raider 150 Fi (Displacement: 150, Years: 2017-2026, Category: Underbone)
2. **And** all 12 baseline compatibility rules from `lib/mock-data/motorcycles.ts` and `mockup/app.js` are inserted into `public.product_fitments` referencing the appropriate `product_id` (via SKU) and `model_id`.
3. **Given** seed script execution runs a second time,  
   **When** `supabase/seed.sql` runs,  
   **Then** operations complete idempotently using `ON CONFLICT` clauses without unique constraint violations.

---

### User Story 4 - Prisma ORM Schema Synchronization & Server-Side Hydration Types (Priority: P2)

As a Next.js Fullstack Developer,  
I want synchronized Prisma ORM models (`MotorcycleModel`, `ProductFitment`) and typed TypeScript interfaces (`MotorcycleModelRecord`, `ProductFitmentRecord`),  
so that server actions and components can query motorcycle fitments with full compile-time type safety.

**Why this priority**: Ensures zero schema drift between the PostgreSQL database and application code, enabling SSR pre-fetching in `app/admin/motomatcher/page.tsx` and `app/staff/compat/page.tsx`.

**Independent Test**: Can be tested by running `npx prisma validate` and `npx tsc --noEmit`.

**Acceptance Scenarios**:

1. **Given** the updated `prisma/schema.prisma`,  
   **When** `npx prisma validate` is executed,  
   **Then** the schema passes validation with 0 errors, defining `MotorcycleModel` and `ProductFitment` with reverse relation `fitments ProductFitment[]` on `Product`.
2. **Given** `lib/types/product.ts`,  
   **When** imported by Server Components or Actions,  
   **Then** `MotorcycleModelRecord` and `ProductFitmentRecord` are exported with complete property typing.
3. **Given** `app/admin/motomatcher/page.tsx` and `app/staff/compat/page.tsx`,  
   **When** rendered,  
   **Then** they utilize server action fetching to hydrate initial motorcycle models.

---

## Edge Cases

- **Cascading Deletions**: If a product is removed from `public.products`, all corresponding `product_fitments` rows are automatically deleted via `ON DELETE CASCADE` without orphaned records.
- **Cascading Model Removal**: If a motorcycle model is removed from `public.motorcycle_models`, all associated fitments are deleted via `ON DELETE CASCADE`.
- **Duplicate Fitment Pairs**: Attempting to link the same `product_id` and `model_id` a second time is rejected by the UNIQUE constraint `(product_id, model_id)`.
- **Universal Parts Fitment**: Products with `fitment_type = 'universal'` (such as 4T engine oils) link to a designated universal model entry or use universal fitment tagging.
- **Null Year Endings**: In-production current-year models have `year_end = NULL` to denote ongoing manufacture without invalid range checks.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide SQL migration `supabase/migrations/20261011000000_motomatcher_compatibility.sql` creating `public.motorcycle_models` and `public.product_fitments`.
- **FR-002**: System MUST enforce primary keys, non-null fields, non-negative displacement, positive year constraints, and unique constraints `(make, model, year_start)` on `motorcycle_models` and `(product_id, model_id)` on `product_fitments`.
- **FR-003**: System MUST enforce foreign key relations with `ON DELETE CASCADE` from `product_fitments` to `products(id)` and `motorcycle_models(id)`.
- **FR-004**: System MUST create B-tree indexes on `product_fitments(model_id, fitment_type)`, `product_fitments(product_id)`, and `motorcycle_models(make, model)`.
- **FR-005**: System MUST enable Row-Level Security on both tables, granting `SELECT` to public/anon/authenticated roles, and restricting mutations (`INSERT`, `UPDATE`, `DELETE`) to `admin` users.
- **FR-006**: System MUST update `supabase/seed.sql` to populate the 5 baseline motorcycle models and 12 baseline product fitment rules idempotently.
- **FR-007**: System MUST synchronize `prisma/schema.prisma` with `MotorcycleModel` and `ProductFitment` models passing `npx prisma validate`.
- **FR-008**: System MUST export `MotorcycleModelRecord` and `ProductFitmentRecord` TypeScript interfaces from `lib/types/product.ts`.
- **FR-009**: System MUST provide a server action (`getMotorcycleModelsAction()`) in `lib/admin/product-actions.ts` (or `lib/actions/motomatcher-actions.ts`) to query motorcycle models.
- **FR-010**: System MUST support SSR hydration in `app/admin/motomatcher/page.tsx` and `app/staff/compat/page.tsx`.

---

## Key Entities

### Entity: MotorcycleModel (`public.motorcycle_models`)
- `id`: UUID (Primary Key, default `gen_random_uuid()`)
- `make`: String (e.g. 'Yamaha', 'Honda', 'Suzuki')
- `model`: String (e.g. 'NMAX 155', 'Click 125i/150i')
- `displacement_cc`: Integer (e.g. 155, 125, 160)
- `year_start`: Integer (e.g. 2018, 2020)
- `year_end`: Integer, nullable (e.g. 2026, or NULL for current production)
- `category`: String (e.g. 'Scooter', 'Underbone', 'Backbone')
- `image_url`: String, nullable
- `created_at`: Timestamp with time zone
- `updated_at`: Timestamp with time zone

### Entity: ProductFitment (`public.product_fitments`)
- `id`: UUID (Primary Key, default `gen_random_uuid()`)
- `product_id`: UUID (Foreign Key references `products(id)` ON DELETE CASCADE)
- `model_id`: UUID (Foreign Key references `motorcycle_models(id)` ON DELETE CASCADE)
- `fitment_type`: String (Check constraint: `'oem'`, `'aftermarket'`, `'universal'`)
- `year_range`: String, nullable (e.g. '2020-2026')
- `notes`: String, nullable (e.g. 'Front caliper OEM direct fit')
- `created_at`: Timestamp with time zone

---

## Success Criteria *(mandatory)*

- **SC-001**: Database migration executes cleanly and idempotently with 0 errors across cold initialization and repeated execution.
- **SC-002**: Fitment queries by model execute under 50ms utilizing dedicated B-tree composite indexes.
- **SC-003**: 100% of baseline models (5) and compatibility rules (12) are seeded accurately upon running `supabase/seed.sql`.
- **SC-004**: Non-admin clients are strictly prevented from altering fitments while retaining instant unrestricted `SELECT` capabilities.
- **SC-005**: `npx prisma validate` and `npm run typecheck` succeed with 0 validation or compilation errors.
