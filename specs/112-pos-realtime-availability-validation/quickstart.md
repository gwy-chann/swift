# Quickstart & Verification Guide: POS Real-Time Availability Validation (SIAA-112)

**Feature**: `112-pos-realtime-availability-validation`  
**Jira Ticket**: [SIAA-112](https://the-three-devsketeers.atlassian.net/browse/SIAA-112)  

---

## 1. Running Unit Tests

Execute the targeted test suite to verify availability validation and sold-out rejection:

```bash
# In the worktree root:
npx tsx --test lib/pos/__tests__/barcode-scanner.test.ts
npx tsx --test lib/pos/__tests__/availability-validator.test.ts
```

---

## 2. Interactive Verification Walkthrough in Staff POS

1. **Launch the Development Server**:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/staff/pos`.
3. Ensure staff shift is active (clock in if needed).

### Scenario 1: In-Stock Product Scan
- In the "Scan Barcode / SKU" input, type `YAM-NMAX-BL01` (Stock: 12) and press `[ENTER]`.
- **Expected Outcome**:
  - Item is added to the active cart with Retail price (₱480.00).
  - Cart counter shows 1 item, Subtotal ₱480.00.
  - Telemetry payload dispatched with `status: 'SUCCESS'`, `stockRemaining: 11`.

### Scenario 2: Sold-Out Product Scan
- In the barcode input, type `HON-CLK-DRV01` (Stock: 0) and press `[ENTER]`.
- **Expected Outcome**:
  - Cart is NOT modified.
  - Error toast appears: `"Cannot add Honda Click Drive Belt 125i: Item is out of stock."`
  - Telemetry payload dispatched with `status: 'OUT_OF_STOCK'`, `availableStock: 0`.

### Scenario 3: Exceeds Available Stock Ceiling
- Find a product with low stock (e.g. stock = 2), or scan `MOT-3100-10W40` until cart quantity equals stock.
- Scan the same product one more time.
- **Expected Outcome**:
  - Cart rejects addition. Cart quantity remains at maximum stock.
  - Warning toast appears: `"Cannot add another Motul 3100 Silver 10W40 1L: Exceeds available stock (2 units max)"`.
  - Telemetry payload dispatched with `status: 'EXCEEDS_STOCK'`.

### Scenario 4: Non-Existent Barcode
- In the barcode input, type `999999999999` and press `[ENTER]`.
- **Expected Outcome**:
  - Error toast appears: `"Item code or barcode not found"`.
  - Telemetry payload dispatched with `status: 'NOT_FOUND'`.
