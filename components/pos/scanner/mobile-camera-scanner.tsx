'use client';

import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type {
  BarcodeScanPayload,
  MobileCameraScannerProps,
  ScannerStatus
} from '@/specs/110-pos-mobile-companion-scanner/contracts/barcode-scanner.contract';
import { SCANNER_CONSTANTS } from '@/specs/110-pos-mobile-companion-scanner/contracts/barcode-scanner.contract';
import { ScannerViewfinderOverlay } from './scanner-viewfinder-overlay';
import {
  playScanCaptureBeep,
  triggerSuccessHaptic,
  unlockAudioContext
} from '@/lib/pos/scanner-feedback';

const DEFAULT_FORMATS_TO_SUPPORT = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE
];

function mapBarcodeFormat(decodedResult: { result?: { format?: { formatName?: string } } }): string {
  const formatName = decodedResult?.result?.format?.formatName;
  if (!formatName) return 'UNKNOWN';
  const upper = formatName.toUpperCase().replace(/\s+/g, '_');
  if (upper.includes('QR')) return 'QR_CODE';
  if (upper.includes('EAN_13')) return 'EAN_13';
  if (upper.includes('EAN_8')) return 'EAN_8';
  if (upper.includes('UPC_A')) return 'UPC_A';
  if (upper.includes('UPC_E')) return 'UPC_E';
  if (upper.includes('CODE_128')) return 'CODE_128';
  if (upper.includes('CODE_39')) return 'CODE_39';
  return upper;
}

function parseCameraError(err: unknown): { status: ScannerStatus; message: string } {
  const errStr = String(err);
  if (
    errStr.includes('NotAllowedError') ||
    errStr.includes('Permission denied') ||
    errStr.includes('PermissionDismissedError')
  ) {
    return {
      status: 'PERMISSION_DENIED',
      message: 'Camera access was denied. Please allow camera permissions in browser settings.'
    };
  }
  if (
    errStr.includes('NotFoundError') ||
    errStr.includes('DevicesNotFoundError')
  ) {
    return {
      status: 'UNAVAILABLE',
      message: 'No compatible rear camera found on this device.'
    };
  }
  return {
    status: 'ERROR',
    message: `Failed to start camera: ${errStr}`
  };
}

