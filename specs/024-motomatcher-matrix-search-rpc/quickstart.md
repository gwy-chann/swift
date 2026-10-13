# Quickstart & Verification Guide: Supabase Atomic MotoMatcher Matrix Search RPC & Fitment Verification Engine

**Feature**: `024-motomatcher-matrix-search-rpc`  
**Jira Issue**: [SIAA-54](https://the-three-devsketeers.atlassian.net/browse/SIAA-54) (STORY-4.7)  

---

## 1. Applying the Database Migration

Run the migration against your local or remote PostgreSQL instance:

```bash
# Via Supabase CLI
npx supabase migration up

# Or directly via psql
psql -U postgres -d postgres -f supabase/migrations/20261016000000_moto_matcher_matrix_rpc.sql
```

---

## 2. SQL Verification Queries

### Scenario 1: Partitioned OEM vs. Aftermarket Matrix for Yamaha NMAX 155
Retrieve the UUID of Yamaha NMAX 155:
```sql
SELECT id FROM public.motorcycle_models WHERE make = 'Yamaha' AND model = 'NMAX 155';
-- Example: 'a0000000-0000-0000-0000-000000000001'
```

Execute the stored procedure:
```sql
SELECT public.get_moto_matcher_matrix(
    p_model_id => (SELECT id FROM public.motorcycle_models WHERE make = 'Yamaha' AND model = 'NMAX 155'),
    p_category => NULL,
    p_search => NULL
);
```
Expected output:
- `oem_parts`: Contains `YAM-NMAX-BL01` (Yamaha Genuine Front Brake Pad Set, ₱450.00).
- `aftermarket_parts`: Contains `RCB-NMAX-BP02` (RCB Racing Ceramic Brake Pads, ₱580.00) and `DEN-IU24-IR` (Denso Iridium Spark Plug), plus universal fluids.

### Scenario 2: Universal Parts Inclusion
Universal items (`MOT-3100-10W40`, `SHL-ADV-AX7`) appear under `aftermarket_parts` with `is_universal: true`.

### Scenario 3: Category Filtering (Brakes Only)
```sql
SELECT public.get_moto_matcher_matrix(
    p_model_id => (SELECT id FROM public.motorcycle_models WHERE make = 'Yamaha' AND model = 'NMAX 155'),
    p_category => 'Brakes',
    p_search => NULL
);
```
Expected output:
- Only brake pad SKUs (`YAM-NMAX-BL01`, `RCB-NMAX-BP02`) are returned.
- Drivetrain, fluids, and spark plugs are excluded server-side.

### Scenario 4: Upsell Price Delta Calculation
In the output for `RCB-NMAX-BP02`:
```json
{
  "sku": "RCB-NMAX-BP02",
  "retail_price": 580.00,
  "upsell_delta_amount": 130.00,
  "upsell_delta_percent": 28.9,
  "upsell_badge": "+₱130.00 (+28.9%)",
  "oem_reference_sku": "YAM-NMAX-BL01"
}
```

---

## 3. Running Automated Tests

Run the dedicated test suite validating the contract schemas, upsell math, and fallback behavior:

```bash
npm test -- lib/motomatcher/__tests__/matrix-actions.test.ts
```

All test assertions verify both live database RPC contracts and offline fallback engine.
