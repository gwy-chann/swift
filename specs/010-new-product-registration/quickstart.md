# Quickstart & Verification Guide: New Product Registration with Automated Markup & Location Assignment

**Feature**: `SIAA-16` (STORY-2.4: New Product Registration with Automated Markup & Location Assignment)  
**Parent Epic**: `SIAA-2` (EPIC-2: Inventory & Warehouse Rack/Shelf Management)  
**Branch**: `feat/SIAA-16-new-product-registration`

---

## 1. Automated Verification Suite

Run automated unit tests and TypeScript compiler verification:

```bash
# 1. Typecheck the entire application
npx tsc --noEmit

# 2. Run domain unit test suite
npm test
```

### Expected Output:
- TypeScript verification passes with 0 errors.
- Domain unit test suite passes:
  - Wholesale and retail markup calculations (OEM +35%, Aftermarket +40%, Wholesale +18%).
  - Case-insensitive duplicate SKU collision prevention (`YAM-NMAX-BL01` vs `yam-nmax-bl01`).
  - Required field validations (SKU, Name, Brand, Location, Cost).
  - Normalization of SKU strings (trim and uppercase).

---

## 2. Interactive End-to-End Verification in Browser

### Prerequisites
- Dev server running: `npm run dev`
- Browser navigated to: `http://localhost:3000/admin/inventory`

---

### Scenario A: Opening "+ Add Part" Modal (User Story 1)
1. On `/admin/inventory`, click the **"+ Add Part"** button.
2. **Verify**:
   - The `<ProductRegistrationModal>` opens centered with a backdrop blur overlay (`bg-black/50 backdrop-blur-xs`).
   - Modal title displays "Add New Inventory Product".
   - Default initial stock is set to `10`, low stock alert level is set to `5`.
   - Pressing the `Escape` key or clicking "Cancel" closes the modal without changes.

---

### Scenario B: Dynamic Real-time Markup Auto-Calculation (User Story 2)
1. Open the modal.
2. Select Part Specification: **"Performance / Aftermarket"**.
3. Type Unit Cost: `500.00`.
4. **Verify**:
   - Wholesale Price auto-calculates to `590.00` (+18%).
   - Retail Price auto-calculates to `700.00` (+40%).
5. Change Part Specification to **"OEM Standard Replacement"**.
6. **Verify**:
   - Retail Price auto-updates to `675.00` (+35%).
7. Type custom manual retail price `680.00` (manual override).
8. **Verify**:
   - The manual value `680.00` is preserved.

---

### Scenario C: Case-Insensitive SKU Collision Guard (User Story 3)
1. Open the modal.
2. Enter an existing SKU in lowercase: `yam-nmax-bl01`.
3. Fill remaining required fields and click "Save & Register Product".
4. **Verify**:
   - Form blocks submission.
   - An inline error alert indicates that SKU `YAM-NMAX-BL01` already exists in inventory.

---

### Scenario D: Immediate Catalog & Dual Audit Logging (User Story 4 & 5)
1. Fill all fields with valid new product details:
   - SKU: `RCB-AER-BP01`
   - Name: `RCB Ceramic Brake Pads Front`
   - Category: `Brakes`
   - Brand: `Racing Boy`
   - Model: `Yamaha Aerox 155`
   - Shelf Location: `Rack A-02 / Shelf 1`
   - Part Specification: `Performance / Aftermarket`
   - Initial Stock: `10`
   - Low Stock Alert: `5`
   - Unit Cost: `300.00`
2. Click **"Save & Register Product"**.
3. **Verify**:
   - Modal closes cleanly.
   - The new product `RCB-AER-BP01` appears at the very top of the inventory catalog table.
   - Initial stock is displayed as `10 Units` with location badge `Rack A-02 / Shelf 1`.
   - In state / logs, an initial inbound stock adjustment record is logged: `type: "Restock Inbound"`, `change: "+10 Units"`, `reason: "New product master registration"`.
   - A system audit log entry is recorded for product creation.
