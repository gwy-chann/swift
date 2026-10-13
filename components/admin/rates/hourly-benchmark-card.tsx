"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Calculator,
  Save,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Timer
} from "lucide-react";
import { updatePricingRulesAction } from "@/lib/admin/pricing-actions";
import { calculateProRatedLaborCharge } from "@/lib/admin/pricing-utils";

interface HourlyBenchmarkCardProps {
  initialHourlyRate: number;
  onRateUpdated?: (newRate: number) => void;
}

const PRESET_DURATIONS = [
  { label: "15m", minutes: 15, desc: "Quick Diagnostic" },
  { label: "30m", minutes: 30, desc: "Standard Inspection" },
  { label: "45m", minutes: 45, desc: "Intermediate Bay" },
  { label: "60m (1h)", minutes: 60, desc: "Full Work Unit" },
  { label: "90m (1.5h)", minutes: 90, desc: "Extended Overhaul" },
  { label: "120m (2h)", minutes: 120, desc: "Major Fabrication" }
];

export function HourlyBenchmarkCard({
  initialHourlyRate,
  onRateUpdated
}: HourlyBenchmarkCardProps) {
  const [baseRate, setBaseRate] = useState<number>(initialHourlyRate);
  const [inputRate, setInputRate] = useState<string>(initialHourlyRate.toString());
  const [selectedMinutes, setSelectedMinutes] = useState<number>(60);
  const [customMinutes, setCustomMinutes] = useState<string>("60");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dynamic pro-rated calculation
  const calculatedCharge = useMemo(() => {
    return calculateProRatedLaborCharge(selectedMinutes, baseRate);
  }, [selectedMinutes, baseRate]);

  const durationHours = (selectedMinutes / 60).toFixed(2);

  const handleSaveBaseRate = async () => {
    const parsed = parseFloat(inputRate);
    if (isNaN(parsed) || parsed <= 0) {
      setSaveError("Please enter a valid rate greater than ₱0.00");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const res = await updatePricingRulesAction({
      hourlyLaborRate: parsed,
      userName: "Service Desk Manager"
    });

    setIsSaving(false);

    if (res.success && res.data) {
      setBaseRate(res.data.hourlyLaborRate);
      setSaveSuccess(true);
      if (onRateUpdated) {
        onRateUpdated(res.data.hourlyLaborRate);
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(res.error || "Failed to update hourly labor benchmark");
    }
  };

  const handleSelectPreset = (mins: number) => {
    setSelectedMinutes(mins);
    setCustomMinutes(mins.toString());
  };

  const handleCustomMinutesChange = (val: string) => {
    setCustomMinutes(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedMinutes(parsed);
    }
  };

  const getSaveButtonContent = () => {
    if (isSaving) {
      return <span className="animate-spin text-xs">...</span>;
    }
    if (saveSuccess) {
      return (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          <span>Saved</span>
        </>
      );
    }
    return (
      <>
        <Save className="w-3.5 h-3.5" />
        <span>Save Benchmark</span>
      </>
    );
  };

  return (
    <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Panel Card Header */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Standard Hourly Labor Rate Benchmark & Dynamic Bay Estimator
            </h3>
            <p className="text-xs text-text-secondary">
              Shop baseline rate for unlisted diagnostic jobs and dynamic time-pro-rated bay estimations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-text-muted flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Formula: (Minutes ÷ 60) × Base Rate
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Base Rate Configuration */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 bg-bg-card border border-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">
                Shop Base Hourly Rate (₱ / hour)
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary-light text-primary border border-primary/20">
                Active: ₱{baseRate.toFixed(2)}/hr
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-text-muted">
                  ₱
                </span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={inputRate}
                  onChange={(e) => setInputRate(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-bold bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
                  placeholder="450.00"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveBaseRate}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary-hover text-text-light shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {getSaveButtonContent()}
              </button>
            </div>

            {saveError && (
              <p className="text-[11px] font-semibold text-danger">{saveError}</p>
            )}

            <p className="text-[11px] text-text-muted leading-relaxed">
              Applied automatically when calculating custom technician bay fabrication or exploratory repair charges.
            </p>
          </div>
        </div>

        {/* Right Column: Dynamic Pro-Rated Bay Estimator */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <Timer className="w-4 h-4 text-primary" />
              <span>Dynamic Technician Bay Duration Estimator</span>
            </div>
            <span className="text-[11px] font-mono text-text-secondary">
              Selected: {selectedMinutes} mins ({durationHours} hrs)
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESET_DURATIONS.map((preset) => {
              const isSelected = selectedMinutes === preset.minutes;
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => handleSelectPreset(preset.minutes)}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary-light border-primary text-primary shadow-xs ring-1 ring-primary/30"
                      : "bg-bg-card border-border hover:bg-bg-hover text-text-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono">{preset.label}</span>
                    <Clock className="w-3 h-3 text-text-muted" />
                  </div>
                  <span className="text-[10px] text-text-muted block mt-0.5 truncate">
                    {preset.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Minute Input & Output Display */}
          <div className="p-3 bg-bg-card border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">
                Custom Duration:
              </span>
              <div className="relative w-28">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={customMinutes}
                  onChange={(e) => handleCustomMinutesChange(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-muted pointer-events-none">
                  min
                </span>
              </div>
            </div>

            {/* Calculated Fee Result */}
            <div className="flex items-center justify-end gap-3">
              <div className="text-right">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block">
                  Pro-Rated Quote
                </span>
                <span className="text-lg font-mono font-black text-primary">
                  ₱{calculatedCharge.toFixed(2)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
