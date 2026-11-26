# Technical Implementation Plan: POS Terminal QR Code Session Pairing & Supabase Realtime Broadcast

**Feature Branch**: `feat/SIAA-111-pos-terminal-qr-session-pairing`  
**Created**: 2026-11-26  
**Status**: In Progress  
**Jira Issue**: [SIAA-111](https://the-three-devsketeers.atlassian.net/browse/SIAA-111)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109)  

---

## 1. Technical Objectives & Architectural Decomposition

This plan implements dynamic session pairing and Supabase Realtime Broadcast between the desktop POS terminal and companion mobile scanners.

### Unit Breakdown (Atomic Commit Alignment)

1. **Unit 1: Specification & Design Artifacts**
   - Directory: `specs/111-pos-terminal-qr-session-pairing/`
   - Complete 8 artifacts: `spec.md`, `research.md`, `checklists/requirements.md`, `data-model.md`, `contracts/pos-scanner-channel.contract.ts`, `quickstart.md`, `plan.md`, `tasks.md`.

2. **Unit 2: Session Utilities & Pure Logic**
   - File: `lib/pos/scanner-session.ts`
   - Functions: `generateScannerSessionKey`, `validateScannerSessionKey`, `buildCompanionPairingUrl`, `createScannerSessionInfo`.
   - File: `lib/pos/qr-code.ts` & `components/pos/qr-code-svg.tsx`
   - Vector SVG QR matrix generation without external npm dependencies.
   - Tests: `lib/pos/__tests__/scanner-session.test.ts`.

3. **Unit 3: Realtime Broadcast Channel Hook & Engine**
   - File: `lib/hooks/use-pos-scanner-channel.ts`
   - Hook managing Supabase channel subscription, heartbeat monitoring, ping latency, and focus-agnostic `BARCODE_SCANNED` event dispatching.
   - Tests: `lib/pos/__tests__/pos-scanner-channel.test.ts`.

4. **Unit 4: Pairing Modal & UI Components**
   - File: `components/pos/scanner-pairing-modal.tsx`
   - Clean modal displaying SVG QR code, live connection badge, ping latency indicator, "Copy Link", and re-pair action.
   - Adheres strictly to SWIFT design tokens (`bg-surface`, `border-border`, semantic badge styles).

5. **Unit 5: Staff POS Terminal Integration**
   - File: `app/staff/pos/page.tsx`
   - Header action button: "📱 Pair Phone Scanner" with connection status badge.
   - Wire `usePosScannerChannel` to ingest scans directly into `handleSelectProduct` / availability validation pipeline.

6. **Unit 6: Verification & Final Polish**
   - Full test run (`npm test`), TypeScript verification (`npx tsc --noEmit`), ESLint check (`npm run lint`).
   - `graphify-auto-sync` trigger.

---

## 2. Component Hierarchy & Data Flow

```
StaffPosPage (app/staff/pos/page.tsx)
  ├── Header Action Bar
  │     └── ScannerStatusButton (opens modal or displays status)
  ├── usePosScannerChannel (lib/hooks/use-pos-scanner-channel.ts)
  │     ├── Supabase Realtime Channel: 'pos-channel:{sessionKey}'
  │     ├── Listens: CLIENT_JOINED, HEARTBEAT, BARCODE_SCANNED, CLIENT_DISCONNECTED
  │     ├── Dispatches: onBarcodeScanned ➔ handleSelectProduct(product)
  │     └── Sends: TERMINAL_ACK, HEARTBEAT_ACK
  └── ScannerPairingModal (components/pos/scanner-pairing-modal.tsx)
        ├── QrCodeSvg (components/pos/qr-code-svg.tsx)
        ├── Copy Link Button
        └── Live Status & Ping Latency Display
```
