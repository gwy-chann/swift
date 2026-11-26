# Requirements Quality Checklist: POS Terminal QR Code Session Pairing & Supabase Realtime Broadcast

**Feature**: `111-pos-terminal-qr-session-pairing`  
**Jira Ticket**: [SIAA-111](https://the-three-devsketeers.atlassian.net/browse/SIAA-111)  

---

## 1. Requirement Completeness & Traceability
- [x] **Scenario 1 (QR Generation)**: Terminal generates dynamic session pairing key (`pos-${terminalId}-${random}`) and renders clean SVG QR code with `{origin}/staff/pos/scanner?session={sessionKey}` and "Copy Link" utility.
- [x] **Scenario 2 (Handshake & State)**: Companion joins channel `pos-channel:${sessionKey}`, emits `CLIENT_JOINED`, terminal acknowledges with `TERMINAL_ACK`, and UI transitions to green "Phone Connected" badge with ping latency (<50ms).
- [x] **Scenario 3 (Focus-Agnostic Ingestion)**: Scanned barcodes (`BARCODE_SCANNED`) emitted by phone are ingested into the desktop cart pipeline within <100ms, regardless of active UI focus or tab blur.
- [x] **Scenario 4 (Heartbeat & Graceful Disconnect)**: Terminal detects missing heartbeat pings (>10s) or explicit unmount, updates badge to "Scanner Disconnected" within 3s, presents 1-click re-pair button, and preserves active cart state.

## 2. SWIFT Design Tokens & UI Guidelines
- [x] Pairing button and modal surfaces adhere to `bg-surface`, `bg-surface-elevated`, `border-border`, and `text-text-primary`.
- [x] Status badges strictly leverage semantic tokens:
  - Disconnected: `bg-surface-elevated text-text-muted border-border`
  - Connecting / Waiting: `bg-warning-light text-warning border-warning/30`
  - Connected: `bg-success-light text-success border-success/30`
- [x] Zero hardcoded hex colors (except QR code SVG foreground/background matrix which renders high-contrast black/white inside an isolated rounded wrapper).

## 3. WCAG 2.1 AA Accessibility
- [x] Modal includes `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and dismiss on `Escape`.
- [x] Connection state changes announced via accessible status announcements or `aria-live="polite"`.
- [x] High-contrast legible text (contrast ratio > 4.5:1) in light and dark themes.

## 4. Testability & Resilience
- [x] Session key generation, verification, and expiration logic isolated into pure functions in `lib/pos/scanner-session.ts` with 100% test coverage.
- [x] Supabase channel event contracts strongly typed with Zod in `contracts/pos-scanner-channel.contract.ts`.
- [x] Channel mock engine provided for deterministic testing of join, ping, scan, and timeout states without live network connections.
