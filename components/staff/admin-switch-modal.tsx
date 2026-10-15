"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, X, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { verifyAdminElevationAction } from "@/lib/staff/actions";

interface AdminSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSwitchModal({ isOpen, onClose }: AdminSwitchModalProps) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) {
      setError("Please enter the Master Admin Security PIN.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await verifyAdminElevationAction(pin);
      if (!res.success) {
        setError(res.error || "Invalid Master Admin PIN. Access denied.");
        setIsSubmitting(false);
        return;
      }

      onClose();
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Elevation authorization failed.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 id="modal-title" className="text-sm font-bold text-text-primary">
                Admin Portal Access
              </h3>
              <p className="text-[11px] text-text-muted">Master Elevation Guard</p>
            </div>
          </div>
          <button
            type="button"
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
            Enter Master Admin PIN or click authorize below to elevate permissions and access inventory management, analytics, and store settings:
          </p>

          {error && (
            <div className="p-3 bg-danger-light text-danger border border-danger/30 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="elevationPinInput"
              className="block text-xs font-bold text-text-primary uppercase tracking-wider"
            >
              Admin Security PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="elevationPinInput"
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••"
                className="w-full pl-9 pr-3 py-2.5 bg-bg-input border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-center tracking-[6px] font-mono text-base text-text-primary placeholder:text-text-muted/40 transition-all outline-hidden"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? "Authorizing..." : "Authorize & Enter"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
