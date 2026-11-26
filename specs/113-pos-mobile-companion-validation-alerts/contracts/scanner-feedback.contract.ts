/**
 * Multi-Tone Audio & Haptic Feedback Contracts & Constants (SIAA-113)
 */

export const SCANNER_FEEDBACK_CONSTANTS = {
  /** High pitch success frequency for cart addition chime (Hz) */
  SUCCESS_CHIME_FREQ_HZ: 1200,
  /** Low pitch buzzer frequency for sold out / rejection (Hz) */
  SOLD_OUT_BUZZER_FREQ_HZ: 250,
  /** High step tone for uncataloged item (Hz) */
  NOT_FOUND_FREQ_HIGH_HZ: 440,
  /** Low step tone for uncataloged item (Hz) */
  NOT_FOUND_FREQ_LOW_HZ: 330,

  /** Single crisp tactile pulse duration (ms) for success */
  SUCCESS_HAPTIC_DURATION_MS: 80,
  /** Double vibration pattern for rejection / sold out */
  SOLD_OUT_HAPTIC_PATTERN: [200, 100, 200] as const,

  /** Transient card auto-dismiss interval (ms) */
  DEFAULT_AUTO_DISMISS_MS: 3500,
  /** Camera viewfinder perimeter pulse animation duration (ms) */
  VIEWFINDER_PULSE_DURATION_MS: 400,
} as const;

export interface ScannerFeedbackOptions {
  enableAudio?: boolean;
  enableHaptics?: boolean;
}

export type FeedbackSoundType = "SUCCESS" | "SOLD_OUT" | "NOT_FOUND";
