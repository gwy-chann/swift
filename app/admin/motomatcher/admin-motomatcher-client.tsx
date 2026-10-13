"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Bike,
  CheckCircle2,
} from "lucide-react";
import type { MotorcycleModelRecord, Product } from "@/lib/types/product";
import { MotorcycleSelector } from "@/components/motomatcher/motorcycle-selector";
import { ComparisonMatrix } from "@/components/motomatcher/comparison-matrix";
import {
  fromProductToComparisonPart,
  type ComparisonPartItem,
} from "@/lib/motomatcher/comparison-matrix-contracts";
import { useCartStore } from "@/lib/store/cart-store";

export interface AdminMotoMatcherClientProps {
  initialModels: MotorcycleModelRecord[];
  initialProducts: Product[];
}

export function AdminMotoMatcherClient({
  initialModels,
  initialProducts,
}: AdminMotoMatcherClientProps) {
  const [selectedModel, setSelectedModel] = useState<MotorcycleModelRecord | null>(
    initialModels.length > 0 ? initialModels[0] : null
  );
  const [isUniversal, setIsUniversal] = useState(false);
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSelectModel = (model: MotorcycleModelRecord | null) => {
    setIsUniversal(false);
    setSelectedModel(model);
  };

  const handleSelectUniversal = () => {
    setIsUniversal(true);
    setSelectedModel(null);
  };

  // Filter products matching current motorcycle platform
  const matchingParts = useMemo(() => {
    if (isUniversal) {
      return initialProducts.filter(
        (p) => p.model?.toLowerCase() === "universal"
      );
    }

    if (!selectedModel) {
      return [];
    }

    const modelNameLower = selectedModel.model.toLowerCase();
    const makeLower = selectedModel.make.toLowerCase();

    return initialProducts.filter((p) => {
      const partModelLower = (p.model || "").toLowerCase();
      const isUniversalPart = partModelLower === "universal";
      const directMatch = partModelLower === modelNameLower;
      const combinedMatch = partModelLower === `${makeLower} ${modelNameLower}`;
      const substringMatch = partModelLower.includes(modelNameLower);

      return isUniversalPart || directMatch || combinedMatch || substringMatch;
    });
  }, [initialProducts, selectedModel, isUniversal]);

  // Segregate into OEM Standard and Alternative Aftermarket comparison items
  const { oemComparisonParts, aftermarketComparisonParts } = useMemo(() => {
    const oem: ComparisonPartItem[] = [];
    const aftermarket: ComparisonPartItem[] = [];

    for (const p of matchingParts) {
      const comp = fromProductToComparisonPart(p);
      if (comp.isOem) {
        oem.push(comp);
      } else {
        aftermarket.push(comp);
      }
    }

    return {
      oemComparisonParts: oem,
      aftermarketComparisonParts: aftermarket,
    };
  }, [matchingParts]);

  const handleAddToCart = (item: ComparisonPartItem) => {
    const raw = item.rawProduct as Product | undefined;
    if (raw) {
      if (raw.stock <= 0) return;
      const res = useCartStore.getState().addItem(raw);
      if (res.success) {
        setAddedSku(item.sku);
        const shelfText = raw.location ? ` (Shelf: ${raw.location})` : "";
        setToastMessage(`Added ${raw.name} to POS Cart${shelfText}`);
        setTimeout(() => setAddedSku(null), 1800);
        setTimeout(() => setToastMessage(null), 3500);
      }
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
            Total Matches: <strong className="text-text-primary font-mono">{matchingParts.length}</strong>
          </span>
          <span className="text-text-muted">•</span>
          <span className="font-semibold text-primary">
            OEM: <strong className="font-mono">{oemComparisonParts.length}</strong>
          </span>
          <span className="text-text-muted">•</span>
          <span className="font-semibold text-secondary">
            Aftermarket: <strong className="font-mono">{aftermarketComparisonParts.length}</strong>
          </span>
        </div>
      </div>

      {/* Side-by-Side Matrix Comparison Grid */}
      <ComparisonMatrix
        oemParts={oemComparisonParts}
        aftermarketParts={aftermarketComparisonParts}
        onAddToCart={handleAddToCart}
        addedSku={addedSku}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-bg-surface text-text-primary border border-border shadow-lg rounded-xl animate-in slide-in-from-bottom-2 duration-200"
        >
          <div className="w-6 h-6 rounded-full bg-success-light text-success flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
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
