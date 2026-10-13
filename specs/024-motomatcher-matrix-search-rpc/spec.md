# Feature Specification: Supabase Atomic MotoMatcher Matrix Search RPC & Fitment Verification Engine

**Feature Branch**: `feat/SIAA-54`  
**Created**: 2026-10-14  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-54](https://the-three-devsketeers.atlassian.net/browse/SIAA-54) (STORY-4.7)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and repair bays, service counter advisors and fast-lane cashiers must instantly determine whether replacement parts fit a customer's specific motorcycle model. Customers frequently inquire about both original equipment manufacturer (OEM) factory replacements and higher-performance aftermarket alternatives (e.g. ceramic brake pads, racing CVT belts, iridium spark plugs).

While SIAA-53 established the underlying database tables (`public.motorcycle_models` and `public.product_fitments`), fetching compatible parts previously required multiple client-side round-trips or cumbersome ad-hoc joins. 

This feature delivers **`get_moto_matcher_matrix`**: a high-performance PostgreSQL stored procedure (RPC) and companion Next.js Server Action bridge (`getFitmentMatrixAction`) that:
1. Accepts a target motorcycle model ID, optional subsystem category (e.g. `Brakes`, `Drivetrain`, `Fluids`, `Ignition`), and optional search keyword.
2. Partitions results into two clean groups: `oem_parts` (OEM genuine standard items) and `aftermarket_parts` (performance upgrades & universal items).
3. Automatically marks catalog-wide universal items (e.g. Motul 3100 10W40, Shell Advance AX7) under `aftermarket_parts` with `is_universal: true`.
4. Calculates upsell price differentials (`+₱130.00 (+28.8%)`) between OEM and aftermarket alternatives within the same subsystem to empower 1-click counter upsells.
5. Executes atomically within sub-50ms query latency leveraging existing B-tree composite indexes.
6. Provides a resilient Next.js Server Action with pure TypeScript fallback for offline resilience and local unit testing.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Partitioned OEM vs. Aftermarket Matrix Retrieval (Priority: P1)

* **As a** Service Counter Advisor or Fast-Lane Cashier,
* **I want** a high-performance PostgreSQL stored procedure (`get_moto_matcher_matrix`) that accepts a motorcycle model ID, optional subsystem category, and search keyword,
* **so that** the database returns partitioned OEM standard parts and aftermarket upgrade alternatives in a single sub-50ms query with live inventory levels and upsell price differentials.

#### Scenario 1: Partitioned OEM vs. Aftermarket Matrix Result
* **Given** motorcycle model `Yamaha NMAX 155` with linked parts in `public.product_fitments`,
* **When** `SELECT * FROM get_moto_matcher_matrix(p_model_id => '...', p_category => NULL, p_search => NULL)` is executed,
* **Then** the function returns a JSON payload with two keys:
  - `oem_parts`: array containing parts flagged `fitment_type = 'oem'` or `oem = true`.
  - `aftermarket_parts`: array containing parts flagged `fitment_type = 'aftermarket'`.
* **And** both lists include:
  - `id`: Product UUID
  - `sku`: Master product SKU (e.g. `YAM-NMAX-BL01`)
  - `name`: Product title (e.g. `Yamaha Genuine Front Brake Pad Set`)
  - `brand`: Manufacturer brand (e.g. `Yamaha`, `Racing Boy (RCB)`)
  - `category`: Subsystem category (e.g. `Brakes`, `Drivetrain`)
  - `retail_price`: Numeric retail price (e.g. `450.00`)
  - `stock_level`: Current on-hand inventory count (e.g. `12`)
  - `min_threshold`: Low stock threshold alert level
  - `shelf_location`: Shelf/rack coordinate badge (e.g. `B-02-1`)
  - `fitment_type`: Fitment tier (`oem` | `aftermarket` | `universal`)
  - `fitment_notes`: Specific installation or compatibility notes (e.g. `Front caliper OEM direct fit`)
  - `year_range`: Production year compatibility string (e.g. `2020-2026`)
  - `is_universal`: Boolean flag (`false` for dedicated model parts)

#### Scenario 2: Inclusion of Universal Parts
* **Given** catalog items flagged with make/model `'Universal'` (e.g. `MOT-3100-10W40` Motul 3100 10W40, `SHL-ADV-AX7` Shell Advance AX7),
* **When** querying any motorcycle model (e.g. `Yamaha NMAX 155`, `Honda Click 125i/150i`, `Suzuki Raider 150 Fi`),
* **Then** universal parts are included under the `aftermarket_parts` partition,
* **And** each universal part is marked with `is_universal: true` and `fitment_type: 'universal'`.

#### Scenario 3: Subsystem Category & Keyword Filtering
* **Given** a query for `Yamaha NMAX 155` with `p_category => 'Brakes'`,
* **When** the function executes,
* **Then** only brake pads and brake-related parts (e.g. `YAM-NMAX-BL01`, `RCB-NMAX-BP02`) are returned in the payload,
* **And** drivetrain, fluids, and ignition parts are filtered out server-side.
* **Given** a query with `p_search => 'ceramic'`,
* **When** the function executes,
* **Then** only parts matching 'ceramic' in SKU, name, brand, or notes (e.g. `RCB-NMAX-BP02`) are returned.

#### Scenario 4: Upsell Price Delta Calculation
* **Given** an OEM part with retail price ₱450.00 and an aftermarket alternative with retail price ₱580.00 in the same subsystem (`Brakes`),
* **When** the matrix payload is constructed,
* **Then** the aftermarket part object includes:
  - `upsell_delta_amount`: `130.00`
  - `upsell_delta_percent`: `28.89`
  - `upsell_badge`: `"+₱130.00 (+28.9%)"` (or `"+₱130.00 (+28.8%)"`)
  - `oem_reference_sku`: `"YAM-NMAX-BL01"`
* **And** counter advisors can recommend the upgrade with a single glance.

---

### User Story 2 - Sub-50ms Execution & Database Security (Priority: P1)

* **As a** Shop Administrator or Database Architect,
* **I want** the matrix search RPC to execute in `< 50ms` and conform to PostgreSQL security standards (`SECURITY DEFINER`, `search_path`, PostgREST grants),
* **so that** cashier terminals operate with zero lag and unauthenticated/authenticated roles access the data securely according to RLS policies.

#### Scenario 1: Sub-50ms Query Performance
* **Given** a database seeded with products, motorcycle models, and fitments,
* **When** `get_moto_matcher_matrix` executes,
* **Then** it utilizes B-tree indexes `idx_product_fitments_model_type`, `idx_product_fitments_product`, and `idx_products_category`,
* **And** execution completes in under 50ms without full table scans.

#### Scenario 2: Safe Fallback on Invalid or Missing Model ID
* **Given** a non-existent or null model ID passed to `get_moto_matcher_matrix`,
* **When** the function executes,
* **Then** it returns `{ "oem_parts": [], "aftermarket_parts": [] }` without raising unhandled SQL exceptions or null pointer errors.

#### Scenario 3: PostgREST Permissions & API Accessibility
* **Given** PostgREST roles `anon`, `authenticated`, and `service_role`,
* **When** invoking `rpc/get_moto_matcher_matrix`,
* **Then** `EXECUTE` privileges are granted to `anon`, `authenticated`, and `service_role`.

---

### User Story 3 - Next.js Server Action Bridge & Offline Mock Resilience (Priority: P1)

* **As a** Full-Stack Developer or Front-End Engineer,
* **I want** a typed Next.js Server Action `getFitmentMatrixAction(modelId, category, search)` in `lib/motomatcher/actions.ts`,
* **so that** UI components (`<MotoMatcherMatrixGrid />`, `<StaffCompatView />`) can seamlessly call the RPC with zero client bundle overhead and reliable fallback when offline.

#### Scenario 1: Server Action Invocation
* **Given** a valid motorcycle model ID,
* **When** `getFitmentMatrixAction(modelId, category, search)` is called from a Server Component or Client Component,
* **Then** it invokes Supabase RPC `get_moto_matcher_matrix`, validates the output with Zod contract `MotoMatcherMatrixPayloadSchema`, and returns typed `MotoMatcherMatrixResult`.

#### Scenario 2: Offline Mock Fallback
* **Given** the database is unmigrated, local Supabase is offline, or unit tests are executing,
* **When** `getFitmentMatrixAction` catches a network or missing RPC error,
* **Then** it executes the pure TypeScript fallback matrix engine matching the exact same business logic and seed data, returning a valid matrix result.

---

## 3. Functional Requirements

- **FR-001**: System MUST create SQL migration `supabase/migrations/20261016000000_moto_matcher_matrix_rpc.sql` containing function `public.get_moto_matcher_matrix(p_model_id UUID, p_category TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL)`.
- **FR-002**: Function MUST return a JSON/JSONB object containing two arrays: `oem_parts` and `aftermarket_parts`.
- **FR-003**: `oem_parts` MUST include products matching `p_model_id` where `fitment_type = 'oem'` or `products.oem = true`.
- **FR-004**: `aftermarket_parts` MUST include products matching `p_model_id` where `fitment_type = 'aftermarket'` AND universal products (`model = 'Universal'` or `fitment_type = 'universal'`).
- **FR-005**: Universal products MUST have `is_universal: true` in the output JSON.
- **FR-006**: When `p_category` is provided (non-null and non-empty), the function MUST filter both OEM and aftermarket parts to only match the specified category (case-insensitive).
- **FR-007**: When `p_search` is provided (non-null and non-empty), the function MUST filter parts matching the search string in `sku`, `name`, `brand`, or `notes` (case-insensitive substring).
- **FR-008**: For each aftermarket part that shares the same `category` as an OEM part for the queried motorcycle model, the function MUST calculate:
  - `upsell_delta_amount`: `aftermarket.retail - oem.retail`
  - `upsell_delta_percent`: `((aftermarket.retail - oem.retail) / oem.retail) * 100` (rounded to 1 decimal place)
  - `upsell_badge`: Formatted string `"+₱<amount> (+<percent>%)"` or `"-₱<amount> (-<percent>%)"`
  - `oem_reference_sku`: SKU of the benchmark OEM part.
- **FR-009**: When no OEM part exists in the same category, `upsell_delta_amount` and related fields MUST be `null`.
- **FR-010**: System MUST grant `EXECUTE` privileges on `get_moto_matcher_matrix` to `anon`, `authenticated`, and `service_role`.
- **FR-011**: System MUST provide Server Action `getFitmentMatrixAction(modelId: string, category?: string | null, search?: string | null)` in `lib/motomatcher/actions.ts` (or `lib/actions/motomatcher-actions.ts`).
- **FR-012**: System MUST provide offline fallback logic supporting all 12 baseline seed fitment rules and 5 motorcycle models from `mockup/app.js` and `supabase/seed.sql`.

---

## 4. Non-Functional Requirements & Design Tokens

- **NFR-001 (Performance)**: Matrix RPC execution MUST complete in `< 50ms` on PostgreSQL for catalog sizes up to 50,000 products.
- **NFR-002 (Security)**: Function MUST be created with `SECURITY DEFINER` and `SET search_path = public` to avoid search path hijacking.
- **NFR-003 (Design Tokens)**: Any UI rendering or badge styles MUST strictly adhere to SWIFT design tokens (`lib/tokens.ts`, `app/globals.css`):
  - OEM Badges: `bg-primary-light`, `text-primary`, `border-primary-border`
  - Aftermarket Badges: `bg-secondary-light`, `text-secondary`, `border-secondary-border`
  - Universal Badges: `bg-info-light`, `text-info`, `border-info-border`
  - Upsell Positive Delta Badges: `bg-accent-light`, `text-accent`, `border-accent-border`
  - Low Stock Badges: `bg-danger-light`, `text-danger`, `border-danger-border`
- **NFR-004 (Type Safety)**: 100% strict TypeScript types and Zod schema contracts with zero use of `any`.
- **NFR-005 (Automated Test Coverage)**: Automated test suite verifying RPC output structure, universal part inclusion, category/keyword filtering, upsell delta math, and fallback resilience.

---

## 5. Clarifications & Resolved Edge Cases

- **C-1: Multiple OEM Parts in Same Category**: If a model has multiple OEM parts in a category (e.g. front brake pad and rear brake pad), the upsell delta benchmarks against the OEM part with the closest name/notes match or the lowest priced OEM benchmark in that category.
- **C-2: Aftermarket Part Priced Cheaper than OEM**: If an aftermarket option is cheaper (e.g. OEM ₱500 vs Aftermarket ₱350), `upsell_delta_amount` is `-150.00` and `upsell_badge` displays `"-₱150.00 (-30.0%)"`, representing a cost-saving alternative.
- **C-3: Universal Parts Category Matching**: Universal parts (e.g. 10W40 Oil under `Fluids`) only match when `p_category` is NULL or `p_category = 'Fluids'`.
- **C-4: Stock Status & Shelf Badges**: Shelf coordinates (e.g. `Rack B, Shelf 2` or `B-02-1`) and stock counts are pulled directly from `public.products.location` and `public.products.stock`.
