# Quickstart & Verification Guide: Admin Product Edit

**Feature**: `specs/108-admin-product-edit`  
**Jira Key**: [SIAA-108](https://the-three-devsketeers.atlassian.net/browse/SIAA-108)  
**Date**: 2026-10-27  

---

## 1. Quick Verification Scenario Walkthrough

### Scenario A: Open Edit Modal on Product Row
1. Navigate to `http://localhost:3000/admin/inventory`.
2. Locate any product (e.g. `BP-YAM-001` - "Yamaha Front Brake Pad").
3. Verify the action cell displays both `Edit` and `Adjust` buttons.
4. Click the `Edit` button with pencil icon.
5. **Expected Outcome**:
   - "Edit Product Details: BP-YAM-001" modal opens smoothly.
   - Part name, category, brand, motorcycle model, cost, retail price, location, and OEM status are pre-filled.
   - SKU field is disabled/read-only with lock indicator.
   - Current stock level is displayed as informational badge only.
   - Wholesale price and minimum stock alert threshold are excluded from manual editing.

### Scenario B: Modify Product Details & Save
1. In the open Edit modal:
   - Change Retail Price to `₱480.00`.
   - Update Shelf Locator to `RACK-C-02`.
   - Update Motorcycle Model to `Yamaha NMAX 155 / Aerox 155`.
2. Click `Save Changes`.
3. **Expected Outcome**:
   - Button shows loading state (`Saving...`).
   - Modal closes automatically upon success.
   - Toast notification appears: `Product "Yamaha Front Brake Pad" (BP-YAM-001) updated successfully!`.
   - Table row immediately displays new retail price `₱480.00` and shelf location `RACK-C-02`.

### Scenario C: Form Validation Handling
1. Open the Edit modal for any product.
2. Clear the "Part Name" input completely.
3. Change "Unit Cost" to `-10` and "Retail Price" to `0`.
4. Click `Save Changes`.
5. **Expected Outcome**:
   - Submission is halted without closing modal or calling server.
   - Inline error messages appear:
     - "Product name is required."
     - "Unit cost must be greater than ₱0.00."
     - "Retail price must be greater than ₱0.00."

### Scenario D: RBAC Access Control
1. Access `/admin/inventory` as a non-admin role (e.g. mechanic or cashier).
2. **Expected Outcome**:
   - Edit button is hidden or disabled.
   - Direct execution of `updateProductAction` with non-admin context returns `{ success: false, code: 'UNAUTHORIZED' }`.

---

## 2. Automated Test Commands

Run the test suite in the worktree:
```bash
node --env-file=.env.local --experimental-strip-types --test --test-concurrency=1 "lib/**/__tests__/*.test.ts"
```

Typecheck verification:
```bash
npx tsc --noEmit
```
