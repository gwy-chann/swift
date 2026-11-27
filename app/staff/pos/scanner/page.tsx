'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MobileCameraScanner } from '@/components/pos/scanner/mobile-camera-scanner';
import { ManualSkuModal } from '@/components/pos/scanner/manual-sku-modal';
import type { BarcodeScanPayload } from '@/specs/110-pos-mobile-companion-scanner/contracts/barcode-scanner.contract';
import { createClient } from '@/lib/supabase/client';

interface ScannedHistoryItem {
  id: string;
  code: string;
  format: string;
  timeString: string;
}

function MobileScannerContent() {
  const searchParams = useSearchParams();
  const sessionKey = searchParams.get('session');

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [recentScans, setRecentScans] = useState<ScannedHistoryItem[]>([]);
  const [broadcastStatus, setBroadcastStatus] = useState<'IDLE' | 'CONNECTED' | 'STREAMING'>('IDLE');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to reliably broadcast companion events via server API route and local Supabase client
  const dispatchEvent = useCallback(async (event: string, payload: unknown) => {
    if (!sessionKey) return;
    let deliveredViaApi = false;
    // 1. Post to Next.js server API endpoint (relays to local SSE hub and Supabase broadcast)
    try {
      const res = await fetch('/api/pos/scanner/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey, event, payload })
      });
      if (res.ok) {
        deliveredViaApi = true;
      }
    } catch (apiErr) {
      console.debug('[ScannerPage] API broadcast notice:', apiErr);
    }

    // 2. Only fallback to direct Supabase client broadcast if server API route was unreachable
    if (!deliveredViaApi) {
      try {
        const supabase = createClient();
        const channelName = sessionKey.startsWith('pos-')
          ? `pos-channel:${sessionKey}`
          : `pos-session:${sessionKey}`;
        const channel = supabase.channel(channelName);
        await channel.send({
          type: 'broadcast',
          event,
          payload: payload || {}
        });
      } catch {
        // Ignored on mobile when Supabase local host is unreachable directly
      }
    }
  }, [sessionKey]);

  // Maintain pairing lifecycle & keepalive heartbeat with desktop terminal
  useEffect(() => {
    if (!sessionKey) return;

    void Promise.resolve().then(() => {
      setBroadcastStatus('CONNECTED');
    });

    // Notify desktop that companion mobile scanner joined
    void dispatchEvent('CLIENT_JOINED', {
      device: 'Mobile Companion',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Mobile',
      timestamp: Date.now()
    });

    // Send keepalive heartbeat every 3 seconds
    const heartbeatInterval = setInterval(() => {
      void dispatchEvent('HEARTBEAT', {
        timestamp: Date.now()
      });
    }, 3000);

    return () => {
      clearInterval(heartbeatInterval);
      void dispatchEvent('CLIENT_DISCONNECTED', {
        timestamp: Date.now()
      });
    };
  }, [sessionKey, dispatchEvent]);

  // Handle barcode captured from camera or manual entry
  const handleScan = useCallback(
    async (payload: BarcodeScanPayload) => {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Add to recent local scan history
      setRecentScans((prev) => [
        {
          id: `${payload.rawCode}-${payload.timestamp}`,
          code: payload.rawCode,
          format: payload.format,
          timeString
        },
        ...prev.slice(0, 9)
      ]);

      // Show brief visual feedback toast
      setToastMessage(`Scanned: ${payload.rawCode}`);
      setTimeout(() => setToastMessage(null), 2500);

      // Broadcast to desktop POS terminal if session is active
      if (sessionKey) {
        setBroadcastStatus('STREAMING');
        const scanTimestamp = payload.timestamp || Date.now();
        const entropy =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID().slice(0, 8)
            : Date.now().toString(36);
        const scanId = `${payload.rawCode}-${scanTimestamp}-${entropy}`;
        await dispatchEvent('BARCODE_SCANNED', {
          scanId,
          code: payload.rawCode,
          format: payload.format,
          timestamp: scanTimestamp
        });
        setTimeout(() => {
          setBroadcastStatus('CONNECTED');
        }, 300);
      }
    },
    [sessionKey, dispatchEvent]
  );

  // Get indicator status dot styling
  let statusDotClass = 'bg-warning';
  if (broadcastStatus === 'STREAMING') {
    statusDotClass = 'bg-primary animate-ping';
  } else if (broadcastStatus === 'CONNECTED') {
    statusDotClass = 'bg-success';
  }

  let statusPillText = 'Paired';
  let statusPillClass = 'bg-success-light text-success border-success/30';
  if (broadcastStatus === 'STREAMING') {
    statusPillText = 'Streaming...';
    statusPillClass = 'bg-primary/20 text-primary border-primary/40';
  }

  return (
    <main
      className="relative w-full h-[100dvh] flex flex-col bg-bg-base overflow-hidden select-none"
      data-testid="pos-mobile-scanner-page"
    >
      {/* Sticky Top Header Navigation */}
      <header className="relative z-30 flex items-center justify-between px-4 py-3 bg-bg-surface/90 backdrop-blur-md border-b border-border text-text-primary">
        <div className="flex items-center gap-3">
          <Link
            href="/staff/pos"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-base text-text-muted hover:text-text-primary transition-colors border border-border"
            aria-label="Return to POS Terminal"
          >
            ←
          </Link>
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>📱</span> Mobile POS Scanner
            </span>
            {sessionKey ? (
              <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                Session: {sessionKey.substring(0, 12)}...
              </span>
            ) : (
              <span className="text-[10px] text-text-muted">Standalone Reader Mode</span>
            )}
          </div>
        </div>

        {/* Pairing Pill Status */}
        <div className="flex items-center gap-2">
          {sessionKey ? (
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusPillClass}`}
            >
              {statusPillText}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-bg-base text-text-muted border border-border">
              Offline Mode
            </span>
          )}
        </div>
      </header>

      {/* Full-Screen Camera Scanner Viewport */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <MobileCameraScanner
          onScan={handleScan}
          cooldownMs={1500}
          enableAudio={true}
          enableHaptics={true}
          enableTorch={true}
        />

        {/* Transient Scan Capture Toast */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-bg-surface/95 border border-success/40 text-text-primary text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span className="text-success">✓</span> {toastMessage}
          </div>
        )}
      </div>

      {/* Floating Bottom Action Dock */}
      <footer className="relative z-30 flex flex-col items-center gap-2 px-4 py-3 bg-bg-surface/90 backdrop-blur-md border-t border-border">
        {/* Recent Scanned Code Chip */}
        {recentScans.length > 0 && (
          <div className="w-full max-w-sm flex items-center justify-between px-3 py-1.5 rounded-lg bg-bg-base border border-border text-[11px] font-mono">
            <span className="text-text-muted truncate">Last: <strong className="text-text-primary">{recentScans[0].code}</strong> ({recentScans[0].format})</span>
            <span className="text-text-muted/80 text-[10px] shrink-0 ml-2">{recentScans[0].timeString}</span>
          </div>
        )}

        {/* Manual SKU Entry Button */}
        <button
          type="button"
          onClick={() => setIsManualModalOpen(true)}
          className="w-full max-w-sm py-2.5 px-4 rounded-xl bg-bg-base hover:bg-bg-hover border border-border text-text-primary font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
          data-testid="open-manual-sku-btn"
        >
          <span>⌨️</span> Type SKU Manually
        </button>
      </footer>

      {/* Manual SKU Fallback Bottom Sheet */}
      <ManualSkuModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={(sku) => {
          void handleScan({
            rawCode: sku,
            format: 'MANUAL',
            timestamp: Date.now()
          });
        }}
      />
    </main>
  );
}

export default function MobileScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-[100dvh] flex items-center justify-center bg-bg-base text-text-muted text-xs">
          Loading Scanner...
        </div>
      }
    >
      <MobileScannerContent />
    </Suspense>
  );
}
