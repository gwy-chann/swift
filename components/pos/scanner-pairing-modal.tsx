"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  Wifi
} from "lucide-react";
import { QrCodeSvg } from "./qr-code-svg";
import type {
  ScannerSessionInfo,
  ScannerConnectionState,
  ScannerChannelTelemetry
} from "@/specs/111-pos-terminal-qr-session-pairing/contracts/pos-scanner-channel.contract";

export interface ScannerPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionInfo: ScannerSessionInfo | null;
  connectionState: ScannerConnectionState;
  telemetry: ScannerChannelTelemetry;
  onRegenerateSession: () => void;
}

function StatusBadgeIndicator({
  isConnected,
  isWaiting,
  deviceName
}: {
  isConnected: boolean;
  isWaiting: boolean;
  deviceName?: string;
}) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
        </span>
        <span className="font-semibold text-success">{deviceName || "Phone Connected"}</span>
      </div>
    );
  }
  if (isWaiting) {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning" />
        </span>
        <span className="text-warning font-semibold">Waiting for phone to scan...</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <AlertCircle className="w-4 h-4 text-danger shrink-0" />
      <span className="text-danger font-semibold">Scanner Disconnected</span>
    </div>
  );
}

/**
 * POS Companion Scanner Pairing Modal (SIAA-111)
 * Displays dynamic SVG QR code, live connection status, latency telemetry, and pairing URL.
 */
export function ScannerPairingModal({
  isOpen,
  onClose,
  sessionInfo,
  connectionState,
  telemetry,
  onRegenerateSession
}: ScannerPairingModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyLink = useCallback(async () => {
    if (!sessionInfo?.pairingUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(sessionInfo.pairingUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = sessionInfo.pairingUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("[ScannerPairingModal] Failed to copy pairing URL:", err);
    }
  }, [sessionInfo]);

  if (!isOpen) return null;

  const isConnected = connectionState === "CONNECTED";
  const isWaiting = connectionState === "WAITING_FOR_DEVICE" || connectionState === "CONNECTING";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-pairing-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface text-text-primary shadow-2xl p-6 relative flex flex-col gap-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 id="scanner-pairing-title" className="text-base font-bold text-text-primary">
                Pair Phone Barcode Scanner
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Scan to link mobile web camera to this terminal (Terminal {sessionInfo?.terminalId || "T1"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close pairing modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Handshake Status Badge */}
        <div className="flex items-center justify-between p-3 rounded-lg border text-xs font-medium">
          <StatusBadgeIndicator
            isConnected={isConnected}
            isWaiting={isWaiting}
            deviceName={telemetry.pairedDeviceName}
          />

          {isConnected && (
            <div className="flex items-center gap-1.5 text-text-muted text-2xs font-mono">
              <Wifi className="w-3 h-3 text-success" />
              <span>{telemetry.lastPingLatencyMs ?? 15}ms latency</span>
            </div>
          )}

          {!isConnected && (
            <button
              type="button"
              onClick={onRegenerateSession}
              className="flex items-center gap-1 text-2xs font-medium text-text-muted hover:text-text-primary underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          )}
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-border shadow-inner">
          {sessionInfo?.pairingUrl ? (
            <QrCodeSvg
              value={sessionInfo.pairingUrl}
              size={200}
              fgColor="#0a0a0a"
              bgColor="#ffffff"
            />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-text-muted">
              Generating pairing token...
            </div>
          )}
          <span className="text-2xs text-neutral-500 font-mono mt-2 select-all">
            {sessionInfo?.sessionKey || ""}
          </span>
        </div>

        {/* Pairing Link & Copy Utility */}
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-surface-elevated border border-border text-2xs font-mono text-text-muted truncate select-all">
            {sessionInfo?.pairingUrl || "Generating..."}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!sessionInfo?.pairingUrl}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-white text-xs font-semibold hover:bg-secondary-hover transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="p-3 rounded-lg bg-surface-elevated border border-border text-xs text-text-muted flex flex-col gap-1.5">
          <div className="font-semibold text-text-primary text-2xs uppercase tracking-wider">
            Quick Pairing Instructions
          </div>
          <ol className="list-decimal list-inside space-y-1 text-2xs leading-relaxed">
            <li>Open smartphone camera (iOS Camera or Android Chrome)</li>
            <li>Scan QR code and tap to open companion web app</li>
            <li>Keep camera pointed at inventory barcodes to auto-stream items</li>
          </ol>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border bg-surface-elevated text-xs font-medium text-text-primary hover:bg-border/40 transition-colors cursor-pointer"
          >
            {isConnected ? "Keep Running in Background" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
