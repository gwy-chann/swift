/**
 * Multi-Tone Audio & Haptic Feedback Engine for POS Mobile Companion (SIAA-113)
 *
 * Provides synthetic Web Audio API feedback tones and haptic vibration pulses
 * for barcode/SKU scanning validation without requiring external sound files.
 */

import {
  SCANNER_FEEDBACK_CONSTANTS,
  type ScannerFeedbackOptions,
} from "../../specs/113-pos-mobile-companion-validation-alerts/contracts/scanner-feedback.contract.ts";
import type { ScanValidationStatus } from "../../specs/113-pos-mobile-companion-validation-alerts/contracts/validation-card.contract.ts";

export { SCANNER_FEEDBACK_CONSTANTS };

let globalAudioContext: AudioContext | null = null;

/**
 * Returns or initializes a shared singleton AudioContext.
 * In SSR or non-browser environments, safely returns null.
 */
export function getAudioContext(): AudioContext | null {
  if (globalAudioContext) {
    return globalAudioContext;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (AudioContextClass) {
    try {
      globalAudioContext = new AudioContextClass();
    } catch {
      globalAudioContext = null;
    }
  }

  return globalAudioContext;
}

/**
 * Sets a custom AudioContext (primarily for unit testing and dependency injection).
 */
export function setAudioContextForTesting(ctx: AudioContext | null): void {
  globalAudioContext = ctx;
}

/**
 * Unlocks or resumes the AudioContext on user interaction (e.g., tap/touch).
 * Essential for mobile browsers (iOS Safari, Android Chrome) requiring user activation.
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Synthesizes a crisp 1000Hz sine-wave beep for 80ms via Web Audio API (SIAA-110).
 * Plays instantaneously upon optical barcode capture without external sound files.
 */
export function playScanCaptureBeep(
  customCtx?: AudioContext | null,
  frequencyHz: number = 1000,
  durationSec: number = 0.08
): boolean {
  const ctx = customCtx ?? getAudioContext();
  if (!ctx) return false;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequencyHz, ctx.currentTime);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSec);

    return true;
  } catch {
    return false;
  }
}

/**
 * Plays a high-pitch 1200Hz success chime for cart addition (160ms with smooth exponential decay).
 */
export function playSuccessChime(customCtx?: AudioContext | null): boolean {
  const ctx = customCtx ?? getAudioContext();
  if (!ctx) return false;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(
      SCANNER_FEEDBACK_CONSTANTS.SUCCESS_CHIME_FREQ_HZ,
      ctx.currentTime
    );

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);

    return true;
  } catch {
    return false;
  }
}

/**
 * Plays a low-frequency 250Hz double buzz for out-of-stock or rejected scans.
 */
export function playSoldOutBuzzer(customCtx?: AudioContext | null): boolean {
  const ctx = customCtx ?? getAudioContext();
  if (!ctx) return false;

  try {
    const now = ctx.currentTime;
    const freq = SCANNER_FEEDBACK_CONSTANTS.SOLD_OUT_BUZZER_FREQ_HZ;

    // Pulse 1 (0ms - 90ms)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "square";
    osc1.frequency.setValueAtTime(freq, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.setValueAtTime(0.0001, now + 0.09);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // Pulse 2 (130ms - 220ms)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(freq, now + 0.13);
    gain2.gain.setValueAtTime(0.3, now + 0.13);
    gain2.gain.setValueAtTime(0.0001, now + 0.22);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.13);
    osc2.stop(now + 0.22);

    return true;
  } catch {
    return false;
  }
}

/**
 * Plays a two-step descending tone (440Hz -> 330Hz) for uncataloged / not found scans.
 */
export function playNotFoundTone(customCtx?: AudioContext | null): boolean {
  const ctx = customCtx ?? getAudioContext();
  if (!ctx) return false;

  try {
    const now = ctx.currentTime;

    // Note 1: 440Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(SCANNER_FEEDBACK_CONSTANTS.NOT_FOUND_FREQ_HIGH_HZ, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Note 2: 330Hz
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(SCANNER_FEEDBACK_CONSTANTS.NOT_FOUND_FREQ_LOW_HZ, now + 0.09);
    gain2.gain.setValueAtTime(0.2, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.18);

    return true;
  } catch {
    return false;
  }
}

/**
 * Triggers a single crisp 80ms haptic confirmation pulse for success.
 */
export function triggerSuccessHaptic(customNavigator?: Navigator): boolean {
  const nav = customNavigator ?? (typeof navigator !== "undefined" ? navigator : undefined);
  if (!nav || typeof nav.vibrate !== "function") return false;

  try {
    return nav.vibrate(SCANNER_FEEDBACK_CONSTANTS.SUCCESS_HAPTIC_DURATION_MS);
  } catch {
    return false;
  }
}

/**
 * Triggers an emphatic double vibration pattern ([200, 100, 200]) for rejected / sold out scans.
 */
export function triggerRejectionHaptic(customNavigator?: Navigator): boolean {
  const nav = customNavigator ?? (typeof navigator !== "undefined" ? navigator : undefined);
  if (!nav || typeof nav.vibrate !== "function") return false;

  try {
    return nav.vibrate([...SCANNER_FEEDBACK_CONSTANTS.SOLD_OUT_HAPTIC_PATTERN]);
  } catch {
    return false;
  }
}

/**
 * Triggers a short alert vibration pattern ([100, 50, 100]) for uncataloged items.
 */
export function triggerNotFoundHaptic(customNavigator?: Navigator): boolean {
  const nav = customNavigator ?? (typeof navigator !== "undefined" ? navigator : undefined);
  if (!nav || typeof nav.vibrate !== "function") return false;

  try {
    return nav.vibrate([100, 50, 100]);
  } catch {
    return false;
  }
}

/**
 * High-level feedback dispatcher orchestrating sound and haptics based on validation status.
 */
export function dispatchScannerFeedback(
  status: ScanValidationStatus,
  options: ScannerFeedbackOptions = {}
): { audioPlayed: boolean; hapticTriggered: boolean } {
  const { enableAudio = true, enableHaptics = true } = options;
  let audioPlayed = false;
  let hapticTriggered = false;

  switch (status) {
    case "SUCCESS": {
      if (enableAudio) audioPlayed = playSuccessChime();
      if (enableHaptics) hapticTriggered = triggerSuccessHaptic();
      break;
    }
    case "OUT_OF_STOCK":
    case "EXCEEDS_STOCK": {
      if (enableAudio) audioPlayed = playSoldOutBuzzer();
      if (enableHaptics) hapticTriggered = triggerRejectionHaptic();
      break;
    }
    case "NOT_FOUND": {
      if (enableAudio) audioPlayed = playNotFoundTone();
      if (enableHaptics) hapticTriggered = triggerNotFoundHaptic();
      break;
    }
    default:
      break;
  }

  return { audioPlayed, hapticTriggered };
}
