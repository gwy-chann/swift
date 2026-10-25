"use client";

import React, { useState } from "react";
import { X, KeyRound, Check, AlertCircle, ShieldAlert, Hash } from "lucide-react";
import type { StaffUserSummary } from "@/specs/030-supabase-rbac-extension-granular-permission-flags/contracts/rbac-permissions.contract";
import { resetStaffCredentialsAction } from "@/lib/admin/user-actions";

interface ResetCredentialsModalProps {
  isOpen: boolean;
  user: StaffUserSummary | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function ResetCredentialsModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: Readonly<ResetCredentialsModalProps>) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedPassword = password.trim();
    const trimmedPin = pin.trim();

    if (!trimmedPassword) {
      setErrorMsg("New password is required.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters in length.");
      return;
    }

    if (!trimmedPin) {
      setErrorMsg("New numeric PIN is required.");
      return;
    }

    if (!/^\d{4,6}$/.test(trimmedPin)) {
      setErrorMsg("PIN must consist of 4 to 6 numeric digits.");
      return;
    }

    setLoading(true);

    try {
      const result = await resetStaffCredentialsAction({
        userId: user.id,
        password: trimmedPassword,
        pin: trimmedPin,
      });

      if (!result.success) {
        setErrorMsg(result.error || "Failed to reset staff credentials.");
        setLoading(false);
        return;
      }

      onSuccess?.(result.message || `Credentials reset successfully for ${user.fullName}.`);
      onClose();
      // Reset form fields
      setPassword("");
      setPin("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-credentials-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 id="reset-credentials-modal-title" className="text-base font-bold text-text-primary">
                Reset Staff Credentials
              </h3>
              <p className="text-xs text-text-secondary">
                Configure replacement password and terminal PIN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Target User Details Badge */}
          <div className="p-3.5 rounded-xl bg-bg-surface border border-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-text-primary truncate">{user.fullName}</div>
              <div className="text-[11px] text-text-muted truncate">{user.email}</div>
            </div>
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border border-primary/20 bg-primary-light text-primary">
              {user.roleDisplay}
            </span>
          </div>

          {errorMsg && (
            <div
              id="reset-credentials-error-banner"
              data-testid="reset-credentials-error"
              className="p-3 bg-danger-light border border-danger/30 text-danger rounded-xl text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* New Password */}
          <div>
            <label
              htmlFor="reset-password"
              className="block text-xs font-semibold text-text-primary mb-1 flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5 text-text-secondary" />
              <span>New Temporary Password</span>
            </label>
            <input
              id="reset-password"
              data-testid="input-reset-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* New Numeric PIN */}
          <div>
            <label
              htmlFor="reset-pin"
              className="block text-xs font-semibold text-text-primary mb-1 flex items-center gap-1"
            >
              <Hash className="w-3.5 h-3.5 text-text-secondary" />
              <span>New Numeric PIN (4 to 6 Digits)</span>
            </label>
            <input
              id="reset-pin"
              data-testid="input-reset-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="e.g. 1234 or 987654"
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Used for terminal kiosk clock-in and service bay authorization.
            </p>
          </div>

          {/* Security Notice */}
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-text-secondary flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              This operation immediately overwrites the employee&apos;s active password and PIN. An entry will be recorded in the security audit ledger.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="btn-submit-reset-credentials"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "Updating..." : "Reset Credentials"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
