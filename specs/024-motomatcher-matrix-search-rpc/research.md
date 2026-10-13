# Technical Research & Architecture Decisions: Supabase Atomic MotoMatcher Matrix Search RPC & Fitment Verification Engine

**Feature**: `024-motomatcher-matrix-search-rpc`  
**Jira Issue**: [SIAA-54](https://the-three-devsketeers.atlassian.net/browse/SIAA-54) (STORY-4.7)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Technical Context & Baseline Architecture

### 1.1 Existing Implementations & Prerequisite Work
1. **Schema & Database Layer (SIAA-53 & SIAA-45)**:
   - `public.products`: Contains `id`, `sku`, `name`, `category`, `brand`, `model`, `cost`, `wholesale`, `retail`, `stock`, `min_threshold`, `location`, `oem`, `image_url`, `description`.
   - `public.motorcycle_models`: Contains `id`, `make`, `model`, `displacement_cc`, `year_start`, `year_end`, `category`, `image_url`.
   - `public.product_fitments`: Contains `id`, `product_id`, `model_id`, `fitment_type` (`oem` | `aftermarket` | `universal`), `year_range`, `notes`.
   - Composite B-tree indexes exist on `product_fitments(model_id, fitment_type)`, `product_fitments(product_id)`, and `products(category)`.
2. **Existing Actions & Types**:
   - `lib/types/product.ts` defines `Product`, `MotorcycleModelRecord`.
   - `lib/actions/motomatcher-actions.ts` provides `getMotorcycleModelsAction()`.
   - Baseline seed data in `supabase/seed.sql` populates 5 motorcycle models and 12 canonical product fitment relationships.

### 1.2 Performance Requirement
- Target query latency: **< 50ms** across up to 50,000 product rows.
- Single database round-trip returning pre-partitioned JSON eliminates client-side join orchestration and payload over-fetching.

---

## 2. Architectural Decisions & Alternatives Considered

### Decision 1: PostgreSQL Stored Procedure (`get_moto_matcher_matrix`) vs. Multiple Client Queries
- **Chosen Approach**: A single PostgreSQL stored procedure `public.get_moto_matcher_matrix(p_model_id UUID, p_category TEXT, p_search TEXT) RETURNS JSONB`.
- **Rationale**:
  - Eliminates 3 separate round-trips (OEM parts, aftermarket parts, universal parts).
  - Performs upsell delta calculation directly on the PostgreSQL server, reducing client CPU overhead on lower-powered POS hardware.
  - Leverages PostgreSQL's query planner with index scans over `public.product_fitments` and `public.products`.
  - `SECURITY DEFINER` with `SET search_path = public` ensures safe execution across `anon` and `authenticated` roles without granting direct table mutation privileges.
- **Alternatives Considered**:
  - *Client-side aggregation*: High network transfer overhead; multiple round trips; duplicate logic in Admin and Staff portals.
  - *PostgreSQL View*: Views cannot easily accept parameterized filters (`p_model_id`, `p_category`, `p_search`) for JSON aggregation without complex table functions.

### Decision 2: JSONB Aggregation & Result Partitioning
- **Chosen Schema**:
  ```sql
  jsonb_build_object(
    'oem_parts', COALESCE(oem_array, '[]'::jsonb),
    'aftermarket_parts', COALESCE(aftermarket_array, '[]'::jsonb)
  )
  ```
- **Structure per Part**:
  - `id`: UUID
  - `sku`: TEXT
  - `name`: TEXT
  - `brand`: TEXT
  - `category`: TEXT
  - `retail_price`: NUMERIC
  - `stock_level`: INTEGER
  - `min_threshold`: INTEGER
  - `shelf_location`: TEXT (from `products.location`)
  - `fitment_type`: TEXT ('oem', 'aftermarket', 'universal')
  - `fitment_notes`: TEXT (from `product_fitments.notes`)
  - `year_range`: TEXT (from `product_fitments.year_range`)
  - `is_universal`: BOOLEAN
  - `upsell_delta_amount`: NUMERIC (or null for OEM)
  - `upsell_delta_percent`: NUMERIC (or null for OEM)
  - `upsell_badge`: TEXT (or null for OEM)
  - `oem_reference_sku`: TEXT (or null for OEM)

### Decision 3: Subsystem Upsell Delta Calculation
- When aftermarket parts have an OEM benchmark in the same `category` for that motorcycle model:
  - If OEM retail = ₱450.00 and Aftermarket retail = ₱580.00:
    - Delta = `+130.00`
    - Percentage = `((580 - 450) / 450) * 100 = +28.89%`
    - Badge = `"+₱130.00 (+28.9%)"`
  - If Aftermarket retail is lower (e.g. ₱350.00 vs ₱450.00):
    - Delta = `-100.00`
    - Percentage = `-22.22%`
    - Badge = `"-₱100.00 (-22.2%)"`

### Decision 4: Resilient Server Action Bridge with Offline Fallback
- `lib/actions/motomatcher-actions.ts` (or `lib/motomatcher/actions.ts`):
  - Exposes `getFitmentMatrixAction(modelId: string, category?: string | null, search?: string | null): Promise<MotoMatcherMatrixResult>`.
  - Attempts Supabase RPC call: `supabase.rpc('get_moto_matcher_matrix', { p_model_id: modelId, p_category: category || null, p_search: search || null })`.
  - Validates payload with Zod `MotoMatcherMatrixPayloadSchema`.
  - Fallback: In local dev without live database or when offline, runs pure TypeScript filter across `MOCK_PRODUCTS` and `MOCK_PRODUCT_FITMENTS` with identical upsell delta logic.

---

## 3. Design Tokens & Styling Compliance

UI components consuming the matrix payload (`<MotoMatcherMatrixGrid />`, `<StaffCompatView />`) MUST strictly employ SWIFT semantic design tokens:

| Element | Semantic Token Classes | Rationale |
| :--- | :--- | :--- |
| **OEM Badge** | `bg-primary-light text-primary border-primary-border` | Genuine OEM factory brand signature |
| **Aftermarket Badge** | `bg-secondary-light text-secondary border-secondary-border` | Performance upgrade highlight |
| **Universal Badge** | `bg-info-light text-info border-info-border` | Multi-fit catalog indicator |
| **Upsell Price Badge (+)** | `bg-accent-light text-accent border-accent-border` | Highlighting upsell margin & opportunity |
| **Price Save Badge (-)** | `bg-success-light text-success border-success-border` | Highlighting economy savings |
| **In Stock Badge** | `bg-success-light text-success border-success-border` | Available inventory indicator |
| **Low / Out of Stock** | `bg-danger-light text-danger border-danger-border` | Reorder warning |
| **Shelf Coordinate** | `bg-bg-muted text-text-secondary border-border` | Warehouse shelf locator coordinate |
