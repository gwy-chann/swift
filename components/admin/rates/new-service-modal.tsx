"use client";

import React, { useState } from "react";
import { X, Plus, AlertCircle } from "lucide-react";
import type { CreateLaborServicePayload } from "@/lib/types/service";

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateLaborServicePayload) => Promise<boolean>;
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
  onCreate
}: NewServiceModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [bay, setBay] = useState(STANDARD_BAYS[0]);
  const [isCustomBay, setIsCustomBay] = useState(false);
  const [customBayText, setCustomBayText] = useState("");
  const [rate, setRate] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setError("Please specify a service code.");
      return;
    }

    if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
      setError("Service code must contain only alphanumeric characters, dashes, or underscores.");
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
        code: normalizedCode,
        name: name.trim(),
        bay: selectedBay,
        rate: parsedRate,
        duration: duration.trim(),
        description: description.trim() || undefined,
        active: true
      });

      if (success) {
        setCode("");
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Service Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                placeholder="e.g. SRV-CHAIN-01"
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
              />
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
