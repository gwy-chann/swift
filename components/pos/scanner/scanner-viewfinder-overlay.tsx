'use client';

import React, { useEffect } from 'react';
import type { ScannerViewfinderOverlayProps } from '@/specs/113-pos-mobile-companion-validation-alerts/contracts/validation-card.contract';
import { SCANNER_FEEDBACK_CONSTANTS } from '@/lib/pos/scanner-feedback';

export function ScannerViewfinderOverlay({
  pulseState = 'idle',
  onPulseEnd,
  pulseDurationMs = SCANNER_FEEDBACK_CONSTANTS.VIEWFINDER_PULSE_DURATION_MS,
  className = '',
  children,
}: Readonly<ScannerViewfinderOverlayProps>) {
  useEffect(() => {
    if (pulseState === 'idle') return;

    const timer = setTimeout(() => {
      onPulseEnd?.();
    }, pulseDurationMs);

    return () => clearTimeout(timer);
  }, [pulseState, pulseDurationMs, onPulseEnd]);

  // Dynamic perimeter styling based on pulse state
  let perimeterClass = 'border-border/60 shadow-none';
  if (pulseState === 'success') {
    // 400ms emerald pulse
    perimeterClass =
      'border-success shadow-[0_0_24px_rgba(16,185,129,0.5)] ring-4 ring-success/30 transition-all duration-200';
  } else if (pulseState === 'danger') {
    // 400ms crimson alert pulse
    perimeterClass =
      'border-danger shadow-[0_0_24px_rgba(239,68,68,0.6)] ring-4 ring-danger/30 transition-all duration-200 animate-pulse';
  }

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-black/40 select-none ${className}`}
      data-testid="scanner-viewfinder-overlay"
      data-pulse-state={pulseState}
    >
      {children}

      {/* Viewfinder Target Reticle Frame */}
      <div
        className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl border-2 ${perimeterClass} flex items-center justify-center transition-colors duration-200`}
      >
        {/* Reticle Corner Brackets */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />

        {/* Center Guide Crosshair Marker */}
        <div className="w-8 h-0.5 bg-primary/40 rounded-full" />
        <div className="h-8 w-0.5 bg-primary/40 rounded-full absolute" />
      </div>
    </div>
  );
}
