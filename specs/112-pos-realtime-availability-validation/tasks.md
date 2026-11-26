# Implementation Tasks: POS Real-Time Availability Validation & Sold-Out Rejection

**Feature**: `112-pos-realtime-availability-validation`  
**Jira Ticket**: [SIAA-112](https://the-three-devsketeers.atlassian.net/browse/SIAA-112)  
**Parent Epic**: [SIAA-109](https://the-three-devsketeers.atlassian.net/browse/SIAA-109)  

---

## Phase 1: Unit 1 — Specifications & Contracts
- [x] Task 1.1: Author `spec.md` with Mike Cohn user stories & 4 Gherkin acceptance criteria matching SIAA-112.
- [x] Task 1.2: Author `research.md` detailing architecture boundaries and telemetry contracts.
- [x] Task 1.3: Author `data-model.md` defining `PosScanValidationResponse` and state transitions.
- [x] Task 1.4: Author `contracts/pos-scan-validation.contract.ts` with Zod schemas and TypeScript types.
- [x] Task 1.5: Author `checklists/requirements.md` covering quality, WCAG, and design tokens.
- [x] Task 1.6: Author `plan.md` mapping file modifications and component interactions.
- [x] Task 1.7: Author `quickstart.md` defining verification walkthroughs.
- [x] Task 1.8: Commit specification artifacts following atomic commit guidelines (`docs(specs): [SIAA-112] ...`).

## Phase 2: Unit 4 — Domain Logic, Pure Validator & TDD Tests
- [x] Task 2.1: Implement pure availability evaluation functions (`evaluateProductAvailability`, `buildPosScanValidationResponse`) in `lib/pos/availability-validator.ts` and `lib/pos/companion-broadcast.ts`.
- [x] Task 2.2: Ensure `useCartStore.addPart` handles exact reason reporting (`out_of_stock`, `exceeds_stock`) and query helpers.
- [x] Task 2.3: Author comprehensive unit tests in `lib/pos/__tests__/availability-validator.test.ts` testing all 4 scenarios.
- [x] Task 2.4: Run test suite with `npx tsx --test` to confirm red-to-green pass.
- [x] Task 2.5: Commit domain logic and tests (`feat(pos): [SIAA-112] add availability validation engine, broadcast response builder, and unit tests`).

## Phase 3: Unit 5 — UI & Terminal Route Wiring
- [x] Task 3.1: Wire `handleSelectProduct` and `handleScanNotFound` in `app/staff/pos/page.tsx` with exact toast warnings and broadcast dispatches.
- [x] Task 3.2: Verify `HybridCatalogPane` onKeyDown and item click paths pass through availability validation.
- [x] Task 3.3: Verify TypeScript compilation (`npx tsc --noEmit`) and build checks.
- [x] Task 3.4: Commit UI integration (`feat(pos): [SIAA-112] wire realtime availability validation toasts and broadcast dispatch in staff pos terminal`).

## Phase 4: Unit 6 — Task Completion & Governance Sync
- [x] Task 4.1: Mark all tasks complete in `tasks.md`.
- [x] Task 4.2: Trigger `graphify-auto-sync` (`graphify . --update`) to update the AST knowledge graph.
- [x] Task 4.3: Commit task completion sync (`docs(specs): [SIAA-112] mark all implementation tasks complete`).
