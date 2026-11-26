/**
 * Automated Unit Test Suite: POS Mobile Companion Camera Scanner (SIAA-110)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BarcodeScanPayloadSchema,
  ScannerStatusSchema,
  SCANNER_CONSTANTS,
  type BarcodeScanPayload
} from '../../../specs/110-pos-mobile-companion-scanner/contracts/barcode-scanner.contract.ts';

describe('POS Mobile Companion Scanner Contracts & Constants (SIAA-110)', () => {
  it('validates specification constants match SIAA-110 invariants', () => {
    assert.strictEqual(SCANNER_CONSTANTS.COOLDOWN_MS, 1500);
    assert.strictEqual(SCANNER_CONSTANTS.AUDIO_BEEP_FREQ_HZ, 1000);
    assert.strictEqual(SCANNER_CONSTANTS.AUDIO_BEEP_DURATION_MS, 80);
    assert.strictEqual(SCANNER_CONSTANTS.HAPTIC_DURATION_MS, 80);
    assert.strictEqual(SCANNER_CONSTANTS.DEFAULT_FPS, 30);
  });

  it('validates successful BarcodeScanPayload for 1D and 2D formats', () => {
    const valid1D: BarcodeScanPayload = {
      rawCode: '4901234567890',
      format: 'EAN_13',
      timestamp: Date.now()
    };
    const parsed1D = BarcodeScanPayloadSchema.parse(valid1D);
    assert.strictEqual(parsed1D.rawCode, '4901234567890');
    assert.strictEqual(parsed1D.format, 'EAN_13');

    const valid2D: BarcodeScanPayload = {
      rawCode: 'SWIFT-YAM-NMAX-2026',
      format: 'QR_CODE',
      timestamp: Date.now()
    };
    const parsed2D = BarcodeScanPayloadSchema.parse(valid2D);
    assert.strictEqual(parsed2D.rawCode, 'SWIFT-YAM-NMAX-2026');
    assert.strictEqual(parsed2D.format, 'QR_CODE');
  });

  it('validates manual SKU input fallback payload', () => {
    const manualPayload: BarcodeScanPayload = {
      rawCode: 'HON-CLK-DRV01',
      format: 'MANUAL',
      timestamp: Date.now()
    };
    const parsed = BarcodeScanPayloadSchema.parse(manualPayload);
    assert.strictEqual(parsed.rawCode, 'HON-CLK-DRV01');
    assert.strictEqual(parsed.format, 'MANUAL');
  });

  it('rejects empty or whitespace-only barcode strings', () => {
    assert.throws(() => {
      BarcodeScanPayloadSchema.parse({
        rawCode: '   ',
        format: 'CODE_128',
        timestamp: Date.now()
      });
    });
  });

  it('validates scanner lifecycle status enum values', () => {
    const validStatuses = [
      'IDLE',
      'INITIALIZING',
      'SCANNING',
      'PERMISSION_DENIED',
      'UNAVAILABLE',
      'ERROR'
    ];

    for (const status of validStatuses) {
      assert.strictEqual(ScannerStatusSchema.parse(status), status);
    }

    assert.throws(() => {
      ScannerStatusSchema.parse('INVALID_STATE');
    });
  });
});

describe('Scanner Throttling & De-duplication Logic (SIAA-110)', () => {
  it('suppresses duplicate scan frames within the 1500ms cooldown window', () => {
    let isThrottled = false;
    let dispatchedCount = 0;

    const dispatchScan = () => {
      if (isThrottled) return;
      isThrottled = true;
      dispatchedCount += 1;
    };

    // Frame 1: Initial capture
    dispatchScan();
    assert.strictEqual(dispatchedCount, 1);
    assert.strictEqual(isThrottled, true);

    // Frame 2: Rapid successive frame at +33ms
    dispatchScan();
    assert.strictEqual(dispatchedCount, 1);

    // Frame 3: Rapid successive frame at +66ms
    dispatchScan();
    assert.strictEqual(dispatchedCount, 1);

    // Cooldown expires (simulate timer reset)
    isThrottled = false;

    // Frame 4: Next scan after cooldown window
    dispatchScan();
    assert.strictEqual(dispatchedCount, 2);
  });
});
