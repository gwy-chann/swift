# Quickstart & Verification Guide: Instant SKU / Barcode Price Checker & Margin Simulator

**Feature**: Instant SKU / Barcode Price Checker & Margin Simulator  
**Jira Issue**: [SIAA-31](https://the-three-devsketeers.atlassian.net/browse/SIAA-31) (STORY-5.4)  
**Route**: `/staff/pricecheck`  

---

## 1. Quick Local Execution

1. Start the Next.js development server inside the feature worktree:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to the Staff Price Checker view:
   `http://localhost:3000/staff/pricecheck`

---

## 2. Walkthrough Scenarios & Verification Steps

### Scenario A: Instant Barcode / SKU Lookup
1. In `#priceScanInput`, enter `YAM-NMAX-BL01` (or press Enter).
2. **Observe**:
   - The result card (`#priceScanResultBox`) renders immediately (<200ms).
   - Wholesale Price displays in warning gold (₱380.00).
   - Retail Price displays in success green (₱450.00).
   - Base Acquisition Cost displays (₱280.00).
   - Gross Markup % displays `60.7%` (`((450 - 280) / 280) * 100`).
   - Shelf locator coordinate displays `Rack A-01 / Shelf 2` with pin icon.
   - SC / PWD statutory price displays `₱360.00`.

### Scenario B: Drivetrain SKU Lookup
1. In `#priceScanInput`, enter `HON-CLK-CVTB`.
2. **Observe**:
   - Result card updates to OEM Drive Belt (Gates Bando).
   - Wholesale: ₱720.00, Retail: ₱850.00, Cost: ₱520.00.
   - Gross Markup: `63.5%`.
   - Shelf Location: `Rack B-04 / Shelf 1`.

### Scenario C: Interactive Margin Simulator
1. Under the matched product card, open or adjust the **Margin Simulator**.
2. Change the simulated retail price from `₱450.00` to `₱500.00`.
3. **Observe**:
   - Live Gross Markup recalculates immediately to `78.6%`.
   - Projected Gross Profit reflects `₱220.00`.
   - Margin status indicates `Profitable (44.0% margin)`.
4. Change simulated price to `₱250.00` (below cost of ₱280).
5. **Observe**:
   - Negative gross profit (-₱30.00) and alert badge `Below Cost / Negative Margin`.

### Scenario D: Unrecognized Code Empty State
1. In `#priceScanInput`, enter an unknown code such as `UNKNOWN-999`.
2. **Observe**:
   - Displays clear danger-styled alert: `"No item found for barcode / code: UNKNOWN-999"`.
   - View remains responsive and doesn't crash.

### Scenario E: Base Product Price Schedule Table
1. Scroll down below the scanner box.
2. **Observe**:
   - Reference table displaying top fast-moving products (`YAM-NMAX-BL01`, `RCB-NMAX-BP02`, `HON-CLK-CVTB`, etc.).
   - Displays SKU, description, wholesale price, retail price, markup %, and rack/shelf location.
   - Clicking a row in the table populates `#priceScanInput` and selects the product in the scanner.

---

## 3. Automated Test Commands

Run the dedicated test suite:
```bash
npm test -- test/staff/pricecheck.test.tsx
```
Verify type-checking:
```bash
npx tsc --noEmit
```
