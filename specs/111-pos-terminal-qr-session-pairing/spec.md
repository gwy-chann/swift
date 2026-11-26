# Feature Specification: POS Terminal: QR Code Session Pairing & Supabase Realtime Broadcast Channel

**Feature Branch**: `feat/SIAA-111-pos-terminal-qr-session-pairing`  
**Created**: 2026-11-26  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-111](https://the-three-devsketeers.atlassian.net/browse/SIAA-111) (STORY-109.2)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109) (EPIC: Mobile Web Companion Barcode & SKU Scanner for POS Fast-Lane Checkout)  
**Target View**: Staff POS Terminal (`/staff/pos`) and Mobile Companion Scanner (`/staff/pos/scanner`)  

---

## 1. Executive Summary & Objective

In high-volume retail motorcycle parts and service workshops, counter cashiers are tethered to fixed desktop POS terminals while physical parts with barcodes are often shelved or stacked across counter bins, bulk boxes, or mechanic bays. Requiring cashiers to manually key in SKUs or awkwardly stretch wired USB scanners creates checkout bottlenecks and physical strain.

This feature implements the **QR Code Session Pairing & Realtime Broadcast Pipeline** on the desktop POS terminal. With a single click on "📱 Pair Phone Scanner", the cashier generates an ephemeral, cryptographically secure pairing session represented as an on-screen SVG QR code. Any staff smartphone scanning this QR code immediately opens the zero-install mobile companion scanner (`/staff/pos/scanner?session={sessionKey}`) and establishes an isolated, bidirectional Supabase Realtime Broadcast channel (`pos-channel:{sessionKey}`). Scanned barcodes streamed from the companion phone are ingested into the desktop cart pipeline within <100ms in a focus-agnostic manner, supported by mutual heartbeat pings, latency telemetry, and graceful disconnection recovery.

---

## 2. Clarifications & Architecture Invariants

### Clarifications Session
- **Q1: How is the pairing session key generated and formatted?**  
  *Decision*: `sessionKey = generateScannerSessionKey(terminalId)` producing `pos-${terminalId}-${randomHex}` (e.g. `pos-T1-a8f9c1b2`). It is collision-resistant, URL-safe, and self-identifying.
- **Q2: Which Supabase Realtime channel name and configuration are used?**  
  *Decision*: `pos-channel:${sessionKey}` with `{ broadcast: { ack: true } }`. This strictly isolates traffic between the specific desktop terminal and its paired smartphone.
- **Q3: What events are supported over the broadcast channel?**  
  *Decision*: 
  1. `CLIENT_JOINED`: Phone notifies terminal upon mounting (`{ device: string, timestamp: number }`).
  2. `TERMINAL_ACK`: Terminal acknowledges companion connection (`{ terminalId: string, timestamp: number }`).
  3. `HEARTBEAT`: Periodic ping/pong every 3 seconds to measure round-trip latency.
  4. `BARCODE_SCANNED`: Scanned barcode or SKU emitted by the companion phone (`{ code: string, timestamp: number, format?: string }`).
  5. `SCAN_VALIDATION_RESULT`: Terminal broadcasts real-time stock validation result back to companion (from SIAA-112).
  6. `CLIENT_DISCONNECTED`: Explicit graceful exit notification when the mobile scanner unmounts.
- **Q4: How does focus-agnostic background scan ingestion work on the desktop terminal?**  
  *Decision*: The `usePosScannerChannel` hook subscribes to `BARCODE_SCANNED` events regardless of browser window focus, input field focus, or active modal state. Received codes are passed directly to `handleSelectProduct` / `resolveBarcodeScanQuery` without requiring cashier cursor focus in the search bar.
- **Q5: How does the system detect and display scanner disconnections?**  
  *Decision*: The desktop terminal monitors companion heartbeats. If no heartbeat or ping is received for >10 seconds, the status transitions to `DISCONNECTED` within 3 seconds, rendering an alert badge and a 1-click re-pair button without disturbing items in the active cart.

---

## 3. User Stories & Acceptance Criteria (Mike Cohn & Gherkin Format)

### User Story (Jira SIAA-111 / STORY-109.2)

* **As a** counter cashier,
* **I want to** display a pairing QR code on my desktop POS terminal that any staff smartphone can scan to join an isolated real-time broadcast channel,
* **so that** scanned items from the phone stream directly into the terminal active cart in real time without software installation, Bluetooth pairing, or manual IP configuration.

---

### Scenario 1: Terminal generates dynamic session pairing QR code (Priority: P1)

* **Given** the cashier is on the POS interface (`/staff/pos`) with an active shift
* **When** the cashier clicks the "📱 Pair Phone Scanner" action button in the POS top action bar
* **Then** a modal opens generating a cryptographically secure session key (e.g. `sessionKey = generateScannerSessionKey()`)
* **And** renders an SVG QR code encoding the full companion URL: `{origin}/staff/pos/scanner?session={sessionKey}` along with a "Copy Link" button and step-by-step instructions.

---

### Scenario 2: Establishing Supabase Realtime Broadcast handshake (Priority: P1)

* **Given** staff scans the QR code using their smartphone camera and opens the link in mobile Chrome or Safari
* **When** the mobile scanner component mounts with the `?session={sessionKey}` query parameter
* **Then** both desktop POS and mobile phone subscribe to an isolated Supabase Realtime Broadcast channel named `pos-channel:${sessionKey}`
* **And** the phone emits a `{ type: 'broadcast', event: 'CLIENT_JOINED', payload: { device: 'Mobile', timestamp: Date.now() } }` event
* **And** the desktop modal switches to a green "Phone Connected" status badge with live ping latency (<50ms).

---

### Scenario 3: Focus-agnostic background scan ingestion (Priority: P1)

* **Given** the phone and desktop terminal have an active broadcast pairing channel
* **When** a barcode is scanned on the phone, broadcasting `{ event: 'BARCODE_SCANNED', payload: { code: 'HON-BRK-01', timestamp: Date.now() } }`
* **Then** the desktop POS listener receives the event in under 100ms and immediately dispatches the SKU to the validation and cart store pipeline
* **And** the scan is ingested and added to the cart regardless of whether the desktop search input is focused, blurred, or if the cashier is browsing another tab.

---

### Scenario 4: Heartbeat monitoring and graceful disconnection handling (Priority: P2)

* **Given** an active paired session is established
* **When** the phone browser tab is closed, cellular/Wi-Fi connection drops, or heartbeat ping times out (>10 seconds)
* **Then** the desktop terminal updates the connection badge to "Scanner Disconnected" within 3 seconds, displays an alert banner, and offers a 1-click re-pair button without disrupting active cart items.

---

## 4. UI Requirements & SWIFT Design Token Compliance

1. **Top Action Bar Button**:
   - Label: `📱 Pair Phone Scanner` or `📱 Phone Scanner: [Status]`
   - Renders connection status pill:
     - Disconnected / Not Paired: `bg-surface-elevated text-text-muted border-border`
     - Connecting / Waiting: `bg-warning-light text-warning border-warning/30 animate-pulse`
     - Connected: `bg-success-light text-success border-success/30`
2. **Scanner Pairing Modal**:
   - Clean dialog using SWIFT semantic surface tokens (`bg-surface`, `border-border`, `text-text-primary`).
   - SVG QR Code element with high contrast (`#000000` on `#ffffff` canvas container with rounded borders).
   - Dynamic session expiration / refresh indicator.
   - Quick action: "Copy Link" with instant visual feedback ("Copied!").
   - Live paired device card showing device name, connect timestamp, and latency badge.
3. **Accessibility**:
   - `aria-label`, role `dialog`, ESC key dismissable, keyboard focus trap.
