# Tasks: Supabase Atomic MotoMatcher Matrix Search RPC & Fitment Verification Engine

**Feature**: `024-motomatcher-matrix-search-rpc`  
**Jira Issue**: [SIAA-54](https://the-three-devsketeers.atlassian.net/browse/SIAA-54) (STORY-4.7)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## Phase 1: Specifications & Contracts

- [x] **Task 1.1**: Define TypeScript interfaces and Zod validation schemas in `specs/024-motomatcher-matrix-search-rpc/contracts/motomatcher-matrix.contract.ts`.
- [x] **Task 1.2**: Implement `calculateUpsellDelta` helper in `contracts/motomatcher-matrix.contract.ts`.
- [x] **Task 1.3**: Validate requirements against `checklists/requirements.md`.

## Phase 2: Database Migration (PostgreSQL Stored Procedure)

- [x] **Task 2.1**: Create migration `supabase/migrations/20261016000000_moto_matcher_matrix_rpc.sql`.
- [x] **Task 2.2**: Implement `public.get_moto_matcher_matrix(p_model_id UUID, p_category TEXT, p_search TEXT)` with:
  - Sub-50ms indexed joins on `public.product_fitments` and `public.products`.
  - OEM parts array aggregation (`oem_parts`).
  - Aftermarket parts array aggregation (`aftermarket_parts`) including universal parts (`model = 'Universal'` / `fitment_type = 'universal'`).
  - Category and search keyword filtering.
  - Subsystem upsell price delta calculation (`upsell_delta_amount`, `upsell_delta_percent`, `upsell_badge`, `oem_reference_sku`).
- [x] **Task 2.3**: Grant execute permissions to `anon`, `authenticated`, and `service_role`.

## Phase 3: Domain Models & Server Action Bridge

- [x] **Task 3.1**: Create `lib/motomatcher/actions.ts` exporting `getFitmentMatrixAction(modelId, category, search)`.
- [x] **Task 3.2**: Implement Supabase RPC invocation with error handling.
- [x] **Task 3.3**: Implement TypeScript fallback matrix engine matching PostgreSQL RPC logic across `MOCK_PRODUCTS` and `MOCK_PRODUCT_FITMENTS` for offline and test environments.

## Phase 4: Automated Testing

- [x] **Task 4.1**: Implement comprehensive test suite in `lib/motomatcher/__tests__/matrix-actions.test.ts` covering:
  - Scenario 1: Partitioned OEM vs. Aftermarket Matrix Result
  - Scenario 2: Inclusion of Universal Parts with `is_universal: true`
  - Scenario 3: Category filtering (e.g. Brakes only) and Keyword search
  - Scenario 4: Upsell Price Delta Calculation math and badge formatting
  - Scenario 5: Missing or invalid motorcycle model ID graceful handling
  - Scenario 6: Runtime Zod contract validation

## Phase 5: Verification & Sync

- [x] **Task 5.1**: Run TypeScript verification (`npx tsc --noEmit`).
- [x] **Task 5.2**: Run full test suite (`npm test`).
- [x] **Task 5.3**: Check off all tasks in `tasks.md`.
