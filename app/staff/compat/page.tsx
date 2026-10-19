"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CheckCircle2, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { getProductsAction } from "@/lib/admin/product-actions";
import { getMotorcycleModelsAction } from "@/lib/motomatcher/actions";
import { useMotoMatcherRealtime } from "@/lib/hooks/use-motomatcher-realtime";
import type { MotorcycleModelRecord } from "@/lib/types/product";
import { MOCK_MOTORCYCLE_MODEL_RECORDS } from "@/lib/mock-data/motorcycles";
import { MotorcycleSelector } from "@/components/motomatcher/motorcycle-selector";
import { ComparisonMatrix } from "@/components/motomatcher/comparison-matrix";
import { SubsystemFilterBar } from "@/components/motomatcher/subsystem-filter-bar";
import { getMotoMatcherFilteredSet } from "@/lib/motomatcher/subsystem-filter";
import type { ComparisonPartItem } from "@/lib/motomatcher/comparison-matrix-contracts";
import { dispatchMotoMatcherCartInsertion } from "@/lib/motomatcher/cart-dispatch";

function renderSyncStatus(isConnected: boolean, status: string) {
  if (isConnected) {
    return (
      <span className="text-xs font-bold text-success bg-success-light px-2.5 py-0.5 rounded-full border border-success/20 flex items-center gap-1.5">
        <Wifi className="w-3 h-3 text-success animate-pulse" />
        Live Realtime Sync
      </span>
    );
  }
  if (status === "CONNECTING") {
    return (
      <span className="text-xs font-bold text-accent bg-accent-light px-2.5 py-0.5 rounded-full border border-accent/20 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
        Connecting...
      </span>
    );
  }
  return (
    <span className="text-xs font-bold text-text-muted bg-bg-muted px-2.5 py-0.5 rounded-full border border-border flex items-center gap-1.5">
      <WifiOff className="w-3 h-3 text-text-muted" />
      Offline Mode
    </span>
  );
}

export default function StaffCompatPage() {
  const [motorcycleModels, setMotorcycleModels] = useState<MotorcycleModelRecord[]>(
    MOCK_MOTORCYCLE_MODEL_RECORDS
  );
  const [selectedModel, setSelectedModel] = useState<MotorcycleModelRecord | null>(
    MOCK_MOTORCYCLE_MODEL_RECORDS[0]
  );
  const [isUniversal, setIsUniversal] = useState(false);
  const [systemCategory, setSystemCategory] = useState("ALL");
  const [includeUniversal, setIncludeUniversal] = useState(true);
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const storedToast = sessionStorage.getItem("swift_staff_redirect_toast");
        if (storedToast) {
          sessionStorage.removeItem("swift_staff_redirect_toast");
          return storedToast;
        }
      }
    } catch {}
    return null;
  });
  const [toastType, setToastType] = useState<"success" | "warning">("warning");
  const { products, hydrateProducts } = useInventoryStore();

  const refreshProducts = useCallback(() => {
    getProductsAction()
      .then((fetched) => {
        if (fetched.length > 0) {
          hydrateProducts(fetched);
        }
      })
      .catch((error) => {
        console.error("Failed to load products for compatibility check:", error);
      });
  }, [hydrateProducts]);

  useEffect(() => {
    let isMounted = true;
    refreshProducts();

    getMotorcycleModelsAction()
      .then((fetchedModels) => {
        if (isMounted && fetchedModels.length > 0) {
          setMotorcycleModels(fetchedModels);
          setSelectedModel((prev) => prev ?? fetchedModels[0]);
        }
      })
      .catch((error) => {
        console.error("Failed to load motorcycle models:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshProducts]);

  // SIAA-85: Auto-dismiss redirect toast notification after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Supabase Realtime multi-terminal fitment updates & stock broadcast
  const { isConnected, status } = useMotoMatcherRealtime(selectedModel?.id, {
    onFitmentChange: refreshProducts,
  });

  const handleSelectModel = (model: MotorcycleModelRecord | null) => {
    setIsUniversal(false);
    setSelectedModel(model);
  };

  const handleSelectUniversal = () => {
    setIsUniversal(true);
    setSelectedModel(null);
  };

  const activeModelDisplay = useMemo(() => {
    if (isUniversal) return "Universal / Multi-Fit Components";
    if (selectedModel) return `${selectedModel.make} ${selectedModel.model} (${selectedModel.displacement_cc}cc)`;
    return "No Platform Selected";
  }, [isUniversal, selectedModel]);

  const filteredSet = useMemo(() => {
    return getMotoMatcherFilteredSet(products, {
      selectedModel,
      isUniversalPlatform: isUniversal,
      systemCategory,
      includeUniversal,
    });
  }, [products, selectedModel, isUniversal, systemCategory, includeUniversal]);

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

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* MotoMatcher Interactive Visual Selector */}
      <MotorcycleSelector
        models={motorcycleModels}
        selectedModelId={selectedModel?.id}
        onSelectModel={handleSelectModel}
        onSelectUniversal={handleSelectUniversal}
        title="Staff Floor MotoMatcher & Platform Selector"
        subtitle="Select customer motorcycle platform to filter 100% verified parts from live inventory."
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

      {/* Verified Fitment Results Summary Banner */}
      <div className="p-3 bg-bg-surface border border-border rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Verified Fitment Results for {activeModelDisplay}
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap">
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
          <span className="text-text-muted">•</span>
          {renderSyncStatus(isConnected, status)}
        </div>
      </div>

      {/* Side-by-Side Dual-Column Comparison Matrix */}
      <ComparisonMatrix
        oemParts={filteredSet.oemParts}
        aftermarketParts={filteredSet.aftermarketParts}
        onAddToCart={handleAddToCart}
        addedSku={addedSku}
        touchOptimized={true}
        emptyOemMessage="No OEM components found for this model in the selected system category."
        emptyAftermarketMessage="No aftermarket performance parts found for this model in the selected system category."
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
