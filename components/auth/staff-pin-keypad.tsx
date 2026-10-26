"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Delete,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { completeStaffTwoStepLoginAction } from "@/lib/auth/actions";
import { punchStore } from "@/lib/store/punch-store";
import type { PendingStaffSummary } from "@/lib/auth/types";
import { useRouter } from "next/navigation";

interface StaffPinKeypadProps {
  staffSummary: PendingStaffSummary;
  rememberTerminal: boolean;
  onBack: () => void;
}

export function StaffPinKeypad({
  staffSummary,
  rememberTerminal,
  onBack,
}: Readonly<StaffPinKeypadProps>) {
  const router = useRouter();
  const [pin, setPin] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAppendDigit = useCallback(
    (digit: string) => {
      if (isVerifying) return;
      setErrorMessage(null);
      setPin((prev) => (prev.length < 4 ? prev + digit : prev));
    },
    [isVerifying]
  );

  const handleBackspace = useCallback(() => {
    if (isVerifying) return;
    setErrorMessage(null);
    setPin((prev) => prev.slice(0, -1));
  }, [isVerifying]);

  const handleClear = useCallback(() => {
    if (isVerifying) return;
    setErrorMessage(null);
    setPin("");
  }, [isVerifying]);

  const handleVerifyPin = useCallback(async () => {
    if (isVerifying) return;
    if (pin.length !== 4) {
      setErrorMessage("PIN must consist of 4 numeric digits.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const result = await completeStaffTwoStepLoginAction({
        pin,
        rememberTerminal,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsVerifying(false);
        setPin("");
        return;
      }

      // Sync active staff in punchStore for terminal compatibility (starts off-shift, waiting for user to time in)
      if (staffSummary.userId) {
        punchStore.switchStaff({
          id: staffSummary.userId,
          name: staffSummary.name,
          role: staffSummary.role,
          startOffShift: true,
        });
      }

      router.push(result.redirectTo || staffSummary.targetUrl || "/staff/pos");
    } catch (err) {
      console.error("PIN verification error:", err);
      setErrorMessage("An unexpected verification error occurred. Please try again.");
      setIsVerifying(false);
      setPin("");
    }
  }, [isVerifying, pin, rememberTerminal, router, staffSummary]);

  // Physical keyboard support
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isVerifying) return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleAppendDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (pin.length === 4) {
          handleVerifyPin();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAppendDigit, handleBackspace, handleClear, handleVerifyPin, isVerifying, pin.length]);

  return (
    <div className="space-y-4 animate-fadeIn" data-testid="staff-pin-keypad-view">
      {/* Staff Verification Banner */}
      <div className="p-3.5 rounded-lg bg-bg-base border border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary-light border border-secondary text-secondary flex items-center justify-center font-bold text-sm">
            {staffSummary.name
              ? staffSummary.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "ST"}
          </div>
          <div>
            <div className="text-xs font-semibold text-text-primary">
              {staffSummary.name}
            </div>
            <div className="text-[11px] font-medium text-text-secondary capitalize">
              {staffSummary.roleDisplay || staffSummary.role.replace("_", " ")} • Step 2 of 2
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          disabled={isVerifying}
          className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch</span>
        </button>
      </div>

      {/* Instructional Label */}
      <div className="text-center">
        <h2 className="text-sm font-bold text-text-primary">
          Enter Your Staff PIN
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Type your 4-digit security PIN on the keypad
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3 rounded-md bg-danger-light border border-danger text-danger text-xs flex items-start gap-2 animate-fadeIn"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Visual PIN Dot Mask */}
      <div
        className="flex items-center justify-center gap-2.5 py-2.5"
        aria-label={`PIN entered: ${pin.length} digits`}
      >
        {[0, 1, 2, 3].map((index) => {
          const isFilled = pin.length > index;
          return (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                isFilled
                  ? "bg-secondary border-secondary scale-110 shadow-xs"
                  : "border-border bg-bg-input"
              }`}
            />
          );
        })}
      </div>

      {/* Touch Numeric Keypad */}
      <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={isVerifying}
            onClick={() => handleAppendDigit(digit)}
            className="h-12 rounded-xl bg-bg-base hover:bg-bg-hover active:bg-secondary-light border border-border text-base font-bold text-text-primary transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 select-none"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          disabled={isVerifying || pin.length === 0}
          onClick={handleClear}
          aria-label="Clear PIN"
          className="h-12 rounded-xl bg-bg-base hover:bg-bg-hover text-text-secondary border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-40 select-none"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={isVerifying}
          onClick={() => handleAppendDigit("0")}
          className="h-12 rounded-xl bg-bg-base hover:bg-bg-hover active:bg-secondary-light border border-border text-base font-bold text-text-primary transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 select-none"
        >
          0
        </button>

        <button
          type="button"
          disabled={isVerifying || pin.length === 0}
          onClick={handleBackspace}
          aria-label="Backspace"
          className="h-12 rounded-xl bg-bg-base hover:bg-bg-hover text-text-secondary border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-40 select-none"
        >
          <Delete className="w-4 h-4" />
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="button"
        disabled={isVerifying || pin.length !== 4}
        onClick={handleVerifyPin}
        className={`w-full mt-2 py-3 px-4 rounded-md font-bold text-sm text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm bg-secondary hover:bg-secondary-hover active:scale-[0.99] ${
          isVerifying || pin.length !== 4 ? "opacity-75 cursor-not-allowed" : ""
        }`}
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Authorizing Workshop Terminal...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            <span>Authorize & Access Terminal</span>
          </>
        )}
      </button>

      {/* Return to Step 1 Action */}
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={isVerifying}
          className="text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          ← Return to email & password
        </button>
      </div>
    </div>
  );
}
