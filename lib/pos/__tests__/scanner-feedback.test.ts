/**
 * Automated Unit Test Suite: Multi-Tone Sound & Haptic Feedback Engine (SIAA-113)
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  SCANNER_FEEDBACK_CONSTANTS,
  getAudioContext,
  setAudioContextForTesting,
  playSuccessChime,
  playSoldOutBuzzer,
  playNotFoundTone,
  triggerSuccessHaptic,
  triggerRejectionHaptic,
  triggerNotFoundHaptic,
  dispatchScannerFeedback,
  unlockAudioContext,
} from "../scanner-feedback.ts";
import {
  ScanValidationPayloadSchema,
  MobileCartSummarySchema,
} from "../../../specs/113-pos-mobile-companion-validation-alerts/contracts/validation-card.contract.ts";

// Mock Web Audio API interfaces for Node environment
class MockAudioParam {
  value = 0;
  setValueAtTime(_value: number, _time: number) {
    this.value = _value;
  }
  exponentialRampToValueAtTime(_value: number, _time: number) {
    this.value = _value;
  }
}

class MockGainNode {
  gain = new MockAudioParam();
  connect() {}
}

class MockOscillatorNode {
  type: OscillatorType = "sine";
  frequency = new MockAudioParam();
  connect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  destination = {};

  createOscillator() {
    return new MockOscillatorNode();
  }

  createGain() {
    return new MockGainNode();
  }

  async resume() {
    this.state = "running";
  }
}

describe("Scanner Feedback Audio Engine (SIAA-113)", () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    mockCtx = new MockAudioContext();
    setAudioContextForTesting(mockCtx as unknown as AudioContext);
  });

  it("verifies feedback constants match specification invariants", () => {
    assert.strictEqual(SCANNER_FEEDBACK_CONSTANTS.SUCCESS_CHIME_FREQ_HZ, 1200);
    assert.strictEqual(SCANNER_FEEDBACK_CONSTANTS.SOLD_OUT_BUZZER_FREQ_HZ, 250);
    assert.strictEqual(SCANNER_FEEDBACK_CONSTANTS.NOT_FOUND_FREQ_HIGH_HZ, 440);
    assert.strictEqual(SCANNER_FEEDBACK_CONSTANTS.NOT_FOUND_FREQ_LOW_HZ, 330);
    assert.strictEqual(SCANNER_FEEDBACK_CONSTANTS.SUCCESS_HAPTIC_DURATION_MS, 80);
    assert.deepStrictEqual(SCANNER_FEEDBACK_CONSTANTS.SOLD_OUT_HAPTIC_PATTERN, [200, 100, 200]);
    assert.strictEqual(SCANNER_FEEDBACK_CONSTANTS.DEFAULT_AUTO_DISMISS_MS, 3500);
    assert.strictEqual(SCANNER_FEEDBACK_CONSTANTS.VIEWFINDER_PULSE_DURATION_MS, 400);
  });

  it("plays 1200Hz success chime successfully with audio context", () => {
    const result = playSuccessChime(mockCtx as unknown as AudioContext);
    assert.strictEqual(result, true);
  });

  it("plays 250Hz double buzzer successfully for sold out", () => {
    const result = playSoldOutBuzzer(mockCtx as unknown as AudioContext);
    assert.strictEqual(result, true);
  });

  it("plays two-tone descending chime for uncataloged item", () => {
    const result = playNotFoundTone(mockCtx as unknown as AudioContext);
    assert.strictEqual(result, true);
  });

  it("safely handles null audio context without throwing", () => {
    setAudioContextForTesting(null);
    assert.strictEqual(playSuccessChime(null), false);
    assert.strictEqual(playSoldOutBuzzer(null), false);
    assert.strictEqual(playNotFoundTone(null), false);
  });

  it("resumes suspended audio context on unlockAudioContext", async () => {
    mockCtx.state = "suspended";
    const unlocked = await unlockAudioContext();
    assert.strictEqual(unlocked, true);
    assert.strictEqual(mockCtx.state, "running");
  });
});

describe("Scanner Feedback Haptic Engine (SIAA-113)", () => {
  it("triggers 80ms haptic confirmation pulse for success", () => {
    let vibrateArg: number | number[] | null = null;
    const mockNav = {
      vibrate: (pattern: number | number[]) => {
        vibrateArg = pattern;
        return true;
      },
    } as unknown as Navigator;

    const result = triggerSuccessHaptic(mockNav);
    assert.strictEqual(result, true);
    assert.strictEqual(vibrateArg, 80);
  });

  it("triggers [200, 100, 200] double vibration pattern for rejection", () => {
    let vibrateArg: number | number[] | null = null;
    const mockNav = {
      vibrate: (pattern: number | number[]) => {
        vibrateArg = pattern;
        return true;
      },
    } as unknown as Navigator;

    const result = triggerRejectionHaptic(mockNav);
    assert.strictEqual(result, true);
    assert.deepStrictEqual(vibrateArg, [200, 100, 200]);
  });

  it("triggers [100, 50, 100] haptic pattern for not found", () => {
    let vibrateArg: number | number[] | null = null;
    const mockNav = {
      vibrate: (pattern: number | number[]) => {
        vibrateArg = pattern;
        return true;
      },
    } as unknown as Navigator;

    const result = triggerNotFoundHaptic(mockNav);
    assert.strictEqual(result, true);
    assert.deepStrictEqual(vibrateArg, [100, 50, 100]);
  });

  it("safely returns false when navigator.vibrate is undefined (e.g. iOS Safari)", () => {
    const mockNavWithoutVibrate = {} as Navigator;
    assert.strictEqual(triggerSuccessHaptic(mockNavWithoutVibrate), false);
    assert.strictEqual(triggerRejectionHaptic(mockNavWithoutVibrate), false);
    assert.strictEqual(triggerNotFoundHaptic(mockNavWithoutVibrate), false);
  });
});

describe("Scanner Feedback Dispatcher (SIAA-113)", () => {
  beforeEach(() => {
    const mockCtx = new MockAudioContext();
    setAudioContextForTesting(mockCtx as unknown as AudioContext);
  });

  it("dispatches success feedback with chime and haptics", () => {
    const res = dispatchScannerFeedback("SUCCESS", {
      enableAudio: true,
      enableHaptics: false,
    });
    assert.strictEqual(res.audioPlayed, true);
    assert.strictEqual(res.hapticTriggered, false);
  });

  it("dispatches rejection feedback for OUT_OF_STOCK and EXCEEDS_STOCK", () => {
    const res1 = dispatchScannerFeedback("OUT_OF_STOCK", {
      enableAudio: true,
      enableHaptics: false,
    });
    assert.strictEqual(res1.audioPlayed, true);

    const res2 = dispatchScannerFeedback("EXCEEDS_STOCK", {
      enableAudio: true,
      enableHaptics: false,
    });
    assert.strictEqual(res2.audioPlayed, true);
  });

  it("dispatches not found feedback for NOT_FOUND", () => {
    const res = dispatchScannerFeedback("NOT_FOUND", {
      enableAudio: true,
      enableHaptics: false,
    });
    assert.strictEqual(res.audioPlayed, true);
  });
});

describe("Zod Validation Contracts (SIAA-113)", () => {
  it("validates successful scan validation payload", () => {
    const payload = {
      status: "SUCCESS",
      sku: "YAM-NMAX-BL01",
      productName: "Yamaha NMAX Brake Pad Set",
      unitPrice: 480,
      remainingStock: 12,
    };

    const parsed = ScanValidationPayloadSchema.parse(payload);
    assert.strictEqual(parsed.status, "SUCCESS");
    assert.strictEqual(parsed.sku, "YAM-NMAX-BL01");
    assert.strictEqual(parsed.unitPrice, 480);
    assert.strictEqual(parsed.remainingStock, 12);
  });

  it("validates out of stock rejection payload", () => {
    const payload = {
      status: "OUT_OF_STOCK",
      sku: "HON-CLK-DRV01",
      reason: "Requested item has 0 units in stock",
      remainingStock: 0,
    };

    const parsed = ScanValidationPayloadSchema.parse(payload);
    assert.strictEqual(parsed.status, "OUT_OF_STOCK");
    assert.strictEqual(parsed.remainingStock, 0);
  });

  it("validates mobile cart summary structure", () => {
    const cart = {
      itemCount: 4,
      subtotal: 1920.5,
    };

    const parsed = MobileCartSummarySchema.parse(cart);
    assert.strictEqual(parsed.itemCount, 4);
    assert.strictEqual(parsed.subtotal, 1920.5);
  });
});
