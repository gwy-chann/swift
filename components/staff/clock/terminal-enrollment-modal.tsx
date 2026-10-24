"use client";

import React, { useState } from "react";
import { Laptop, ShieldCheck, X, AlertCircle, KeyRound, RefreshCw } from "lucide-react";
import {
  enrollTerminalDeviceAction,
  resetTerminalDeviceAction,
} from "@/lib/terminal/actions";
import {
  setStoredTerminalDeviceToken,
  clearStoredTerminalDeviceToken,
  DEFAULT_PRIMARY_TERMINAL_ID,
  DEFAULT_PRIMARY_DEVICE_NAME,
} from "@/lib/terminal/device-binding";
import type { TerminalDevice } from "@/lib/terminal/types";

interface TerminalEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (device: TerminalDevice) => void;
  currentDevice?: TerminalDevice | null;
}

export function TerminalEnrollmentModal({
  isOpen,
  onClose,
  onSuccess,
  currentDevice,
}: TerminalEnrollmentModalProps) {
  const [terminalId, setTerminalId] = useState(
    currentDevice?.terminalId || DEFAULT_PRIMARY_TERMINAL_ID
  );
  const [deviceName, setDeviceName] = useState(
    currentDevice?.deviceName || DEFAULT_PRIMARY_DEVICE_NAME
  );
  const [masterPin, setMasterPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!masterPin || masterPin.length < 4) {
      setError("Please enter a valid Master Admin PIN (e.g. 8888).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await enrollTerminalDeviceAction(
        masterPin,
        terminalId,
        deviceName
      );

      if (res.success && res.token) {
        const enrolled = setStoredTerminalDeviceToken(
          res.token,
          res.terminalId,
          res.deviceName
        );
        onSuccess(enrolled);
        onClose();
      } else {
        setError(res.error || "Device enrollment rejected. Verify Master PIN.");
      }
    } catch (err) {
      console.error("[TerminalEnrollmentModal] Error:", err);
      setError("An unexpected error occurred during enrollment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetBinding() {
    if (!masterPin || masterPin.length < 4) {
      setError("Enter Master Admin PIN (8888) to confirm unenrollment/reset.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await resetTerminalDeviceAction(masterPin);
      if (res.success) {
        clearStoredTerminalDeviceToken();
        setError(null);
        onClose();
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        setError(res.error || "Failed to reset terminal device binding.");
      }
    } catch (err) {
      console.error("[TerminalEnrollmentModal] Reset error:", err);
      setError("An unexpected error occurred during terminal reset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminal-enrollment-title"
    >
      <div className="bg-bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="terminal-enrollment-title"
                className="text-base font-bold text-text-primary"
              >
                Terminal Device Binding
              </h2>
              <p className="text-xs text-text-muted">
                Authorize physical counter laptop or shop tablet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-lg bg-danger-light border border-danger text-danger text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="terminal-id"
              className="block text-xs font-semibold text-text-primary uppercase tracking-wider"
            >
              Terminal Designation
            </label>
            <select
              id="terminal-id"
              value={terminalId}
              onChange={(e) => setTerminalId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:outline-hidden focus:border-border-focus"
            >
              <option value="Terminal #01">Terminal #01 - Primary Sales Counter</option>
              <option value="Terminal #02">Terminal #02 - Service Bay Station</option>
              <option value="Terminal #03">Terminal #03 - Mobile Warehouse Tablet</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="device-name"
              className="block text-xs font-semibold text-text-primary uppercase tracking-wider"
            >
              Device Friendly Name
            </label>
            <input
              id="device-name"
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Primary Counter Laptop"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:outline-hidden focus:border-border-focus placeholder:text-text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="master-pin"
                className="block text-xs font-semibold text-text-primary uppercase tracking-wider"
              >
                Master Admin PIN
              </label>
              <span className="text-[11px] text-text-muted">Demo: 8888</span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input
                id="master-pin"
                type="password"
                maxLength={8}
                value={masterPin}
                onChange={(e) => setMasterPin(e.target.value)}
                placeholder="Enter 4-digit master PIN"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-border bg-bg-input text-text-primary text-sm focus:outline-hidden focus:border-border-focus tracking-widest placeholder:tracking-normal placeholder:text-text-muted"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-text-light text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? "Authorizing..." : "Authorize & Enroll Device"}</span>
            </button>

            {currentDevice?.isAuthorized && (
              <button
                type="button"
                onClick={handleResetBinding}
                disabled={isSubmitting}
                className="w-full py-2 px-3 rounded-lg border border-border hover:bg-bg-hover text-text-muted hover:text-danger text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Device Binding (Simulate Remote Device)</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
