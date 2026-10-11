"use client";

import React, { useState } from "react";
import {
  Percent,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Tag,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { updatePricingRulesAction } from "@/lib/admin/pricing-actions";
import type { PricingRules } from "@/lib/types/pricing";

interface GlobalMarkupCardProps {
  initialRules?: PricingRules;
  onRulesUpdated?: (updatedRules: PricingRules) => void;
}

export function GlobalMarkupCard({
  initialRules,
  onRulesUpdated
}: GlobalMarkupCardProps) {
  const [retailInput, setRetailInput] = useState<string>(
    initialRules?.retailMarkup?.toString() ?? "35"
  );
  const [wholesaleInput, setWholesaleInput] = useState<string>(
    initialRules?.wholesaleMarkup?.toString() ?? "18"
  );
  const [aftermarketInput, setAftermarketInput] = useState<string>(
    initialRules?.aftermarketMarkup?.toString() ?? "40"
  );
  const [reasonInput, setReasonInput] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [prevInitialRules, setPrevInitialRules] = useState(initialRules);
  if (initialRules && initialRules !== prevInitialRules) {
    setPrevInitialRules(initialRules);
    setRetailInput(initialRules.retailMarkup.toString());
    setWholesaleInput(initialRules.wholesaleMarkup.toString());
    setAftermarketInput(initialRules.aftermarketMarkup.toString());
  }

  const parsedRetail = parseFloat(retailInput);
  const parsedWholesale = parseFloat(wholesaleInput);
  const parsedAftermarket = parseFloat(aftermarketInput);

  // Live simulation with benchmark item cost: ₱1,000.00
  const sampleCost = 1000;
  const simRetailPrice = !isNaN(parsedRetail)
    ? sampleCost * (1 + parsedRetail / 100)
    : 0;
  const simWholesalePrice = !isNaN(parsedWholesale)
    ? sampleCost * (1 + parsedWholesale / 100)
    : 0;
  const simAftermarketPrice = !isNaN(parsedAftermarket)
    ? sampleCost * (1 + parsedAftermarket / 100)
    : 0;

  const handleSaveMarkupRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (isNaN(parsedRetail) || parsedRetail <= 0 || parsedRetail > 200) {
      setSaveError("Retail markup must be greater than 0% and cannot exceed 200%");
      return;
    }

    if (isNaN(parsedWholesale) || parsedWholesale <= 0 || parsedWholesale > 200) {
      setSaveError("Wholesale markup must be greater than 0% and cannot exceed 200%");
      return;
    }

    if (isNaN(parsedAftermarket) || parsedAftermarket <= 0 || parsedAftermarket > 200) {
      setSaveError("Aftermarket markup must be greater than 0% and cannot exceed 200%");
      return;
    }

    setIsSaving(true);

    try {
      const res = await updatePricingRulesAction({
        retailMarkup: parsedRetail,
        wholesaleMarkup: parsedWholesale,
        aftermarketMarkup: parsedAftermarket,
        reason: reasonInput.trim() || undefined,
        userName: "Admin Manager"
      });

      if (res.success && res.data) {
        setSaveSuccess(true);
        onRulesUpdated?.(res.data);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setSaveError(res.error || "Failed to update pricing rules");
      }
    } catch {
      setSaveError("An unexpected network error occurred while updating markup rules");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-surface/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center text-primary border border-primary-border">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              Global Parts Markup Rules
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success-light text-success border border-success/20">
                Live Broadcast
              </span>
            </h3>
            <p className="text-xs text-text-secondary">
              Centralized margin baseline for retail, wholesale, and racing aftermarket parts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>RLS Enforced • Singleton Table</span>
        </div>
      </div>

      <form onSubmit={handleSaveMarkupRules} className="p-4 sm:p-5 space-y-5">
        {/* Alerts */}
        {saveSuccess && (
          <div className="p-3 bg-success-light border border-success/30 rounded-lg flex items-center gap-2.5 text-xs text-success font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Global pricing markup rules saved and broadcast to all POS and Inventory terminals!
            </span>
          </div>
        )}

        {saveError && (
          <div className="p-3 bg-danger-light border border-danger/30 rounded-lg flex items-center gap-2.5 text-xs text-danger font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Standard Retail Markup */}
          <div className="p-3.5 bg-bg-base border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="retail-markup-input"
                className="text-xs font-bold text-text-primary flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-primary" />
                Standard Retail Markup (%)
              </label>
              <span className="text-[10px] font-semibold text-text-muted">OEM Tier</span>
            </div>
            <div className="relative">
              <input
                id="retail-markup-input"
                type="number"
                step="0.01"
                min="0.01"
                max="200"
                value={retailInput}
                onChange={(e) => setRetailInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
                placeholder="35"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">
                %
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-tight">
              Applied to standard OEM replacement parts (Honda, Yamaha, Suzuki genuine).
            </p>
          </div>

          {/* Wholesale / Reseller Markup */}
          <div className="p-3.5 bg-bg-base border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="wholesale-markup-input"
                className="text-xs font-bold text-text-primary flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-secondary" />
                Wholesale / Reseller Markup (%)
              </label>
              <span className="text-[10px] font-semibold text-text-muted">Bulk Tier</span>
            </div>
            <div className="relative">
              <input
                id="wholesale-markup-input"
                type="number"
                step="0.01"
                min="0.01"
                max="200"
                value={wholesaleInput}
                onChange={(e) => setWholesaleInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
                placeholder="18"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">
                %
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-tight">
              Applied when POS pricing mode is toggled to Wholesale for partner shops.
            </p>
          </div>

          {/* Performance Aftermarket Markup */}
          <div className="p-3.5 bg-bg-base border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="aftermarket-markup-input"
                className="text-xs font-bold text-text-primary flex items-center gap-1.5"
              >
                <Percent className="w-3.5 h-3.5 text-accent" />
                Performance Aftermarket Markup (%)
              </label>
              <span className="text-[10px] font-semibold text-text-muted">Tuning Tier</span>
            </div>
            <div className="relative">
              <input
                id="aftermarket-markup-input"
                type="number"
                step="0.01"
                min="0.01"
                max="200"
                value={aftermarketInput}
                onChange={(e) => setAftermarketInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-bg-input border border-border rounded-lg text-text-primary focus:border-primary outline-hidden"
                placeholder="40"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">
                %
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-tight">
              Applied to racing & performance upgrades (RCB, Uma Racing, JVT, Koso).
            </p>
          </div>
        </div>

        {/* Live Simulation Preview Cards */}
        <div className="p-3.5 bg-bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              Live Price Formula Simulation (Sample ₱1,000.00 Base Cost)
            </span>
            <span className="text-[11px] text-text-muted">
              Formula: Cost × (1 + Markup%)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-2.5 bg-bg-surface border border-border rounded-lg text-center">
              <div className="text-[11px] text-text-secondary font-medium">Retail Price</div>
              <div className="text-lg font-black font-mono text-primary">
                ₱{simRetailPrice.toFixed(2)}
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                +₱{(simRetailPrice - sampleCost).toFixed(2)} margin
              </div>
            </div>

            <div className="p-2.5 bg-bg-surface border border-border rounded-lg text-center">
              <div className="text-[11px] text-text-secondary font-medium">Wholesale Price</div>
              <div className="text-lg font-black font-mono text-secondary">
                ₱{simWholesalePrice.toFixed(2)}
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                +₱{(simWholesalePrice - sampleCost).toFixed(2)} margin
              </div>
            </div>

            <div className="p-2.5 bg-bg-surface border border-border rounded-lg text-center">
              <div className="text-[11px] text-text-secondary font-medium">Aftermarket Price</div>
              <div className="text-lg font-black font-mono text-accent">
                ₱{simAftermarketPrice.toFixed(2)}
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                +₱{(simAftermarketPrice - sampleCost).toFixed(2)} margin
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="w-full sm:w-auto">
            <input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Optional audit reason (e.g., Supplier rate adjustment)..."
              className="w-full sm:w-80 px-3 py-2 text-xs bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-primary outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-hover text-text-light font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Markup Rules...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Markup Rules</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
