# Quickstart & Verification Guide: Stock Adjustment Modal

- **Feature**: `SIAA-15`

## 1. Unit Testing
```bash
npm test
```

## 2. Interactive Testing in Browser
1. Navigate to `/admin/inventory`.
2. Locate any product in the parts catalog table (e.g., `YAM-NMAX-BL01`, currently 2 units).
3. Click the **Adjust** button on the right column.
4. Verify the modal opens displaying:
   - SKU: `YAM-NMAX-BL01`
   - Name: `OEM Front Brake Pads`
   - Current Stock: `2 Units`
5. Test Inbound Restock:
   - Select `Restock Inbound`
   - Enter quantity `10`
   - Optional reason: `"PO-4091 Supplier Delivery Received"`
   - Click **Confirm Adjustment**
   - Verify table stock updates immediately to `12 Units`.
6. Test Damaged Goods write-off:
   - Open adjust modal on a product with stock `12`
   - Select `Damaged Goods`
   - Enter quantity `2`
   - Click **Confirm Adjustment**
   - Verify table stock drops immediately to `10 Units`.
