'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Volume2,
  Vibrate,
  Clock,
  RotateCcw,
  PlusCircle,
  AlertTriangle,
  ArrowLeft,
  Smartphone,
} from 'lucide-react';
import { ScanValidationCard } from '@/components/pos/scanner/scan-validation-card';
import { ScannerViewfinderOverlay } from '@/components/pos/scanner/scanner-viewfinder-overlay';
import { MobileCartSummaryDock } from '@/components/pos/scanner/mobile-cart-summary-dock';
import {
  dispatchScannerFeedback,
  unlockAudioContext,
} from '@/lib/pos/scanner-feedback';
import type {
  ScanValidationPayload,
  ViewfinderPulseState,
  MobileCartSummary,
} from '@/specs/113-pos-mobile-companion-validation-alerts/contracts/validation-card.contract';

export default function ScannerPreviewPage() {
  const [pulseState, setPulseState] = useState<ViewfinderPulseState>('idle');
  const [activeValidation, setActiveValidation] = useState<ScanValidationPayload | null>(null);
  const [cart, setCart] = useState<MobileCartSummary>({
    itemCount: 2,
    subtotal: 960.0,
  });
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Helper to trigger scan simulation
  const handleSimulateScan = async (payload: ScanValidationPayload) => {
    // Unlock AudioContext on touch/click
    await unlockAudioContext();

    // 1. Dispatch sound and vibration
    dispatchScannerFeedback(payload.status, {
      enableAudio: audioEnabled,
      enableHaptics: hapticsEnabled,
    });

    // 2. Trigger viewfinder perimeter pulse
    if (payload.status === 'SUCCESS') {
      setPulseState('success');
      // Update running cart
      if (payload.unitPrice) {
        setCart((prev) => ({
          itemCount: prev.itemCount + 1,
          subtotal: prev.subtotal + (payload.unitPrice ?? 0),
        }));
      }
    } else {
      setPulseState('danger');
    }

    // 3. Set top validation card
    setActiveValidation(payload);
  };

  const handleReset = () => {
    setActiveValidation(null);
    setPulseState('idle');
    setCart({ itemCount: 0, subtotal: 0 });
  };

  return (
    <main className="relative min-h-screen bg-bg-base text-text-primary flex flex-col justify-between overflow-hidden">
      {/* Top Floating Validation Card (Scenario 1, 2 & 4) */}
      <ScanValidationCard
        validation={activeValidation}
        onDismiss={() => {
          setActiveValidation(null);
        }}
        autoDismissMs={3500}
      />

      {/* Header Bar */}
      <header className="z-20 bg-bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-muted transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-primary" />
              <h1 className="text-sm font-bold text-text-primary">
                POS Companion Scanner (SIAA-113)
              </h1>
            </div>
            <p className="text-[11px] text-text-muted">
              Real-Time Validation Card & Screen Alerts Live Test Harness
            </p>
          </div>
        </div>

        {/* Audio / Haptic Toggle Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
              audioEnabled
                ? 'bg-primary-light text-primary border-primary-border'
                : 'bg-bg-muted text-text-muted border-border'
            }`}
            title="Toggle Web Audio"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">1200Hz/250Hz Audio</span>
          </button>
          <button
            type="button"
            onClick={() => setHapticsEnabled(!hapticsEnabled)}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
              hapticsEnabled
                ? 'bg-primary-light text-primary border-primary-border'
                : 'bg-bg-muted text-text-muted border-border'
            }`}
            title="Toggle Haptics"
          >
            <Vibrate className="w-4 h-4" />
            <span className="hidden sm:inline">Haptics</span>
          </button>
        </div>
      </header>

      {/* Center Camera Viewfinder Reticle Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <ScannerViewfinderOverlay
          pulseState={pulseState}
          onPulseEnd={() => setPulseState('idle')}
          className="rounded-3xl max-w-sm max-h-[460px] aspect-3/4 shadow-2xl border border-border"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-between p-6 text-center text-white/70 pointer-events-none">
            <span className="text-xs font-medium tracking-wider uppercase bg-black/40 px-3 py-1 rounded-full">
              Mobile Companion Camera Stream
            </span>
            <span className="text-[11px] bg-black/40 px-3 py-1 rounded-full">
              Point camera at parts barcode or trigger below
            </span>
          </div>
        </ScannerViewfinderOverlay>

        {/* Simulation Controls Panel */}
        <div className="w-full max-w-sm mt-4 p-3 bg-bg-card border border-border rounded-2xl shadow-sm space-y-2 z-20">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">
            Simulate Scan Responses (SIAA-113 Acceptance Scenarios):
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Scenario 1: Success Scan */}
            <button
              type="button"
              onClick={() =>
                handleSimulateScan({
                  status: 'SUCCESS',
                  sku: 'YAM-NMAX-BL01',
                  productName: 'Yamaha NMAX Brake Pad Set',
                  unitPrice: 480.0,
                  remainingStock: 11,
                })
              }
              className="px-3 py-2.5 rounded-xl bg-success text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Success (+₱480)</span>
            </button>

            {/* Scenario 2: Out of Stock Rejection */}
            <button
              type="button"
              onClick={() =>
                handleSimulateScan({
                  status: 'OUT_OF_STOCK',
                  sku: 'HON-CLK-DRV01',
                  productName: 'Honda Click Drive Belt 125i',
                  remainingStock: 0,
                  reason: 'Zero on-hand units available in warehouse stock',
                })
              }
              className="px-3 py-2.5 rounded-xl bg-danger text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Sold Out Alert</span>
            </button>

            {/* Uncataloged / Not Found */}
            <button
              type="button"
              onClick={() =>
                handleSimulateScan({
                  status: 'NOT_FOUND',
                  sku: 'UNKNOWN-PART-99',
                  reason: 'SKU or Barcode tag is not cataloged in inventory database',
                })
              }
              className="px-3 py-2 rounded-xl bg-bg-muted hover:bg-bg-hover text-text-primary border border-border font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Not Found (440Hz/330Hz)</span>
            </button>

            {/* Reset State */}
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-bg-muted hover:bg-bg-hover text-text-muted hover:text-text-primary border border-border font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Cart</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 px-1 border-t border-border">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-text-muted" />
              Auto-clears after 3.5s or tap screen
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" />
              Pure Web Audio (Zero MP3s)
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Running Cart Dock (Scenario 3) */}
      <MobileCartSummaryDock cart={cart} />
    </main>
  );
}
