# Research & Architecture Decisions: Supabase Motorcycle Models & Fitment Compatibility Matrix

**Feature**: `021-motomatcher-compatibility-schema-seed`  
**Jira Ticket**: [SIAA-53](https://the-three-devsketeers.atlassian.net/browse/SIAA-53) (STORY-4.6)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Technical Context & Stack Alignment

### 1.1 Database Engine: Supabase PostgreSQL 15+
- **Primary Keys**: UUID v4 generated via PostgreSQL standard `gen_random_uuid()`.
- **Integrity**: Strict foreign key constraints with `ON DELETE CASCADE` ensures that archiving/purging a product or vehicle model automatically cleans up join matrix records, eliminating stale references.
- **Indexes**:
  - `idx_product_fitments_model_type` on `(model_id, fitment_type)`: Accelerates queries filtering for all OEM or aftermarket parts for a given bike model.
  - `idx_product_fitments_product` on `(product_id)`: Accelerates reverse lookups (finding which bikes a specific part SKU fits).
  - `idx_motorcycle_models_make_model` on `(make, model)`: Optimizes cascading vehicle dropdown lookups.
- **Security**: Row-Level Security (RLS) policies:
  - Read access: Permissive `SELECT` policy enabled for `anon` and `authenticated` roles.
  - Write access: Restrictive `INSERT`, `UPDATE`, `DELETE` policies enforced via `auth.uid()` checking `public.profiles.role = 'admin'` or JWT app metadata.

### 1.2 ORM Synchronization: Prisma v6+
- Synchronize `MotorcycleModel` and `ProductFitment` models into `prisma/schema.prisma`.
- Provide bi-directional relations:
  - `Product` has `fitments ProductFitment[]`.
  - `MotorcycleModel` has `fitments ProductFitment[]`.
  - `ProductFitment` links `product Product @relation(...)` and `model MotorcycleModel @relation(...)`.
- Validate via `npx prisma validate`.

### 1.3 Baseline Models & Compatibility Data Matrix
From `lib/mock-data/motorcycles.ts` and `mockup/app.js`:
- **5 Canonical Models**:
  1. `Yamaha NMAX 155` (Make: Yamaha, Model: NMAX 155, 155cc, 2020-2026, Category: Scooter)
  2. `Yamaha Aerox 155` (Make: Yamaha, Model: Aerox 155, 155cc, 2019-2026, Category: Scooter)
  3. `Honda Click 125i/150i` (Make: Honda, Model: Click 125i/150i, 150cc, 2018-2026, Category: Scooter)
  4. `Honda ADV 160` (Make: Honda, Model: ADV 160, 160cc, 2022-2026, Category: Scooter)
  5. `Suzuki Raider 150 Fi` (Make: Suzuki, Model: Raider 150 Fi, 150cc, 2017-2026, Category: Underbone)
- **12 Canonical Compatibility Rules**:
  - `YAM-NMAX-BL01` -> Yamaha NMAX 155 (`fitment_type: 'oem'`, `year_range: '2020-2026'`, `notes: 'Front caliper OEM direct fit'`)
  - `RCB-NMAX-BP02` -> Yamaha NMAX 155 (`fitment_type: 'aftermarket'`, `year_range: '2019-2026'`, `notes: 'High-temp racing ceramic compound'`)
  - `HON-CLK-CVTB` -> Honda Click 125i/150i (`fitment_type: 'oem'`, `year_range: '2018-2026'`, `notes: 'Gates Bando dual-cog OEM belt'`)
  - `HON-ADV-CVTB` -> Honda ADV 160 (`fitment_type: 'oem'`, `year_range: '2022-2026'`, `notes: 'Gates Bando dual-cog OEM belt ADV 160'`)
  - `UMA-CLK-CVTR` -> Honda Click 125i/150i (`fitment_type: 'aftermarket'`, `year_range: '2018-2026'`, `notes: 'Reinforced kevlar fiber cord'`)
  - `MOT-3100-10W40` -> Universal (`fitment_type: 'universal'`, `notes: 'Compatible with all 4T air and liquid cooled engines'`)
  - `SHL-ADV-AX7` -> Universal (`fitment_type: 'universal'`, `notes: 'Compatible with all 4T scooter and manual clutch engines'`)
  - `NGK-CPR8EA9` -> Honda Click 125i/150i (`fitment_type: 'oem'`, `year_range: '2018-2026'`, `notes: 'Standard heat range 8'`)
  - `DEN-IU24-IR` -> Yamaha NMAX 155 (`fitment_type: 'aftermarket'`, `year_range: '2016-2026'`, `notes: '0.4mm ultra-fine iridium center electrode'`)
  - `SUZ-RAI-CLUTCH` -> Suzuki Raider 150 Fi (`fitment_type: 'oem'`, `year_range: '2017-2026'`, `notes: 'Genuine Suzuki cork-paper friction plates'`)
  - `KTR-RAI-CL6SP` -> Suzuki Raider 150 Fi (`fitment_type: 'aftermarket'`, `year_range: '2017-2026'`, `notes: 'Heavy-duty 6-spring racing pressure plate kit'`)
  - `MIC-PILOT-ST` -> Honda ADV 160 (`fitment_type: 'aftermarket'`, `year_range: '2022-2026'`, `notes: '110/80-14 front tubeless tire'`)

---

## 2. Architecture & Design Decisions

### ADR-01: Universal Compatibility Representation
- **Decision**: In `public.product_fitments`, universal parts can either reference all models with `'universal'` fitment_type or a designated `'Universal'` model record. Creating a specific Universal model entry in `motorcycle_models` with make `'Universal'` and model `'Universal / Multi-Fit'` allows standard relational foreign key joins without nullable model IDs or special-case bypasses.
- **Rationale**: Keeps foreign key constraints non-nullable (`NOT NULL`) and allows standard SQL `INNER JOIN` in fitment queries.

### ADR-02: Server Action & SSR Hydration Strategy
- **Decision**: Provide `getMotorcycleModelsAction()` in `lib/admin/product-actions.ts` (or `lib/actions/motomatcher-actions.ts`) with a graceful fallback to `MOCK_MOTORCYCLE_MODELS` if Supabase connection is offline or during testing.
- **Rationale**: Matches the pattern established by `getProductsAction()` and `getLaborServicesAction()`, enabling zero-downtime offline development and testing while wiring production database connectivity.

### ADR-03: Design Token Enforcement
- Any component changes in `app/admin/motomatcher/page.tsx` or `app/staff/compat/page.tsx` strictly use semantic SWIFT tokens (`bg-bg-card`, `border-border`, `text-text-primary`, `bg-primary`, etc.) with zero hardcoded hex/rgb.
