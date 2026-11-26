# Research & Architecture Decision Record (ADR): POS Mobile Companion Scanner (SIAA-110)

## 1. Technology Selection: Barcode Decoding Engine

### Context
Mobile camera barcode reading requires high frame rates, support for both 1D retail barcodes (EAN-13, UPC-A, Code 128, Code 39) and 2D QR codes, hardware torch control, and zero-flicker video feed initialization on both iOS Safari and Android Chrome.

### Options Considered
1. **`html5-qrcode`**:
   - *Pros*: Battle-tested, supports both WebRTC camera streaming and canvas decoding, built-in support for torch constraints (`applyVideoConstraints`), cross-platform support across iOS WebKit and Android Chrome, built-in formats enum.
   - *Cons*: Modest bundle size (~140KB minified).
2. **Native `BarcodeDetector` Web API**:
   - *Pros*: Zero bundle size, GPU accelerated, ultra-low latency (<15ms).
   - *Cons*: Limited browser support (unsupported in standard iOS Safari WebKit without experimental flags enabled).
3. **`@zxing/library`**:
   - *Pros*: Highly capable, pure TypeScript.
   - *Cons*: Larger bundle (~400KB), manual camera lifecycle management required.

### Decision
Use `html5-qrcode` as the primary engine for cross-browser reliability, with graceful degradation. When mounting in Next.js App Router, ensure dynamic client-side loading (`"use client"` with SSR check or dynamic import) so `window` and `navigator` are accessed exclusively on the client.

---

## 2. Audio & Haptic Feedback Engine

### Context
Floor staff scanning parts need instantaneous sensory confirmation that a barcode was captured, even when not looking directly at the smartphone screen.

### Design
- **Web Audio API**: Rather than downloading `.mp3` or `.wav` files (which adds HTTP round-trips and fails in offline or poor Wi-Fi conditions), audio is synthesized dynamically using `AudioContext`, `OscillatorNode`, and `GainNode`.
  - Frequency: 1000Hz pure sine wave.
  - Duration: 80ms with exponential ramp down to prevent audio clicking.
  - User Activation: Audio context is warmed/resumed on user tap or component mount via `unlockAudioContext()`.
- **Haptic Vibration**: `navigator.vibrate([80])` generates a single 80ms tactile pulse on supported devices (Android). iOS Safari gracefully ignores `navigator.vibrate` without errors.

---

## 3. Cooldown Throttling & De-duplication

### Context
Camera scanning runs at 30+ frames per second. Without throttling, a barcode remaining in the viewfinder for 500ms would fire 15 duplicate scan events.

### Mechanism
- An atomic ref `isThrottledRef` and timestamp tracking (`lastScannedCodeRef`, `lastScannedAtRef`) enforce a strict 1500ms cooldown window.
- When a valid barcode is decoded:
  1. `isThrottledRef.current` is set to `true`.
  2. Synthesized audio chime and haptic feedback trigger immediately.
  3. `onScan(payload)` dispatches the event.
  4. Viewfinder border pulses to provide immediate visual confirmation.
  5. A 1500ms `setTimeout` unlocks the throttle for the next scan.

---

## 4. Hardware Torch Control

### Context
Motorcycle parts are often stored in deep, dimly lit shelves or mechanic under-bay compartments.

### Mechanism
- Modern mobile browsers expose torch control through `MediaStreamTrack.applyConstraints({ advanced: [{ torch: boolean }] })`.
- `html5-qrcode` provides `html5QrcodeScanner.applyVideoConstraints({ advanced: [{ torch: enabled }] })`.
- The scanner component queries track capabilities (`track.getCapabilities()?.torch`) or catches unsupported errors gracefully, updating UI torch toggle state.

---

## 5. Manual Input Bottom Sheet Fallback

### Context
Labels in grease-heavy motorcycle shops can be torn, faded, or covered with oil stains, preventing optical camera recognition.

### Mechanism
- An accessible slide-up bottom sheet with an autofocus input field.
- Accepts raw SKU or barcode numbers.
- Pressing "Enter" or clicking "Submit SKU" dispatches into the identical `onScan` pipeline with format `'MANUAL'`.
