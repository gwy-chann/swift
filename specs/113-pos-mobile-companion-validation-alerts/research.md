# Technical Research & Architecture Decisions: POS Mobile Companion Validation Alerts

**Feature**: [SIAA-113](https://the-three-devsketeers.atlassian.net/browse/SIAA-113)  
**Spec Directory**: `specs/113-pos-mobile-companion-validation-alerts`  

---

## 1. Web Audio API Synthesis vs. Static Audio Files

### Context
Mobile browsers across cellular networks or unstable shop floor Wi-Fi connections can experience buffering or latency when loading static MP3/WAV assets. Additionally, asset loading introduces file-path dependencies and 404 risks.

### Decision
Implement pure synthetic sound generation using the browser's native `AudioContext` / `webkitAudioContext`:
- **Success Chime**:
  - Frequency: 1200Hz sine wave oscillator.
  - Duration: 160ms with an exponential gain decay curve (`gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16)`).
- **Sold Out / Rejection Buzzer**:
  - Frequency: 250Hz square or sawtooth wave.
  - Pattern: Two distinct 90ms pulses separated by a 40ms pause.
- **Uncataloged / Not Found Tone**:
  - Frequency sequence: Two short step-down tones (440Hz -> 330Hz, 80ms each).

### Browser Autoplay Policy & AudioContext Resume
Modern mobile browsers (especially Mobile Safari and Chrome for Android) require a user gesture (touch/click/key) before audio can play:
- Expose an `unlockAudioContext()` helper that initializes or resumes a singleton `AudioContext` on the first touch/click anywhere on the mobile viewport.
- Guard all audio methods with safe try/catch blocks and null checks so tests and SSR render cleanly.

---

## 2. Haptic Vibration Standard (`navigator.vibrate`)

### Context
Tactile feedback is vital in noisy automotive repair shops with air impact wrenches and compressors running.

### Decision
Use `navigator.vibrate` when supported:
- **Success**: 80ms single pulse (`navigator.vibrate(80)`).
- **Sold-Out / Rejection**: Double alert pulse (`navigator.vibrate([200, 100, 200])`).
- **Feature Detection**: Check `typeof navigator !== 'undefined' && 'vibrate' in navigator` to prevent crashes in non-supporting browsers (iOS Safari, desktop).

---

## 3. Viewfinder Perimeter Flash Animation (CSS & Tailwind v4)

### Context
Staff view the camera stream through a scanning viewfinder reticle. A whole-screen or perimeter flash alerts peripheral vision immediately without needing to look at small text.

### Implementation
- **Success State**: Border pulses with `--success` (`#059669` light / `#10b981` dark) with a 400ms CSS animation or transition.
- **Rejection State**: Border pulses with `--danger` (`#dc2626` light / `#ef4444` dark) with a shaking alert keyframe or rhythmic pulse.
- When idle/ready: Reticle remains a clean neutral hairline border (`--border-color` / subtle blue target corners).

---

## 4. Top-Anchored Floating Validation Card & Auto-Clearing

### Context
The validation card must present essential information (Product Name, SKU, Price in ₱, Remaining Stock) without permanently blocking the camera feed.

### Animation & Auto-Dismiss Lifespan
- **Auto-dismiss Timer**: 3,500ms (3.5 seconds) timeout using `setTimeout`.
- **Interruption Guarantee**: If another scan arrives before 3.5s, the timer is cleared immediately (`clearTimeout`) and replaced with the new payload.
- **Manual Dismissal**: Tapping anywhere on the validation card or on the backdrop instantly dismisses the card.
- **CSS Transitions**: Slide-in from `-translate-y-full opacity-0` to `translate-y-0 opacity-100` (duration 200ms ease-out), exit via fade-out and slide-up.

---

## 5. Mobile Cart Summary Dock

### Context
Staff want to know how many items are in the transaction and the current subtotal without having to walk back to the desk.

### Implementation
- Sticky dock at the bottom of the viewport (`fixed bottom-0 inset-x-0 z-30`).
- Displays: `"Cart: {count} {item/items} | Subtotal: ₱{formattedSubtotal}"`.
- Compact height (< 56px) so it doesn't crowd small mobile screens (e.g. iPhone SE / 375px width).
- Background: `bg-bg-surface/95 backdrop-blur-md border-t border-border`.
