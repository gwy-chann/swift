"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Lock, X, AlertCircle, Loader2, Delete, RotateCcw, ChevronDown, Check } from "lucide-react";
import { verifyStaffPinAction } from "@/lib/staff/actions";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/users";
import type { StaffKioskProfile } from "@/lib/staff/types";

interface StaffPinModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly targetProfile: { readonly id: string; readonly name: string; readonly role?: string; readonly avatarInitials?: string };
  readonly onSuccess: (profile: StaffKioskProfile) => void;
  readonly actionContext?: "clock_in" | "switch_staff" | "clock_out" | "login";
}

export function StaffPinModal({
  isOpen,
  onClose,
  targetProfile,
  onSuccess,
  actionContext = "clock_in",
}: Readonly<StaffPinModalProps>) {
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

  const [activeProfile, setActiveProfile] = useState(targetProfile);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPin("");
      setError(null);
      setIsVerifying(false);
      setActiveProfile(targetProfile);
      setIsPickerOpen(false);
    }
  }

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
        const result = await verifyStaffPinAction(activeProfile.id, code);
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
    [pin, activeProfile.id, handleClear, onSuccess]
  );

  const handleAppendDigit = useCallback(
    (digit: string) => {
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          setTimeout(() => {
            void handleSubmit(next);
          }, 0);
        }
        return next;
      });
      setError(null);
    },
    [handleSubmit]
  );

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
        void handleSubmit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pin, onClose, handleAppendDigit, handleBackspace, handleSubmit]);

  if (!isOpen) return null;

  const isClockIn = actionContext === "clock_in";
  let actionTitle = "Terminal Shift Clock-In";
  if (actionContext === "switch_staff") {
    actionTitle = "Authenticate Staff Switch";
  } else if (actionContext === "clock_out") {
    actionTitle = "Confirm Clock-Out Identity";
  } else if (actionContext === "login") {
    actionTitle = "Step 2: Enter Staff PIN";
  }

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs border-0 m-0 w-full h-full max-w-none max-h-none animate-in fade-in duration-150"
    >
      <div className="bg-bg-surface border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2 text-primary">
            {!isClockIn && <Lock className="w-5 h-5" />}
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

        {/* Staff Persona Badge with Inline Switcher */}
        {!isClockIn && (
          <div className="mb-4">
            <div className="p-3 bg-bg-card border border-border rounded-xl flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-black flex items-center justify-center text-sm shrink-0">
                  {activeProfile.avatarInitials || activeProfile.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-text-primary truncate">{activeProfile.name}</div>
                  <div className="text-xs text-text-muted truncate">{activeProfile.role || "Floor Staff"}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen((prev) => !prev)}
                className="text-xs text-primary font-bold hover:underline shrink-0 cursor-pointer px-2 py-1 rounded-md hover:bg-bg-hover flex items-center gap-1 border border-primary/20 bg-primary/5"
              >
                <span>Change</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isPickerOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Quick Roster Selector Popover */}
            {isPickerOpen && (
              <div className="mt-1.5 p-1.5 bg-bg-card border border-border rounded-xl shadow-lg space-y-1 text-left animate-in fade-in zoom-in-95 duration-100">
                {MOCK_STAFF_PROFILES.map((p) => {
                  const isSelected = p.id === activeProfile.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActiveProfile({
                          id: p.id,
                          name: p.name,
                          role: p.roleDisplay,
                          avatarInitials: p.name.split(" ").map((n) => n[0]).join("").toUpperCase(),
                        });
                        setIsPickerOpen(false);
                        setPin("");
                        setError(null);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary-light/50 font-bold text-primary border border-primary/30"
                          : "hover:bg-bg-hover text-text-primary border border-transparent"
                      }`}
                    >
                      <span>{p.name} ({p.roleDisplay})</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
            onClick={() => void handleSubmit()}
            disabled={isVerifying || pin.length !== 4}
            className="flex-1 py-2.5 px-3 bg-primary hover:bg-primary-hover text-text-light rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            Verify & Unlock
          </button>
        </div>
      </div>
    </dialog>
  );
}
