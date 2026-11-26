# Implementation Tasks: POS Terminal QR Code Session Pairing & Supabase Realtime Broadcast

**Feature**: `111-pos-terminal-qr-session-pairing`  
**Jira Ticket**: [SIAA-111](https://the-three-devsketeers.atlassian.net/browse/SIAA-111)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109)  

---

## Phase 1: Unit 1 — Specifications & Design Artifacts
- [x] Task 1.1: Author `spec.md` with Mike Cohn user stories & 4 Gherkin acceptance criteria matching SIAA-111.
- [x] Task 1.2: Author `research.md` detailing Realtime Broadcast architecture and session security.
- [x] Task 1.3: Author `data-model.md` defining session entities, connection states, and state machine.
- [x] Task 1.4: Author `contracts/pos-scanner-channel.contract.ts` with strongly typed payload contracts.
- [x] Task 1.5: Author `checklists/requirements.md` covering completeness, WCAG, and design tokens.
- [x] Task 1.6: Author `plan.md` defining unit decomposition and component hierarchy.
- [x] Task 1.7: Author `quickstart.md` defining verification walkthroughs.
- [x] Task 1.8: Author `tasks.md` mapping implementation units and test coverage.
- [x] Task 1.9: Commit specification artifacts following atomic commit guidelines (`docs(specs): [SIAA-111] add specification, architecture plan, and contracts for pos qr session pairing`).

## Phase 2: Unit 4 — Domain Models, Session Engine, QR Generator & TDD Tests
- [x] Task 2.1: Implement session key generation and validation utilities in `lib/pos/scanner-session.ts`.
- [x] Task 2.2: Implement zero-dependency vector SVG QR code generator in `lib/pos/qr-code.ts` and `components/pos/qr-code-svg.tsx`.
- [x] Task 2.3: Author unit test suite in `lib/pos/__tests__/scanner-session.test.ts` validating session key entropy, validation, expiry, and URL builders.
- [x] Task 2.4: Implement Supabase Realtime Broadcast hook in `lib/hooks/use-pos-scanner-channel.ts` supporting handshake, heartbeats, and focus-agnostic `BARCODE_SCANNED` event dispatching.
- [x] Task 2.5: Author unit test suite in `lib/pos/__tests__/pos-scanner-channel.test.ts` validating connection state transitions, heartbeat timeouts, and scan ingestion.
- [x] Task 2.6: Run tests and typecheck (`npm test`, `npx tsc --noEmit`).
- [x] Task 2.7: Commit domain models, logic, and tests (`feat(pos): [SIAA-111] implement scanner session manager, svg qr generator, realtime broadcast hook, and test suites`).

## Phase 3: Unit 5 — UI Components & Staff POS Integration
- [x] Task 3.1: Implement `components/pos/scanner-pairing-modal.tsx` rendering pairing QR code, copy link action, live connection telemetry, and latency badge.
- [x] Task 3.2: Integrate scanner pairing button and connection badge into POS top action bar in `app/staff/pos/page.tsx`.
- [x] Task 3.3: Wire `usePosScannerChannel` to `handleSelectProduct` / availability validation pipeline for background focus-agnostic scan ingestion.
- [x] Task 3.4: Harmonize channel naming with `lib/pos/companion-broadcast.ts` to ensure compatibility with SIAA-112/SIAA-113.
- [x] Task 3.5: Verify UI build, typecheck, and lint (`npx tsc --noEmit`, `npm run lint`).
- [x] Task 3.6: Commit UI components and route views (`feat(pos): [SIAA-111] wire scanner pairing modal and background broadcast ingestion in staff pos page`).

## Phase 4: Unit 6 — Task Completion & Governance Sync
- [x] Task 4.1: Mark all tasks complete in `tasks.md`.
- [x] Task 4.2: Trigger `graphify-auto-sync` (`graphify . --update`) to update AST knowledge graph.
- [x] Task 4.3: Commit task completion sync (`docs(specs): [SIAA-111] mark all implementation tasks complete`).
