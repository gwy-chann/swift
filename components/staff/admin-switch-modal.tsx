"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, X, Lock, ArrowRight, AlertCircle, KeyRound } from "lucide-react";
import { verifyAdminElevationAction } from "@/lib/staff/actions";

interface AdminSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUsername?: string;
}

export function AdminSwitchModal({
  isOpen,
  onClose,
  targetUsername = "admin@swift.local",
}: AdminSwitchModalProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Focus password input when modal opens and reset state
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError(null);
      setIsSubmitting(false);
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key to safely dismiss modal without state loss (WCAG AA)
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter the administrator password.");
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await verifyAdminElevationAction(password);
      if (!res.success) {
        setError(res.error || "Invalid administrator password.");
        setIsSubmitting(false);
        passwordInputRef.current?.focus();
        return;
      }

      onClose();
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Elevation authorization failed.");
      setIsSubmitting(false);
      passwordInputRef.current?.focus();
    }
  }

  function handleAutofill() {
    setPassword("admin123");
    setError(null);
    passwordInputRef.current?.focus();
  }

  return (
    <div
      id="switchPortalModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="switchPortalTitle"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 id="switchPortalTitle" className="text-sm font-bold text-text-primary">
                Administrator Authorization Required
              </h3>
              <p className="text-[11px] text-text-muted">Master Elevation Guard</p>
            </div>
          </div>
          <button
            type="button"
            id="btnCloseElevationModal"
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Administrative credentials are required to access management analytics, inventory
            adjustments, and system settings.
          </p>

          {/* Target Account (Readonly) */}
          <div className="space-y-1.5">
            <label
              id="switchPortalLabel"
              htmlFor="switchUsernameInput"
              className="block text-xs font-bold text-text-primary uppercase tracking-wider"
            >
              Target Account
            </label>
            <input
              type="text"
              id="switchUsernameInput"
              value={targetUsername}
              readOnly
              className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-xs font-mono text-text-secondary outline-hidden cursor-default"
            />
          </div>

          {/* Master Admin Password Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="switchPasswordInput"
              className="block text-xs font-bold text-text-primary uppercase tracking-wider"
            >
              Enter Master Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                ref={passwordInputRef}
                id="switchPasswordInput"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter Admin Password..."
                className="w-full pl-9 pr-3 py-2.5 bg-bg-input border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-sm text-text-primary placeholder:text-text-muted/60 transition-all outline-hidden"
                autoFocus
              />
            </div>

            {/* Error Message Pill */}
            {error && (
              <div
                id="switchAuthError"
                className="p-3 bg-danger-light text-danger border border-danger/30 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Demo Admin Credential Helper Box */}
          <div className="p-3.5 bg-bg-surface border border-border rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <KeyRound className="w-3.5 h-3.5 text-secondary" />
              <span>Demo Admin Credential:</span>
            </div>
            <p className="text-xs text-text-muted">
              Admin Password:{" "}
              <strong className="text-primary font-mono font-bold">admin123</strong> (or click
              Autofill)
            </p>
            <button
              type="button"
              id="btnAutofillAdminPassword"
              onClick={handleAutofill}
              className="py-1.5 px-3 bg-bg-card hover:bg-bg-hover text-text-secondary border border-border rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              Autofill Admin Password
            </button>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              id="btnCancelElevation"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btnVerifyElevation"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>
                {isSubmitting ? "Verifying & Accessing..." : "Verify & Access Admin Portal"}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
