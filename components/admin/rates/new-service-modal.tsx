"use client";

import React, { useState, useMemo } from "react";
import { X, Plus, AlertCircle, Lock } from "lucide-react";
import type { CreateLaborServicePayload } from "@/lib/types/service";
import { generateServiceCode } from "@/lib/admin/service-utils";

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateLaborServicePayload) => Promise<boolean>;
  existingCodes?: string[];
}

const STANDARD_BAYS = [
  "Bay 1 / Quick Bay",
  "Bay 2 / Scooter Bay",
  "Bay 3 / Mechanical Bay",
  "Bay 4 / Heavy Repair"
];

export function NewServiceModal({
  isOpen,
  onClose,
  onCreate,
  existingCodes = []
}: NewServiceModalProps) {
  const [name, setName] = useState("");
  const [bay, setBay] = useState(STANDARD_BAYS[0]);
  const [isCustomBay, setIsCustomBay] = useState(false);
  const [customBayText, setCustomBayText] = useState("");
  const [rate, setRate] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate standardized service code (read-only, non-overridable)
  const autoCode = useMemo(() => {
    return generateServiceCode(name, existingCodes);
  }, [name, existingCodes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please specify a service title.");
      return;
    }

    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      setError("Please specify a valid flat rate greater than ₱0.00.");
      return;
    }

    const selectedBay = isCustomBay ? customBayText.trim() : bay;
    if (!selectedBay) {
      setError("Please specify a repair bay assignment.");
      return;
    }

    if (!duration.trim()) {
      setError("Please provide an estimated duration.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onCreate({
        code: autoCode,
        name: name.trim(),
        bay: selectedBay,
        rate: parsedRate,
        duration: duration.trim(),
        description: description.trim() || undefined,
        active: true
      });

      if (success) {
        setName("");
        setRate("");
        setDuration("");
        setDescription("");
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register new workshop service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Register New Workshop Service
              </h3>
              <p className="text-[11px] text-text-muted">
                Add standard flat-rate workshop labor service
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger-light text-danger text-xs flex items-center gap-2 border border-danger/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Service Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Drive Chain Cleaning & Tension Adjustment"
              className="w-full px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-text-muted" />
                  <span>Service Code</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary border border-primary/20">
                  Auto-Generated
                </span>
              </div>
              <input
                type="text"
                value={autoCode}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
                title="Service code is automatically assigned by the system and cannot be edited."
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-bg-surface/50 border border-border rounded-lg text-text-primary cursor-not-allowed select-none outline-hidden opacity-90"
              />
              <p className="text-[10px] text-text-muted mt-1">
                Assigned by system based on title and catalog sequence.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Flat Rate (PHP ₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Repair Bay Allocation
              </label>
              <select
                value={isCustomBay ? "CUSTOM" : bay}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "CUSTOM") {
                    setIsCustomBay(true);
                  } else {
                    setIsCustomBay(false);
                    setBay(val);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
              >
                {STANDARD_BAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="CUSTOM">Custom Repair Bay...</option>
              </select>

              {isCustomBay && (
                <input
                  type="text"
                  value={customBayText}
                  onChange={(e) => setCustomBayText(e.target.value)}
                  placeholder="Enter custom bay..."
                  className="w-full mt-2 px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Estimated Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                placeholder="e.g. 20 mins"
                className="w-full px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of labor work included..."
              className="w-full px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-primary outline-hidden resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-bg-base hover:bg-bg-hover text-text-secondary border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary-hover text-text-light flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Registering..." : "Register Service"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
