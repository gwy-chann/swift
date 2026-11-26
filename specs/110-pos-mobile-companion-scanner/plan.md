# Implementation Plan: POS Mobile Companion Scanner (SIAA-110)

## 1. Architecture Overview & Component Hierarchy

```
app/staff/pos/scanner/page.tsx (Mobile Scanner Route Entrypoint)
  ├── ScannerHeader (Session Status Pill, Torch Toggle, Close Button)
  ├── MobileCameraScanner (html5-qrcode camera mount & 30fps decoding)
  │     ├── ScannerViewfinderOverlay (Target reticle, corner brackets, pulse state)
  │     └── CameraPermissionFallback (User guidance when camera denied/unsupported)
  ├── ScannerFeedbackEngine (Web Audio API 1000Hz synth beep + 80ms navigator.vibrate)
  ├── ManualSkuModal (Slide-up bottom sheet for damaged label fallback)
  └── SupabaseRealtimeBroadcaster (Streams to pos-channel:{sessionKey} when paired)
```

---

## 2. Token & Styling Mapping

All UI components adhere strictly to SWIFT design tokens (`app/globals.css`, `lib/tokens.ts`, Tailwind v4):

| Element | Semantic Token Classes | Purpose |
| :--- | :--- | :--- |
| Full-screen container | `bg-surface text-text-primary h-[100dvh]` | Zero black-letterbox flicker, mobile viewport height |
| Header bar | `bg-surface/80 backdrop-blur border-b border-border` | Translucent top navigation |
| Reticle brackets | `border-primary` | High-contrast target corners |
| Pulse state (Success) | `border-success ring-4 ring-success/30 shadow-[0_0_24px_rgba(16,185,129,0.5)]` | Instant visual capture confirmation |
| Manual SKU Button | `bg-surface/90 text-text-primary border border-border shadow-lg active:scale-95` | Accessible tactile bottom pill |
| Modal Bottom Sheet | `bg-surface border-t border-border rounded-t-2xl text-text-primary` | Elevated dialog sheet |
| Action Button (Submit) | `bg-primary text-text-inverse hover:bg-primary-hover` | Primary CTA |

---

## 3. Implementation Steps

1. **Audio & Haptic Feedback Enhancement** (`lib/pos/scanner-feedback.ts`):
   - Add/verify `playScanCaptureBeep(freq = 1000, durationMs = 80)` supporting SIAA-110 specifications.
   - Ensure `triggerSuccessHaptic(80)` fires on capture.
2. **Scanner Component** (`components/pos/scanner/mobile-camera-scanner.tsx`):
   - Integrate `html5-qrcode` with custom viewfinder and continuous 30fps decoding.
   - Implement `isThrottled` ref with 1500ms cooldown.
   - Implement hardware torch toggle through `html5Qrcode.applyVideoConstraints({ advanced: [{ torch: boolean }] })`.
   - Handle permission denied, camera not found, and unmount cleanup (`stop()` & `clear()`).
3. **Manual SKU Fallback Modal** (`components/pos/scanner/manual-sku-modal.tsx`):
   - Slide-up bottom sheet with accessible alphanumeric input and form submit.
4. **Mobile Scanner Page** (`app/staff/pos/scanner/page.tsx`):
   - Read `?session={sessionKey}` via `useSearchParams()`.
   - Wire scanner events to Supabase Realtime broadcast channel `pos-channel:{sessionKey}`.
   - Display session pairing status badge and recent scan history list.
5. **Unit Tests** (`lib/pos/__tests__/mobile-camera-scanner.test.ts`):
   - Validate contract schemas, throttle cooldown timing, audio/haptic trigger invocations, and manual fallback dispatch.
