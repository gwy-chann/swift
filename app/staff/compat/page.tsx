"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Filter } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { getProductsAction } from "@/lib/admin/product-actions";
import { getMotorcycleModelsAction } from "@/lib/motomatcher/actions";
import type { MotorcycleModelRecord, Product } from "@/lib/types/product";
import { MOCK_MOTORCYCLE_MODEL_RECORDS } from "@/lib/mock-data/motorcycles";
import { MotorcycleSelector } from "@/components/motomatcher/motorcycle-selector";
import { ComparisonMatrix } from "@/components/motomatcher/comparison-matrix";
import {
  fromProductToComparisonPart,
  type ComparisonPartItem,
} from "@/lib/motomatcher/comparison-matrix-contracts";
import { useCartStore } from "@/lib/store/cart-store";

export default function StaffCompatPage() {
  const [motorcycleModels, setMotorcycleModels] = useState<MotorcycleModelRecord[]>(
    MOCK_MOTORCYCLE_MODEL_RECORDS
  );
  const [selectedModel, setSelectedModel] = useState<MotorcycleModelRecord | null>(
    MOCK_MOTORCYCLE_MODEL_RECORDS[0]
  );
  const [isUniversal, setIsUniversal] = useState(false);
  const [systemCategory, setSystemCategory] = useState("ALL");
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { products, hydrateProducts } = useInventoryStore();

  useEffect(() => {
    let isMounted = true;
    getProductsAction()
      .then((fetched) => {
        if (isMounted && fetched.length > 0) {
          hydrateProducts(fetched);
        }
      })
      .catch((error) => {
        console.error("Failed to load products for compatibility check:", error);
      });

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
  }, [hydrateProducts]);

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

  const compatibleParts = useMemo(() => {
    return products.filter((p) => {
      let modelMatch = false;

      if (isUniversal) {
        modelMatch = p.model?.toLowerCase() === "universal";
      } else if (selectedModel) {
        const queryModel = selectedModel.model.toLowerCase();
        const queryFullName = `${selectedModel.make} ${selectedModel.model}`.toLowerCase();
        const partModel = (p.model || "").toLowerCase();

        modelMatch =
          partModel === "universal" ||
          partModel === queryModel ||
          partModel === queryFullName ||
          partModel.includes(queryModel);
      } else {
        modelMatch = p.model?.toLowerCase() === "universal";
      }

      const categoryMatch =
        systemCategory === "ALL" ||
        (p.category?.toLowerCase() === systemCategory.toLowerCase());

      return modelMatch && categoryMatch;
    });
  }, [products, selectedModel, isUniversal, systemCategory]);

  const { oemComparisonParts, aftermarketComparisonParts } = useMemo(() => {
    const oem: ComparisonPartItem[] = [];
    const aftermarket: ComparisonPartItem[] = [];

    for (const p of compatibleParts) {
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
  }, [compatibleParts]);

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

      {/* Category Subsystem Filter Bar */}
      <div className="p-3 bg-bg-surface border border-border rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
            System / Subsystem:
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "ALL", label: "All Systems" },
            { id: "Brakes", label: "Braking System" },
            { id: "Drivetrain", label: "Drive & CVT" },
            { id: "Fluids", label: "Oils & Fluids" },
            { id: "Ignition", label: "Ignition & Electrical" },
            { id: "Engine", label: "Engine & Clutch" },
            { id: "Tires", label: "Tires & Wheels" },
          ].map((cat) => {
            const isActive = systemCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSystemCategory(cat.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-primary/50"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Verified Fitment Results Summary Banner */}
      <div className="p-3 bg-bg-surface border border-border rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Verified Fitment Results for {activeModelDisplay}
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-text-secondary">
            Total Matches: <strong className="text-text-primary font-mono">{compatibleParts.length}</strong>
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

      {/* Side-by-Side Dual-Column Comparison Matrix */}
      <ComparisonMatrix
        oemParts={oemComparisonParts}
        aftermarketParts={aftermarketComparisonParts}
        onAddToCart={handleAddToCart}
        addedSku={addedSku}
        emptyOemMessage="No OEM components found for this model in the selected system category."
        emptyAftermarketMessage="No aftermarket performance parts found for this model in the selected system category."
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
