"use client";

import React, { useState } from "react";
import { X, Wrench, AlertCircle, Save } from "lucide-react";
import type { LaborService } from "@/lib/types/service";

interface EditServiceModalProps {
  isOpen: boolean;
  service: LaborService | null;
  onClose: () => void;
  onSave: (
    serviceId: string,
    updates: {
      name?: string;
      bay?: string;
      rate: number;
      duration: string;
      description?: string;
      reason: string;
    }
  ) => Promise<boolean>;
}

const STANDARD_BAYS = [
  "Bay 1 / Quick Bay",
  "Bay 2 / Scooter Bay",
  "Bay 3 / Mechanical Bay",
  "Bay 4 / Heavy Repair"
];

function EditServiceModalContent({
  service,
  onClose,
  onSave
}: Readonly<{
  service: LaborService;
  onClose: () => void;
  onSave: EditServiceModalProps["onSave"];
}>) {
  const isStandardBay = STANDARD_BAYS.includes(service.bay);
  const [name, setName] = useState(service.name);
  const [bay, setBay] = useState(isStandardBay ? service.bay : "CUSTOM");
  const [isCustomBay, setIsCustomBay] = useState(!isStandardBay);
  const [customBayText, setCustomBayText] = useState(isStandardBay ? "" : service.bay);
  const [rate, setRate] = useState(service.rate.toString());
  const [duration, setDuration] = useState(service.duration);
  const [description, setDescription] = useState(service.description || "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRate = Number.parseFloat(rate);
    if (Number.isNaN(parsedRate) || parsedRate <= 0) {
      setError("Please specify a valid flat labor rate greater than ₱0.00.");
      return;
    }

    const selectedBay = isCustomBay ? customBayText.trim() : bay;
    if (!selectedBay) {
      setError("Please specify a repair bay allocation.");
      return;
    }

    if (!duration.trim()) {
      setError("Please provide an estimated service duration.");
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(service.id || service.code, {
        name: name.trim(),
        bay: selectedBay,
        rate: parsedRate,
        duration: duration.trim(),
        description: description.trim() || undefined,
        reason: reason.trim() || "Flat rate schedule adjustment"
      });

      if (success) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update labor service.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-bg-surface flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Edit Workshop Service Rate
            </h3>
            <p className="text-[11px] font-mono text-text-muted">{service.code}</p>
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
            className="w-full px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <p className="text-[10px] text-text-muted mt-1">
              Current rate: ₱{service.rate.toFixed(2)}
            </p>
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
              placeholder="e.g. 45 mins"
              className="w-full px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Repair Bay Assignment
          </label>
          <select
            value={bay}
            onChange={(e) => {
              const val = e.target.value;
              setBay(val);
              setIsCustomBay(val === "CUSTOM");
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
              placeholder="Enter custom bay designation..."
              className="w-full mt-2 px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Adjustment Reason (Audit Ledger)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Consumables price adjustment, new tooling"
            className="w-full px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-primary outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Service Scope & Description
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
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-bg-base hover:bg-bg-hover text-text-secondary border border-border transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary-hover text-text-light flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Rate Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function EditServiceModal({
  isOpen,
  service,
  onClose,
  onSave
}: Readonly<EditServiceModalProps>) {
  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/70 backdrop-blur-xs animate-in fade-in duration-150">
      <EditServiceModalContent
        key={service.id || service.code}
        service={service}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  );
}