export function MobileCameraScanner({
  onScan,
  onError,
  cooldownMs = SCANNER_CONSTANTS.COOLDOWN_MS,
  facingMode = 'environment',
  enableAudio = true,
  enableHaptics = true,
  enableTorch = true,
  className = ''
}: Readonly<MobileCameraScannerProps>) {
  const reactId = useId();
  const containerId = `html5qr-region-${reactId.replace(/:/g, '')}`;

  const [status, setStatus] = useState<ScannerStatus>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [isTorchActive, setIsTorchActive] = useState<boolean>(false);
  const [pulseState, setPulseState] = useState<'idle' | 'success' | 'danger'>('idle');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isThrottledRef = useRef<boolean>(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Safe callback trigger for scanned barcodes
  const handleDecodedText = useCallback(
    (decodedText: string, decodedResult: unknown) => {
      if (isThrottledRef.current) {
        return; // Suppress duplicate consecutive frames during cooldown
      }

      const rawCode = decodedText?.trim();
      if (!rawCode) return;

      // Lock throttle gate
      isThrottledRef.current = true;
      setPulseState('success');

      // Zero-asset Web Audio synthesis & haptic pulse
      if (enableAudio) {
        playScanCaptureBeep(null, SCANNER_CONSTANTS.AUDIO_BEEP_FREQ_HZ, 0.08);
      }
      if (enableHaptics) {
        triggerSuccessHaptic();
      }

      const payload: BarcodeScanPayload = {
        rawCode,
        format: mapBarcodeFormat(decodedResult as { result?: { format?: { formatName?: string } } }) as BarcodeScanPayload['format'],
        timestamp: Date.now()
      };

      onScan(payload);

      // Reset throttle lock after cooldown interval (default 1500ms)
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
      cooldownTimerRef.current = setTimeout(() => {
        isThrottledRef.current = false;
      }, cooldownMs);
    },
    [enableAudio, enableHaptics, cooldownMs, onScan]
  );

  // Initialize camera scanner
  const startScanner = useCallback(async () => {
    // Yield to avoid synchronous setState inside render effect
    await Promise.resolve();
    setErrorMessage(null);

    // Warm audio context on initiation
    void unlockAudioContext();

    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setStatus('UNAVAILABLE');
      setErrorMessage('Camera access is not supported on this device/browser.');
      onError?.('Camera API unsupported');
      return;
    }

    // Cleanup existing instance if any
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch {
        // Ignore cleanup errors during re-init
      }
    }

    try {
      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: DEFAULT_FORMATS_TO_SUPPORT,
        verbose: false
      });
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: { exact: facingMode } },
        {
          fps: SCANNER_CONSTANTS.DEFAULT_FPS,
          videoConstraints: {
            facingMode
          }
        },
        handleDecodedText,
        () => {
          // Ignore transient per-frame decode misses
        }
      );

      setStatus('SCANNING');

      // Check for hardware torch capability
      if (enableTorch) {
        try {
          const stream = scanner.getRunningTrackCameraCapabilities();
          if (stream?.torchFeature()?.isSupported()) {
            setTorchSupported(true);
          }
        } catch {
          // Hardware torch unsupported on this device
          setTorchSupported(false);
        }
      }
    } catch (err) {
      console.debug('Primary exact camera constraint failed, trying fallback mode:', err);
      // Fallback: try standard non-exact facingMode
      try {
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: DEFAULT_FORMATS_TO_SUPPORT,
          verbose: false
        });
        html5QrCodeRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: SCANNER_CONSTANTS.DEFAULT_FPS
          },
          handleDecodedText,
          () => {}
        );
        setStatus('SCANNING');
      } catch (fallbackErr) {
        const parsed = parseCameraError(fallbackErr);
        setStatus(parsed.status);
        setErrorMessage(parsed.message);
        onError?.(parsed.message);
      }
    }
  }, [containerId, facingMode, enableTorch, handleDecodedText, onError]);

  // Toggle hardware torch
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    try {
      const nextTorch = !isTorchActive;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as unknown as MediaTrackConstraintSet]
      });
      setIsTorchActive(nextTorch);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  useEffect(() => {
    let unmounted = false;

    // Start camera asynchronously after mounting
    const timer = setTimeout(() => {
      if (!unmounted) {
        void startScanner();
      }
    }, 0);

    return () => {
      unmounted = true;
      clearTimeout(timer);
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        if (scanner.isScanning) {
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => {});
        } else {
          try {
            scanner.clear();
          } catch {
            // Safe cleanup
          }
        }
      }
    };
  }, [startScanner]);

  let statusTitle = 'Camera Error';
  if (status === 'PERMISSION_DENIED') {
    statusTitle = 'Camera Access Required';
  } else if (status === 'UNAVAILABLE') {
    statusTitle = 'Camera Unavailable';
  }

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none ${className}`}
      data-testid="mobile-camera-scanner"
      data-scanner-status={status}
      onClick={() => void unlockAudioContext()}
    >
      {/* HTML5-QRCode Video Feed Mount Region */}
      <div
        id={containerId}
        className="absolute inset-0 w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
      />

      {/* Target Reticle Viewfinder with Animated Pulse State */}
      {status === 'SCANNING' && (
        <ScannerViewfinderOverlay
          pulseState={pulseState}
          onPulseEnd={() => setPulseState('idle')}
        />
      )}

      {/* Torch Toggle Pill (Floating Top-Right when supported) */}
      {status === 'SCANNING' && torchSupported && (
        <button
          type="button"
          onClick={toggleTorch}
          className={`absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all ${
            isTorchActive
              ? 'bg-accent text-white border-accent shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              : 'bg-bg-surface/90 text-text-primary border-border hover:bg-bg-hover'
          }`}
          aria-label={isTorchActive ? 'Turn off flashlight' : 'Turn on flashlight'}
          data-testid="torch-toggle-btn"
        >
          <span aria-hidden="true">{isTorchActive ? '🔦 ON' : '🔦 OFF'}</span>
        </button>
      )}

      {/* Permission Denied / Error / Unavailable Fallback Screen */}
      {(status === 'PERMISSION_DENIED' || status === 'UNAVAILABLE' || status === 'ERROR') && (
        <div
          className="relative z-30 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto bg-bg-surface/95 backdrop-blur-md rounded-2xl border border-border shadow-2xl text-text-primary"
          data-testid="camera-error-screen"
        >
          <div className="w-14 h-14 rounded-full bg-danger-light text-danger flex items-center justify-center text-2xl mb-3">
            📷
          </div>
          <h3 className="text-base font-bold mb-1">
            {statusTitle}
          </h3>
          <p className="text-xs text-text-muted mb-5 leading-relaxed">
            {errorMessage || 'Unable to initialize device camera.'}
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              type="button"
              onClick={() => {
                setStatus('INITIALIZING');
                void startScanner();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-text-inverse font-semibold text-xs hover:bg-primary-hover transition-colors"
            >
              🔄 Retry Camera Connection
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {status === 'INITIALIZING' && (
        <div className="relative z-20 flex flex-col items-center gap-3 text-text-inverse">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wide">Starting Camera Viewfinder...</span>
        </div>
      )}
    </div>
  );
}
