# Feature Specification: POS Mobile Companion: Real-Time Two-Way Validation Card & Screen Alerts

**Feature Branch**: `feat/SIAA-113-pos-mobile-companion-validation-alerts`  
**Created**: 2026-11-26  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-113](https://the-three-devsketeers.atlassian.net/browse/SIAA-113) (STORY-109.4)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109) (EPIC: Mobile Web Companion Barcode & SKU Scanner for POS Fast-Lane Checkout)  
**Target View**: Mobile Companion Web Scanner (`/staff/pos/scanner` / companion viewfinder overlay)  

---

## 1. Executive Summary & Objective

In high-velocity motorcycle parts shops, counter staff members frequently step away from the desktop POS terminal to retrieve heavy, bulky, or high-shelf items (e.g., tire sets, engine oil crates, exhaust pipes, drive chains). Using a mobile companion barcode scanner on their smartphones, staff scan barcodes directly in the warehouse aisles or shop floor racks.

However, scanning without immediate bidirectional confirmation forces staff to crane their necks back toward the desktop counter monitor to verify whether an item was accepted into the cart, or rejected due to zero stock or catalog mismatch.

To solve this friction, this feature delivers an instant, multi-sensory (visual, haptic, and acoustic) validation and screen alert subsystem for the mobile companion scanner:
1. **Perimeter Viewfinder Pulses**: Instant 400ms emerald green pulse upon successful item acceptance, or crimson red warning pulse with alert animation on rejection.
2. **Top-Anchored Floating Validation Card**: Slides down smoothly from the top upon successful cart addition displaying the product name, SKU, price formatted in Philippine Peso (₱), and remaining on-hand stock count (e.g., "12 units remaining").
3. **High-Contrast Rejection Modal / Banner**: Alerts staff immediately with "SOLD OUT / UNAVAILABLE — NOT ADDED TO CART" alongside the item SKU and specific failure reason (e.g. `OUT_OF_STOCK`, `EXCEEDS_STOCK`, `NOT_FOUND`).
4. **Transient Auto-Dismiss Engine**: Automatically fades and translates out the validation card after 3.5 seconds of inactivity, or instantly upon a user tap anywhere on the screen, keeping the camera reticle unobstructed for rapid subsequent scans.
5. **Multi-Tone Acoustic & Haptic Feedback Engine**: Synthesizes pure Web Audio API tones without relying on external MP3 assets (1200Hz high chime for success; 250Hz double buzz for sold out / rejection; 440Hz/330Hz sequence for not found) paired with tactile haptics via `navigator.vibrate` (80ms single pulse for success; `[200, 100, 200]` double pulse for rejection).
6. **Live Bottom Cart Summary Dock**: A sticky bottom mobile dock that updates live cart item count and running subtotal (`Cart: X items | Subtotal: ₱Y,YYY.00`), enabling staff to verify basket totals on-the-fly.

---

## 2. Clarifications & Architecture Invariants

### Clarifications Session
- **Q1: How should audio tones be generated without risking 404s or network asset latencies on mobile connections?**  
  *Decision*: Use the standard Web Audio API (`AudioContext` / `webkitAudioContext`) oscillator and gain envelope nodes. This guarantees instant zero-latency tone generation (1200Hz sine wave for success, 250Hz square/sawtooth for buzzers) with zero network dependency.
- **Q2: How does the system handle iOS / Safari restrictions on Web Audio and `navigator.vibrate`?**  
  *Decision*: The audio feedback utility must lazy-initialize and unlock the `AudioContext` on user interaction. For platforms lacking vibration support (e.g. iOS Safari where `navigator.vibrate` is unsupported), execution safely no-ops without throwing exceptions.
- **Q3: How does the auto-clearing timer interact with rapid consecutive scans?**  
  *Decision*: Scanning a new item immediately cancels any active 3.5s timeout, resets the card state, and re-triggers the visual/audio/haptic validation for the newest item.
- **Q4: How are currency and stock counts formatted?**  
  *Decision*: Currency strictly adheres to Philippine Peso format (`₱XX,XXX.XX` or `₱X,XXX.00`). Stock counters display informative text: `"X units remaining"` (or `"Out of Stock"` if 0).

---

## 3. User Stories & Acceptance Criteria (Mike Cohn Format)

### User Story (Jira STORY-109.4)

* **As a** scanning staff member holding the mobile phone companion scanner,
* **I want to** receive instant visual, haptic, and audio validation responses from the desktop POS directly on my phone screen after every scan,
* **so that** I know with certainty whether an item was accepted into the cart or rejected as sold out without having to look across the counter at the computer monitor.

---

### Scenario 1: Visual and Audio Confirmation for Successfully Added Item (Priority: P1)

* **Given** the mobile phone is paired with an active POS terminal session and has transmitted an SKU scan
* **When** the terminal returns a `{ status: 'SUCCESS' }` validation response
* **Then** the mobile phone camera viewfinder perimeter pulses emerald green (`var(--success)`) for 400ms
* **And** a floating validation card smoothly slides in from the top displaying:
  * Product Name
  * SKU
  * Unit Price in Philippine Peso (`₱`)
  * Remaining stock counter (e.g., `"12 units remaining"`)
* **And** plays a high-pitch success chime (1200Hz sine tone) through the phone speaker
* **And** triggers a crisp 80ms haptic confirmation pulse (`navigator.vibrate(80)`).

---

### Scenario 2: Immediate High-Contrast Alert for Sold-Out / Rejected Item (Priority: P1)

* **Given** the phone transmits a scan for an out-of-stock or invalid product
* **When** the terminal returns an `{ status: 'OUT_OF_STOCK' }` or `{ status: 'EXCEEDS_STOCK' }` rejection payload
* **Then** the mobile phone viewfinder perimeter pulses crimson red (`var(--danger)`) with an alert border animation
* **And** a prominent high-contrast modal banner renders: `"SOLD OUT / UNAVAILABLE — NOT ADDED TO CART"` showing the exact SKU and reason message
* **And** plays a distinct low-frequency double buzz (250Hz tone pulse)
* **And** triggers an emphatic double vibration pattern (`navigator.vibrate([200, 100, 200])`).

---

### Scenario 3: Live Running Cart Summary Dock on Mobile (Priority: P1)

* **Given** the terminal has active items in the current transaction cart
* **When** the companion scanner view is active on the smartphone
* **Then** a compact bottom sticky dock displays the live cart state: `"Cart: X items | Subtotal: ₱Y,YYY.00"` updated in real time via broadcast payloads
* **And** allows the scanning staff member to verify the customer's total order size right in their hand without asking the counter cashier.

---

### Scenario 4: Auto-Clearing Transient Card Transition (Priority: P1)

* **Given** a validation card is visible on screen
* **When** 3.5 seconds elapse without an incoming scan OR the staff member taps anywhere on the screen
* **Then** the card smoothly fades and translates out, leaving the scanning reticle unobstructed for the next item.

---

## 4. Non-Functional & Accessibility Requirements

- **Design System Tokens Compliance**: All colors, borders, and surfaces must consume SWIFT tokens (`var(--success)`, `var(--danger)`, `var(--bg-card)`, `var(--text-primary)`, `var(--border-color)`). No hardcoded hex or arbitrary Tailwind color classes.
- **WCAG 2.1 AA Accessibility**:
  - Live regions (`aria-live="polite"` for success cards; `aria-live="assertive"` and `role="alert"` for rejection banners) so screen readers immediately announce scan feedback.
  - High contrast text against alert backgrounds.
- **Graceful Fallbacks**:
  - Web Audio API errors or permission issues must fail silently without blocking UI state.
  - `navigator.vibrate` must check availability before calling.
- **Touch Responsiveness**: Minimum 44x44px touch dismiss target or whole-screen dismiss tap listener.

---

## 5. Technical Deliverables & File Mapping

1. **Validation Card Component**: `components/pos/scanner/scan-validation-card.tsx`
2. **Viewfinder Overlay Component**: `components/pos/scanner/scanner-viewfinder-overlay.tsx`
3. **Cart Dock Component**: `components/pos/scanner/mobile-cart-summary-dock.tsx`
4. **Multi-Tone Sound & Haptic Utility**: `lib/pos/scanner-feedback.ts`
5. **Contract Specifications**: `specs/113-pos-mobile-companion-validation-alerts/contracts/validation-card.contract.ts`
6. **Automated Unit Tests**: `lib/pos/__tests__/scanner-feedback.test.ts`
