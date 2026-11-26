# Implementation Tasks: POS Mobile Companion Scanner (SIAA-110)

## Phase 1: Setup & Contracts
- [ ] Task 1.1: Verify validation contracts and Zod schemas in `specs/110-pos-mobile-companion-scanner/contracts/barcode-scanner.contract.ts`
- [ ] Task 1.2: Ensure `html5-qrcode` dependency is registered and types resolve cleanly

## Phase 2: Domain Logic & Audio/Haptic Engine
- [ ] Task 2.1: Add `playScanCaptureBeep(freq?: number, durationMs?: number)` and `triggerSuccessHaptic(durationMs?: number)` to `lib/pos/scanner-feedback.ts` matching 1000Hz / 80ms SIAA-110 specifications
- [ ] Task 2.2: Add unit tests in `lib/pos/__tests__/scanner-feedback.test.ts` verifying 1000Hz synthesized sine beep and haptic pulse

## Phase 3: UI Components
- [ ] Task 3.1: Implement `components/pos/scanner/manual-sku-modal.tsx` bottom sheet for manual SKU input with autofocus and keyboard submission
- [ ] Task 3.2: Implement `components/pos/scanner/mobile-camera-scanner.tsx` integrating `html5-qrcode`, 1500ms cooldown throttle, torch control, and camera permission fallback

## Phase 4: Route View & Realtime Broadcast
- [ ] Task 4.1: Implement mobile companion scanner page `app/staff/pos/scanner/page.tsx` with full-screen mobile layout, sticky action header, session pairing status, recent scan history, and Supabase Realtime broadcast wiring

## Phase 5: Verification & Tests
- [ ] Task 5.1: Create automated unit tests in `lib/pos/__tests__/mobile-camera-scanner.test.ts` testing throttle cooldown, manual SKU dispatch, and contract validation
- [ ] Task 5.2: Execute test suite (`npm test`) and typecheck (`npx tsc --noEmit`) to verify zero regressions
