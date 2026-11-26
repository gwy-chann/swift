# Quickstart & Verification Guide: POS Mobile Companion Scanner (SIAA-110)

## 1. Local Testing & Verification Scenarios

### Scenario A: Camera Initialization & Viewfinder
1. Start the Next.js local server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/staff/pos/scanner` on a mobile browser or desktop browser with a webcam.
3. Observe prompt requesting camera permissions.
4. Allow permission:
   - Rear camera stream mounts into full-screen viewport.
   - High-contrast viewfinder reticle with guide crosshairs appears centered.
   - Torch button appears in the top navigation bar (if supported by hardware).

### Scenario B: Barcode Scanning & Audio/Haptic Feedback
1. Present a 1D barcode (EAN-13, UPC-A, Code 128) or QR code to the viewfinder.
2. In <200ms:
   - A crisp 1000Hz synthesized audio beep sounds.
   - Device vibrates for 80ms (on supported mobile devices).
   - Viewfinder reticle pulses green.
   - Captured barcode payload is dispatched.
3. Keep the barcode in the viewfinder:
   - Observe that subsequent duplicate captures are suppressed for 1500ms by the cooldown throttle.

### Scenario C: Flashlight / Torch Toggle
1. On a mobile phone with a camera flash, tap the flashlight button in the top action header.
2. Confirm hardware LED illuminates without dropping or restarting the video stream.
3. Tap again to turn off.

### Scenario D: Manual SKU Input Fallback
1. Tap the "⌨️ Type SKU Manually" button at the bottom of the screen.
2. The bottom sheet slides up with focus in the SKU text input.
3. Enter `HON-BRK-01` and tap "Submit SKU" (or press Enter).
4. Observe audio beep and scan dispatch with format `MANUAL`.
5. Bottom sheet automatically closes.

### Scenario E: Denied Camera Permission Fallback
1. Block camera permissions in browser settings and reload `/staff/pos/scanner`.
2. Notice clear guidance instructing how to enable permissions.
3. Verify that the "Type SKU Manually" button remains accessible and functional.

---

## 2. Automated Unit Tests Execution

Run the automated test suite covering the contracts, feedback engine, and throttling logic:

```bash
npm test
```
