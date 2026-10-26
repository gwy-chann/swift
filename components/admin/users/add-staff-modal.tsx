"use client";

import React, { useState } from "react";
import { X, UserPlus, Check, AlertCircle, KeyRound, Hash } from "lucide-react";
import type { StaffUserSummary } from "@/specs/030-supabase-rbac-extension-granular-permission-flags/contracts/rbac-permissions.contract";
import { provisionStaffUserAction } from "@/lib/admin/user-actions";

interface AddStaffModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onStaffAdded: (newUser: StaffUserSummary) => void;
}

const ROLE_OPTIONS = [
  { label: "Cashier Privilege", value: "cashier" as const },
  { label: "Mechanic", value: "mechanic" as const },
  { label: "Inventory Clerk", value: "inventory_clerk" as const },
];

type ProvisionableRole = (typeof ROLE_OPTIONS)[number]["value"];

export function AddStaffModal({ isOpen, onClose, onStaffAdded }: Readonly<AddStaffModalProps>) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProvisionableRole>("cashier");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedPin = pin.trim();

    if (!trimmedName || !trimmedEmail) {
      setErrorMsg("Full name and email address are required.");
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters in length.");
      return;
    }

    if (trimmedPin && !/^\d{4,6}$/.test(trimmedPin)) {
      setErrorMsg("PIN must consist of 4 to 6 numeric digits.");
      return;
    }

    const effectivePassword = trimmedPassword || "staff123";
    const effectivePin = trimmedPin || "1234";

    setLoading(true);

    try {
      const result = await provisionStaffUserAction({
        fullName: trimmedName,
        email: trimmedEmail,
        role,
        password: effectivePassword,
        pin: effectivePin,
      });

      if (!result.success || !result.data) {
        setErrorMsg(result.error || "Failed to provision staff account.");
        setLoading(false);
        return;
      }

      onStaffAdded(result.data);
      onClose();
      // Reset state
      setFullName("");
      setEmail("");
      setPassword("");
      setPin("");
      setRole("cashier");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="add-staff-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs border-0 m-0 w-full h-full max-w-none max-h-none animate-fadeIn"
    >
      <div className="bg-bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-staff-modal-title" className="text-base font-bold text-text-primary">
                Provision New Employee
              </h3>
              <p className="text-xs text-text-secondary">
                Configure profile, credentials, and role (Employee ID is assigned automatically)
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
          {errorMsg && (
            <div
              id="add-staff-error-banner"
              data-testid="add-staff-error"
              className="p-3 bg-danger-light border border-danger/30 text-danger rounded-xl text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="staff-full-name" className="block text-xs font-semibold text-text-primary mb-1">
              Full Name
            </label>
            <input
              id="staff-full-name"
              data-testid="input-staff-full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Maria Santos"
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="staff-email" className="block text-xs font-semibold text-text-primary mb-1">
              Store Email Address
            </label>
            <input
              id="staff-email"
              data-testid="input-staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. maria@swift.local"
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Temporary Password & Numeric PIN Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="staff-password" className="flex items-center gap-1 text-xs font-semibold text-text-primary mb-1">
                <KeyRound className="w-3.5 h-3.5 text-text-secondary" />
                <span>Temporary Password</span>
              </label>
              <input
                id="staff-password"
                data-testid="input-staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters (default: staff123)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="staff-pin" className="flex items-center gap-1 text-xs font-semibold text-text-primary mb-1">
                <Hash className="w-3.5 h-3.5 text-text-secondary" />
                <span>Numeric PIN</span>
              </label>
              <input
                id="staff-pin"
                data-testid="input-staff-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4 to 6 numeric digits (default: 1234)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label htmlFor="staff-role" className="block text-xs font-semibold text-text-primary mb-1">
              Operational Role
            </label>
            <select
              id="staff-role"
              data-testid="select-staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as ProvisionableRole)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-muted mt-1.5">
              Role automatically determines system access and default workstation permissions.
            </p>
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
              data-testid="btn-submit-add-staff"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-text-light text-xs font-bold hover:bg-primary-hover shadow-sm transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "Provisioning..." : "Create Staff Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
