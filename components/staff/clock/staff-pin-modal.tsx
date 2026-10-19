"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Lock, X, AlertCircle, Loader2, Delete, RotateCcw } from "lucide-react";
import { verifyStaffPinAction } from "@/lib/staff/actions";
import type { StaffKioskProfile } from "@/lib/staff/types";

interface StaffPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProfile: { id: string; name: string; role?: string; avatarInitials?: string };
  onSuccess: (profile: StaffKioskProfile) => void;
  actionContext?: "clock_in" | "switch_staff" | "clock_out";
}

export function StaffPinModal({
  isOpen,
  onClose,
  targetProfile,
  onSuccess,
  actionContext = "clock_in",
}: StaffPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleClear = useCallback(() => {
    setPin("");
    setError(null);
  }, []);

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, []);

  const handleAppendDigit = useCallback((digit: string) => {
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      return prev + digit;
    });
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (pinToVerify?: string) => {
      const code = pinToVerify ?? pin;
      if (code.length !== 4) {
        setError("PIN must be exactly 4 digits.");
        return;
      }

      setIsVerifying(true);
      setError(null);

      try {
        const result = await verifyStaffPinAction(targetProfile.id, code);
        if (result.success && result.profile) {
          handleClear();
          onSuccess(result.profile);
        } else {
          setError(result.error || "Invalid employee PIN. Please try again.");
          setPin("");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification error. Please retry.");
        setPin("");
      } finally {
        setIsVerifying(false);
      }
    },
    [pin, targetProfile.id, handleClear, onSuccess]
  );

  // Auto-submit when 4th digit is entered
  useEffect(() => {
    if (pin.length === 4 && !isVerifying) {
      handleSubmit(pin);
    }
  }, [pin, isVerifying, handleSubmit]);

  // Physical keyboard support
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key >= "0" && e.key <= "9") {
        handleAppendDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter" && pin.length === 4) {
        handleSubmit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pin, onClose, handleAppendDigit, handleBackspace, handleSubmit]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const actionTitle =
    actionContext === "switch_staff"
      ? "Authenticate Staff Switch"
      : actionContext === "clock_out"
      ? "Confirm Clock-Out Identity"
      : "Terminal Shift Clock-In";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-bg-surface border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2 text-primary">
            <Lock className="w-5 h-5" />
            <span id="pin-modal-title" className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
              {actionTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PIN modal"
            className="p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer rounded-md hover:bg-bg-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Staff Persona Badge */}
        <div className="mb-4 p-3 bg-bg-card border border-border rounded-xl flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-black flex items-center justify-center text-sm">
            {targetProfile.avatarInitials || targetProfile.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">{targetProfile.name}</div>
            <div className="text-xs text-text-muted truncate">{targetProfile.role || "Floor Staff"}</div>
          </div>
        </div>

        <p className="text-xs text-text-secondary mb-4">
          Enter 4-digit PIN for terminal authorization:
        </p>

        {/* Error Feedback Banner */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-2.5 rounded-lg bg-danger-light border border-danger text-danger text-xs font-semibold flex items-center gap-2 text-left"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3.5 mb-6" aria-label="PIN entry indicator">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  isFilled
                    ? "bg-primary border-primary scale-110 shadow-xs"
                    : "border-border bg-bg-input"
                }`}
              />
            );
          })}
        </div>

        {/* Touch Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 max-w-xs mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying}
              onClick={() => handleAppendDigit(digit)}
              className="h-12 rounded-xl bg-bg-card hover:bg-bg-hover active:bg-primary-light border border-border text-base font-bold text-text-primary transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            onClick={handleClear}
            aria-label="Clear PIN"
            className="h-12 rounded-xl bg-bg-card hover:bg-bg-hover text-text-secondary border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleAppendDigit("0")}
            className="h-12 rounded-xl bg-bg-card hover:bg-bg-hover active:bg-primary-light border border-border text-base font-bold text-text-primary transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            0
          </button>

          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            onClick={handleBackspace}
            aria-label="Backspace"
            className="h-12 rounded-xl bg-bg-card hover:bg-bg-hover text-text-secondary border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-40"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Loading Indicator */}
        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary mb-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying employee credentials...</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="flex-1 py-2.5 px-3 bg-bg-card hover:bg-bg-hover text-text-secondary border border-border rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isVerifying || pin.length !== 4}
            className="flex-1 py-2.5 px-3 bg-primary hover:bg-primary-hover text-text-light rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            Verify & Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
