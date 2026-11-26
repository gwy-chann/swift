# Feature Specification: POS Mobile Companion: Web Camera Barcode Scanner View & Audio/Haptic Feedback Engine

**Feature Branch**: `feat/SIAA-110-pos-mobile-companion-scanner`  
**Created**: 2026-11-26  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-110](https://the-three-devsketeers.atlassian.net/browse/SIAA-110) (STORY-109.1)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109) (EPIC: Mobile Web Companion Barcode & SKU Scanner for POS Fast-Lane Checkout)  
**Target View**: Mobile Companion Scanner (`/staff/pos/scanner`)  

---

## 1. Executive Summary & Objective

In busy retail motorcycle parts and service workshops, floor staff and mechanics need to quickly identify and scan parts located in bulk storage bins, high racks, and service bays without being tethered to a fixed desktop POS terminal or carrying expensive, fragile wireless laser barcode guns. 

This feature delivers the **POS Mobile Companion Scanner**: a responsive, zero-install mobile web application (`/staff/pos/scanner`) that turns any iOS Safari or Android Chrome smartphone into an enterprise-grade barcode reader. It features:
1. Instant rear camera stream initialization (`facingMode: 'environment'`) with continuous autofocus and a high-contrast target reticle.
2. Low-latency (<200ms) multi-format barcode decoding (EAN-13, UPC-A, Code 128, Code 39, and QR code) paired with an atomic 1.5-second (1500ms) cooldown throttle to prevent accidental duplicate scans.
3. Zero-asset audio synthesis (1000Hz sine wave, 80ms duration via Web Audio API) and haptic vibration (`navigator.vibrate([80])`) for tactile scan feedback.
4. Hardware flashlight (torch) control for dimly lit warehouse aisles.
5. Manual SKU entry bottom sheet fallback for damaged, faded, or smudged barcode labels.
6. Realtime dispatch integration streaming scans via Supabase Realtime (`pos-channel:{sessionKey}`) when paired with a desktop POS terminal.

---

## 2. Clarifications & Architecture Invariants

### Clarifications Session
- **Q1: Which barcode symbologies must the camera reader support?**  
  *Decision*: EAN-13, UPC-A, Code 128, Code 39, and standard QR codes. These cover 100% of motorcycle OEM/aftermarket replacement parts and internal inventory labels.
- **Q2: How does the scan cooldown throttle behave across identical vs. rapid consecutive scans?**  
  *Decision*: A 1500ms atomic cooldown timer locks decoding after any successful capture. While throttled, subsequent video frames are ignored. The cooldown resets automatically after 1500ms or immediately if dismissed.
- **Q3: What happens on devices without flashlight/torch support or where camera permission is blocked?**  
  *Decision*: 
  - If torch is unsupported (e.g. front camera or devices without controllable flash), the torch toggle icon is cleanly hidden or disabled with a tooltip.
  - If camera permissions are denied or no camera device is detected, a user-friendly fallback state renders guidance on how to enable camera access in browser settings, alongside an immediate "Type SKU Manually" action.
- **Q4: How does audio feedback initialize reliably on mobile browsers with strict autoplay policies?**  
  *Decision*: An `unlockAudioContext()` helper warms the Web Audio `AudioContext` on the first user interaction (touch or click anywhere on the page/scanner), ensuring the 1000Hz synthesized chime fires without autoplay blocking.
- **Q5: How does the mobile scanner connect to the desktop POS terminal?**  
  *Decision*: The URL accepts an optional `?session={sessionKey}` query parameter. When present, scans broadcast `{ event: 'BARCODE_SCANNED', payload: { code, format, timestamp } }` over `pos-channel:${sessionKey}` via Supabase Realtime. When absent, the scanner operates in standalone inspection mode.

---

## 3. User Stories & Acceptance Criteria (Mike Cohn & Gherkin Format)

### User Story (Jira SIAA-110)

* **As a** shop floor staff member or inventory clerk,
* **I want to** open a dedicated, responsive mobile scanner web view (`/staff/pos/scanner`) that turns my smartphone camera into a high-performance barcode reader with audio chimes, haptic feedback, and hardware torch control,
* **so that** I can scan barcodes and SKUs on physical merchandise anywhere in the workshop or counter without buying or carrying an external gun scanner.

---

### Scenario 1: Camera permission and rear lens initialization (Priority: P1)

* **Given** a staff member opens `/staff/pos/scanner` on a modern mobile browser (iOS Safari or Android Chrome)
* **When** the scanner requests camera permission via `navigator.mediaDevices.getUserMedia`
* **Then** if granted, the stream binds to a full-screen viewport selecting the primary rear-facing camera (`facingMode: 'environment'`) with continuous autofocus and a high-contrast target reticle overlay
* **And Then** if permission is denied or no camera device exists, a clear fallback error screen renders with instructions to enable camera permissions in browser settings and a prominent "Type SKU Manually" fallback button.

---

### Scenario 2: Multi-format barcode decoding with 1.5s cooldown throttling (Priority: P1)

* **Given** the camera viewfinder is active and scanning at 30+ frames per second
* **When** a valid 1D barcode (EAN-13, UPC-A, Code 128, Code 39) or SKU QR code enters the target reticle
* **Then** the engine decodes the barcode string in under 200ms and fires the `onScan` callback with payload `{ rawCode: string, format: string, timestamp: number }`
* **And Then** an atomic 1.5-second (1500ms) cooldown throttle suppresses subsequent frames of the same or consecutive barcodes to prevent accidental duplicate additions.

---

### Scenario 3: Zero-asset synthesized audio and haptic feedback on scan (Priority: P1)

* **Given** a barcode is successfully captured and passes the throttle gate
* **When** the scan capture event fires
* **Then** the browser synthesizes a crisp 1000Hz sine-wave beep for 80ms via Web Audio API (`AudioContext`) without requiring external audio files
* **And Then** triggers an 80ms haptic vibration pulse via `navigator.vibrate([80])` on supported mobile devices.

---

### Scenario 4: Hardware flashlight / torch toggle for dim storage shelves (Priority: P2)

* **Given** the mobile camera stream is running and the device supports torch capability in `MediaTrackConstraints`
* **When** the staff member taps the torch toggle button in the scanner header
* **Then** the camera's physical LED flashlight toggles on/off without interrupting or dropping the video feed.

---

### Scenario 5: Manual SKU input fallback for damaged or smudged labels (Priority: P1)

* **Given** a physical barcode on a box or part is torn, faded, or unreadable by the camera
* **When** the staff member taps the "Type SKU Manually" action button
* **Then** a quick-input bottom sheet slides up allowing manual alphanumeric entry with an "Enter" submit button that routes into the identical scan dispatch pipeline.

---

## 4. UI Requirements & SWIFT Design Token Compliance

1. **Mobile Scanner Viewport (`/staff/pos/scanner`)**:
   - Immersive full-screen mobile layout (`h-[100dvh] w-full flex flex-col bg-surface overflow-hidden`).
   - Sticky top header: Terminal session status badge (`bg-surface-elevated text-text-primary border-border`), torch toggle button (`bg-surface/80 backdrop-blur text-text-primary hover:bg-surface border-border`), and close/back navigation.
   - Central camera viewfinder with high-contrast corner brackets, center guide crosshairs (`border-primary`), and pulse feedback animations.
   - Floating action pill at bottom: "⌨️ Type SKU Manually" (`bg-surface/90 backdrop-blur text-text-primary border-border shadow-lg`).
2. **Manual SKU Bottom Sheet**:
   - Elevated card modal using `bg-surface border-border text-text-primary`.
   - High-contrast text input (`bg-surface-elevated border-border text-text-primary focus:border-primary focus:ring-1 focus:ring-primary`).
   - Action buttons: "Cancel" (`bg-surface-elevated text-text-muted`) and "Submit SKU" (`bg-primary text-text-inverse hover:bg-primary-hover`).
3. **Accessibility**:
   - Touch targets meeting minimum 44x44px.
   - Descriptive ARIA labels for camera controls, torch toggle, and input fields.
   - Non-reliance solely on audio: visual reticle pulse and toast confirm scan captures.
