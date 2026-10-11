# Quickstart & Verification Guide: Supabase New Product Registration Server Action & SKU Uniqueness

**Feature**: `014-supabase-new-product-registration` (Jira: `SIAA-47`)
**Status**: Ready

## 1. Quick Verification Commands

From the workspace root or worktree (`.worktrees/SIAA-47`):

```bash
# 1. Typecheck the repository
npm run typecheck

# 2. Run unit and integration tests for product actions
npm test -- __tests__/lib/admin/product-actions.test.ts

# 3. Run all tests to ensure zero regressions
npm test
```

---

## 2. Walkthrough Scenarios

### Scenario A: Duplicate SKU Collision Guard
1. Attempt to register a product with SKU `YAM-NMAX-BL01` (already existing in catalog) or `yam-nmax-bl01`.
2. Observe `createProductAction` returning:
   ```json
   {
     "success": false,
     "error": "Product with SKU \"YAM-NMAX-BL01\" already exists in the catalog.",
     "code": "SKU_ALREADY_EXISTS"
   }
   ```
3. In the UI modal, observe the red alert informing the user that the SKU is already in use.

### Scenario B: Atomic Product Creation with Inbound Stock Log
1. Register a new part with unique SKU `HON-ADV160-BRK01` and initial stock of `15`.
2. Verify insertion into `public.products`.
3. Verify an automatic record inserted into `public.stock_adjustment_logs`:
   - `sku`: `HON-ADV160-BRK01`
   - `adjustment_type`: `restock`
   - `quantity_delta`: `15`
   - `previous_stock`: `0`
   - `new_stock`: `15`
   - `reason`: `Initial inventory registration`

### Scenario C: Registration with Zero Initial Stock
1. Register an upcoming part with initial stock `0`.
2. Verify product is created with `stock = 0`.
3. Verify no inbound stock adjustment log is generated.

### Scenario D: UI Prepend & Toast Confirmation
1. In `/admin/inventory`, click `+ Add Part`.
2. Complete valid form fields and submit.
3. Verify `NewProductModal` closes, a success toast notification appears, and the new part appears at the top of the inventory catalog list without a full page reload.
