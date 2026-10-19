"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Bike,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { MotorcycleModelRecord, Product } from "@/lib/types/product";
import { MotorcycleSelector } from "@/components/motomatcher/motorcycle-selector";
import { ComparisonMatrix } from "@/components/motomatcher/comparison-matrix";
import { SubsystemFilterBar } from "@/components/motomatcher/subsystem-filter-bar";
import { getMotoMatcherFilteredSet } from "@/lib/motomatcher/subsystem-filter";
import type { ComparisonPartItem } from "@/lib/motomatcher/comparison-matrix-contracts";
import { dispatchMotoMatcherCartInsertion } from "@/lib/motomatcher/cart-dispatch";

export interface AdminMotoMatcherClientProps {
  initialModels: MotorcycleModelRecord[];
  initialProducts: Product[];
}

export function AdminMotoMatcherClient({
  initialModels,
  initialProducts,
}: Readonly<AdminMotoMatcherClientProps>) {
  const [selectedModel, setSelectedModel] = useState<MotorcycleModelRecord | null>(
    initialModels.length > 0 ? initialModels[0] : null
  );
  const [isUniversal, setIsUniversal] = useState(false);
  const [systemCategory, setSystemCategory] = useState("ALL");
  const [includeUniversal, setIncludeUniversal] = useState(true);
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning">("success");

  const handleSelectModel = (model: MotorcycleModelRecord | null) => {
    setIsUniversal(false);
    setSelectedModel(model);
  };

  const handleSelectUniversal = () => {
    setIsUniversal(true);
    setSelectedModel(null);
  };

  const filteredSet = useMemo(() => {
    return getMotoMatcherFilteredSet(initialProducts, {
      selectedModel,
      isUniversalPlatform: isUniversal,
      systemCategory,
      includeUniversal,
    });
  }, [initialProducts, selectedModel, isUniversal, systemCategory, includeUniversal]);

  const handleAddToCart = (item: ComparisonPartItem) => {
    const result = dispatchMotoMatcherCartInsertion({ part: item });
    setToastMessage(result.message);
    if (result.success) {
      setAddedSku(item.sku);
      setToastType("success");
      setTimeout(() => setAddedSku(null), 1800);
      setTimeout(() => setToastMessage(null), 3500);
    } else {
      setToastType("warning");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const platformDisplay = useMemo(() => {
    if (isUniversal) {
      return "Universal / Multi-Fit Components";
    }
    if (selectedModel) {
      const yearSpan = selectedModel.year_end ? `-${selectedModel.year_end}` : "+";
      return `${selectedModel.make} ${selectedModel.model} (${selectedModel.displacement_cc}cc • ${selectedModel.year_start}${yearSpan})`;
    }
    return "No Motorcycle Platform Selected";
  }, [isUniversal, selectedModel]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 shadow-xs">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">
              MotoMatcher Compatibility Search
            </h2>
            <p className="text-xs text-text-secondary">
              Motorcycle make, model, displacement selector and OEM vs aftermarket comparison matrix.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-success bg-success-light px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-success/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Live Inventory Verified
          </span>
        </div>
      </div>

      {/* Interactive Visual Motorcycle Selector Engine */}
      <MotorcycleSelector
        models={initialModels}
        selectedModelId={selectedModel?.id}
        onSelectModel={handleSelectModel}
        onSelectUniversal={handleSelectUniversal}
      />

      {/* Subsystem Category & Universal Fitment Filter Bar */}
      <SubsystemFilterBar
        selectedCategory={systemCategory}
        onSelectCategory={setSystemCategory}
        includeUniversal={includeUniversal}
        onToggleUniversal={setIncludeUniversal}
        totalMatches={filteredSet.totalMatches}
        oemCount={filteredSet.oemCount}
        aftermarketCount={filteredSet.aftermarketCount}
      />

      {/* Active Platform Banner */}
      <div className="p-4 bg-bg-surface border border-border rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
            <Bike className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Active Platform Fitment
            </span>
            <h3 className="text-sm font-bold text-text-primary">
              {platformDisplay}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-text-secondary">
            Total Matches: <strong className="text-text-primary font-mono">{filteredSet.totalMatches}</strong>
          </span>
          <span className="text-text-muted">•</span>
          <span className="font-semibold text-primary">
            OEM: <strong className="font-mono">{filteredSet.oemCount}</strong>
          </span>
          <span className="text-text-muted">•</span>
          <span className="font-semibold text-secondary">
            Aftermarket: <strong className="font-mono">{filteredSet.aftermarketCount}</strong>
          </span>
        </div>
      </div>

      {/* Side-by-Side Matrix Comparison Grid */}
      <ComparisonMatrix
        oemParts={filteredSet.oemParts}
        aftermarketParts={filteredSet.aftermarketParts}
        onAddToCart={handleAddToCart}
        addedSku={addedSku}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-bg-surface text-text-primary border border-border shadow-lg rounded-xl animate-in slide-in-from-bottom-2 duration-200"
        >
          {toastType === "success" ? (
            <div className="w-6 h-6 rounded-full bg-success-light text-success flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-danger-light text-danger flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-text-muted hover:text-text-primary ml-2 cursor-pointer"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export const MotoMatcherContainer = AdminMotoMatcherClient;
