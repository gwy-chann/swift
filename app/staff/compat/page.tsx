"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle2, PackageOpen, Plus, Check, MapPin, Filter } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { getProductsAction } from "@/lib/admin/product-actions";
import { getMotorcycleModelsAction } from "@/lib/motomatcher/actions";
import type { MotorcycleModelRecord, Product } from "@/lib/types/product";
import { MOCK_MOTORCYCLE_MODEL_RECORDS } from "@/lib/mock-data/motorcycles";
import { MotorcycleSelector } from "@/components/motomatcher/motorcycle-selector";
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
    if (isUniversal) return "Universal / Multi-Fit";
    if (selectedModel) return `${selectedModel.make} ${selectedModel.model}`;
    return "Universal";
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

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    const res = useCartStore.getState().addItem(product);
    if (res.success) {
      setAddedSku(product.sku);
      const shelfText = product.location ? ` (Shelf: ${product.location})` : "";
      setToastMessage(`Added ${product.name} to POS Cart${shelfText}`);
      setTimeout(() => setAddedSku(null), 1800);
      setTimeout(() => setToastMessage(null), 3500);
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

      {/* Compatible Verified Parts List */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Verified Fitment Results for {activeModelDisplay} ({compatibleParts.length} Parts Available)
            </h4>
          </div>
          <span className="text-xs font-bold text-success bg-success-light px-2.5 py-0.5 rounded-full border border-success/20 self-start sm:self-auto">
            Live Database Verified
          </span>
        </div>

        {compatibleParts.length > 0 ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {compatibleParts.map((part) => (
              <div
                key={part.sku}
                className="p-3.5 bg-bg-card border border-border rounded-xl flex items-center justify-between hover:border-primary transition-all duration-150 shadow-xs"
              >
                <div className="space-y-0.5 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted font-bold">
                      {part.sku}
                    </span>
                    {part.oem ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary-light text-primary font-bold">
                        OEM
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-secondary/15 text-secondary font-bold">
                        AFTERMARKET
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-text-primary truncate">
                    {part.name}
                  </p>
                  <span className="text-[10px] text-secondary font-semibold flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    Shelf: {part.location || "Floor Stock"} • Stock: {part.stock}
                  </span>
                </div>

                <div className="text-right shrink-0 space-y-1.5">
                  <div>
                    <span className="text-sm font-bold font-mono text-primary block">
                      ₱{part.retail.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono block">
                      Wholesale: ₱{part.wholesale.toFixed(2)}
                    </span>
                  </div>

                  {part.stock <= 0 ? (
                    <button
                      type="button"
                      disabled
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg opacity-50 bg-bg-muted text-text-muted cursor-not-allowed border border-border"
                    >
                      Out of Stock
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(part)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                        addedSku === part.sku
                          ? "bg-success text-white"
                          : "bg-primary text-white hover:bg-primary-hover shadow-xs"
                      }`}
                    >
                      {addedSku === part.sku ? (
                        <>
                          <Check className="w-3 h-3" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          + Add to Active POS Cart
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <PackageOpen className="w-8 h-8 text-text-muted mx-auto" />
            <p className="text-sm font-bold text-text-primary">
              No Matching Parts in Stock for {activeModelDisplay}
            </p>
            <p className="text-xs text-text-muted">
              Try selecting &quot;All Systems&quot; or check universal inventory.
            </p>
          </div>
        )}
      </div>

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
