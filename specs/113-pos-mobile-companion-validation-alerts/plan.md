# Technical Implementation Plan: POS Mobile Companion Validation Alerts & Screen Feedback

**Feature**: `113-pos-mobile-companion-validation-alerts`  
**Jira Ticket**: [SIAA-113](https://the-three-devsketeers.atlassian.net/browse/SIAA-113) (STORY-109.4)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109)  

---

## 1. Architectural Strategy

The mobile companion validation alerts subsystem provides immediate, bidirectional visual, acoustic, and tactile feedback to staff scanning parts in the shop floor or warehouse.

### Core Architectural Layers:
1. **Feedback Engine (`lib/pos/scanner-feedback.ts`)**:
   - Zero-dependency native Web Audio API tone synthesis.
   - Frequency generator: `playSuccessChime()` (1200Hz sine decay), `playSoldOutBuzzer()` (250Hz dual pulse), `playNotFoundTone()` (440Hz -> 330Hz step).
   - Safe haptic vibration dispatcher: `triggerSuccessHaptic()` (80ms), `triggerRejectionHaptic()` ([200, 100, 200]).
   - AudioContext unlocking helper for mobile browser gesture compliance.
   - 100% testable via node test runner with Web Audio API mock interfaces.

2. **Validation Card Component (`components/pos/scanner/scan-validation-card.tsx`)**:
   - Top-anchored floating container with smooth slide-down and fade-out animations.
   - Dual-mode presentation:
     - **Success Card**: Green accent border (`border-success/40`), product name, SKU, formatted price (`₱X,XXX.XX`), remaining stock pill (`"X units remaining"`).
     - **Rejection Banner**: High-contrast alert banner (`bg-danger text-white` or `border-danger bg-danger-light text-danger`), `"SOLD OUT / UNAVAILABLE — NOT ADDED TO CART"`, exact SKU, and failure reason.
   - Auto-dismiss lifecycle: 3.5s timeout automatically managed via `useEffect`, auto-cleared on new scans or tap dismiss.
   - Accessible ARIA live announcements (`aria-live="polite"` vs `aria-live="assertive"`).

3. **Viewfinder Overlay Component (`components/pos/scanner/scanner-viewfinder-overlay.tsx`)**:
   - Camera reticle frame with corner bracket indicators.
   - Dynamic perimeter border flashing:
     - Emerald green border flash for 400ms on success (`border-success shadow-[0_0_24px_rgba(16,185,129,0.4)]`).
     - Crimson red border flash with subtle shake for 400ms on rejection (`border-danger shadow-[0_0_24px_rgba(239,68,68,0.5)]`).
     - Auto-resets to idle after duration.

4. **Cart Summary Dock (`components/pos/scanner/mobile-cart-summary-dock.tsx`)**:
   - Compact fixed bottom dock (`fixed bottom-0 inset-x-0 z-30`).
   - Renders live item counter and subtotal (`"Cart: 3 items | Subtotal: ₱1,250.00"`).
   - Consumes semantic tokens (`bg-bg-surface/95 border-border text-text-primary`).

---

## 2. Component Hierarchy & Boundary Mapping

```
Mobile Companion View
  ├── ScannerViewfinderOverlay (pulseState: idle | success | danger)
  │     ├── Camera Video Stream / Mock Feed
  │     └── Scanning Reticle Frame
  │
  ├── ScanValidationCard (top-fixed, floating, auto-dismiss 3.5s)
  │     ├── Success Card (Product Name, SKU, ₱ Price, Remaining Stock)
  │     └── Rejection Banner (SOLD OUT, SKU, Reason)
  │
  └── MobileCartSummaryDock (bottom-fixed, live cart stats)
```

---

## 3. Design System & Token Compliance

| Element | SWIFT Token Utility | Fallback / Reference |
| :--- | :--- | :--- |
| Success Perimeter Glow | `border-success shadow-success/40` | Emerald `#10b981` |
| Danger Perimeter Glow | `border-danger shadow-danger/40` | Crimson `#ef4444` |
| Success Card Surface | `bg-bg-card border-success/30 text-text-primary` | Clean card slate |
| Danger Alert Surface | `bg-danger-light border-danger text-danger` | High contrast coral |
| Cart Dock Surface | `bg-bg-surface/95 border-border text-text-primary` | Pure surface slate |
| Stock Pill Badge | `bg-success-light text-success border-success/30` | Calm forest green |

Zero hardcoded hex values are permitted in JSX. All styles strictly inherit from `app/globals.css` and `lib/tokens.ts`.

---

## 4. Test Strategy

1. **`lib/pos/__tests__/scanner-feedback.test.ts`**:
   - Audio tone parameters verification (1200Hz, 250Hz, 440Hz/330Hz).
   - Haptic vibration patterns verification (80ms vs `[200, 100, 200]`).
   - Browser environment safety tests (execution when `window`, `AudioContext`, or `navigator.vibrate` are undefined).
   - Auto-dismiss timing contract tests.
   - Validation schema parsing tests with Zod.
