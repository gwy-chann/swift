# Quickstart & Verification Guide: POS Terminal QR Code Session Pairing & Broadcast

**Feature**: `111-pos-terminal-qr-session-pairing`  
**Jira Ticket**: [SIAA-111](https://the-three-devsketeers.atlassian.net/browse/SIAA-111)  

---

## 1. Quick Verification Steps

### Step 1: Open POS Terminal and Trigger Pairing Modal
1. Navigate to `/staff/pos`.
2. Ensure cashier is on active shift.
3. Locate the "📱 Pair Phone Scanner" action button in the top action bar.
4. Click the button:
   - A modal titled "Pair Mobile Companion Scanner" opens.
   - An SVG QR code appears in high-contrast crisp vector lines.
   - The pairing URL is displayed with a "Copy Link" button.
   - Status badge shows "Waiting for phone connection...".

### Step 2: Simulate or Perform Companion Connection
1. In another browser tab (or on a mobile device on the same network), navigate to:
   ```
   http://localhost:3000/staff/pos/scanner?session=pos-T1-[GENERATED_KEY]
   ```
   (or click "Copy Link" and open it).
2. Observe the desktop terminal modal:
   - Badge immediately transitions to green "Phone Connected".
   - Shows device name (e.g. "Mobile") and live ping latency (<50ms).
   - Cashier can close the modal while connection remains active in background.

### Step 3: Verify Focus-Agnostic Background Scan Ingestion
1. On the desktop terminal, click outside any input (blur focus or focus customer name input).
2. Emit a `BARCODE_SCANNED` event or trigger a scan from the companion phone for SKU `HON-BRK-01`.
3. Within <100ms:
   - Product `HON-BRK-01` is resolved and added to the active cart.
   - Cart subtotal and quantity update automatically.
   - Realtime validation telemetry is broadcast back to companion.

### Step 4: Verify Heartbeat Disconnection & Re-pair
1. Close the mobile companion tab.
2. Within 10 seconds of missing heartbeat (or immediately upon explicit disconnect), the desktop header updates badge to "Scanner Disconnected".
3. Click "Re-pair" to quickly regenerate or resume session without losing cart items.

---

## 2. Automated Test Execution

Run the dedicated test suite:
```bash
node --env-file=.env.local --experimental-strip-types --test lib/pos/__tests__/scanner-session.test.ts
node --env-file=.env.local --experimental-strip-types --test lib/pos/__tests__/pos-scanner-channel.test.ts
```
