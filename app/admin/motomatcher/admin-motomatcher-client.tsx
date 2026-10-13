"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Bike,
  CheckCircle2,
  PackageOpen,
  Plus,
  ShieldCheck,
  Zap,
  MapPin,
  Check,
} from "lucide-react";
import type { MotorcycleModelRecord, Product } from "@/lib/types/product";
import { MotorcycleSelector } from "@/components/motomatcher/motorcycle-selector";
import { cartStore } from "@/lib/store/cart-store";

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

  // Segregate into OEM Standard and Alternative Aftermarket
  const oemParts = useMemo(() => matchingParts.filter((p) => p.oem), [matchingParts]);
  const aftermarketParts = useMemo(() => matchingParts.filter((p) => !p.oem), [matchingParts]);

  const handleAddToCart = (product: Product) => {
    const res = cartStore.addPart(product, 1);
    if (res.success) {
      setAddedSku(product.sku);
      setTimeout(() => setAddedSku(null), 1800);
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
            OEM: <strong className="font-mono">{oemParts.length}</strong>
          </span>
          <span className="text-text-muted">•</span>
          <span className="font-semibold text-secondary">
            Aftermarket: <strong className="font-mono">{aftermarketParts.length}</strong>
          </span>
        </div>
      </div>

      {/* Side-by-Side Matrix Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Column 1: OEM Standard Replacement */}
        <div className="space-y-3">
          <div className="p-3 bg-primary-light border border-primary-border rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                OEM Standard Replacement ({oemParts.length})
              </h4>
            </div>
            <span className="text-[10px] font-semibold text-primary bg-bg-surface px-2 py-0.5 rounded border border-primary/20">
              Genuine Factory Specs
            </span>
          </div>

          {oemParts.length > 0 ? (
            <div className="space-y-2.5">
              {oemParts.map((part) => (
                <div
                  key={part.sku}
                  className="p-3.5 bg-bg-surface border border-border rounded-xl hover:border-primary transition-all duration-150 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-text-muted">
                          {part.sku}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary-light text-primary">
                          OEM
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-text-primary truncate">
                        {part.name}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                        <span>{part.brand}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-text-muted" />
                          {part.location || "Floor Stock"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold font-mono text-primary">
                        ₱{part.retail.toFixed(2)}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          part.stock <= part.minThreshold
                            ? "bg-danger-light text-danger"
                            : "bg-success-light text-success"
                        }`}
                      >
                        {part.stock} in stock
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-border-subtle">
                    <span className="text-[10px] text-text-muted font-mono">
                      Wholesale: ₱{part.wholesale.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(part)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        addedSku === part.sku
                          ? "bg-success text-white"
                          : "bg-primary text-white hover:bg-primary-hover shadow-xs"
                      }`}
                    >
                      {addedSku === part.sku ? (
                        <>
                          <Check className="w-3 h-3" />
                          Added to Cart
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Add to POS Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-bg-surface border border-border border-dashed rounded-xl text-center space-y-2">
              <PackageOpen className="w-7 h-7 text-text-muted mx-auto" />
              <p className="text-xs font-bold text-text-primary">
                No OEM matches in stock for this platform
              </p>
              <p className="text-[11px] text-text-muted">
                Check alternative aftermarket parts or consult distributor catalog.
              </p>
            </div>
          )}
        </div>

        {/* Column 2: Alternative / Performance Aftermarket */}
        <div className="space-y-3">
          <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-secondary" />
              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                Aftermarket & Performance ({aftermarketParts.length})
              </h4>
            </div>
            <span className="text-[10px] font-semibold text-secondary bg-bg-surface px-2 py-0.5 rounded border border-secondary/20">
              Enhanced Tuning / Value
            </span>
          </div>

          {aftermarketParts.length > 0 ? (
            <div className="space-y-2.5">
              {aftermarketParts.map((part) => (
                <div
                  key={part.sku}
                  className="p-3.5 bg-bg-surface border border-border rounded-xl hover:border-secondary transition-all duration-150 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-text-muted">
                          {part.sku}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-secondary/15 text-secondary">
                          AFTERMARKET
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-text-primary truncate">
                        {part.name}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                        <span>{part.brand}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-text-muted" />
                          {part.location || "Floor Stock"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold font-mono text-secondary">
                        ₱{part.retail.toFixed(2)}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          part.stock <= part.minThreshold
                            ? "bg-danger-light text-danger"
                            : "bg-success-light text-success"
                        }`}
                      >
                        {part.stock} in stock
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-border-subtle">
                    <span className="text-[10px] text-text-muted font-mono">
                      Wholesale: ₱{part.wholesale.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(part)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        addedSku === part.sku
                          ? "bg-success text-white"
                          : "bg-secondary text-white hover:bg-secondary-hover shadow-xs"
                      }`}
                    >
                      {addedSku === part.sku ? (
                        <>
                          <Check className="w-3 h-3" />
                          Added to Cart
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Add to POS Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-bg-surface border border-border border-dashed rounded-xl text-center space-y-2">
              <PackageOpen className="w-7 h-7 text-text-muted mx-auto" />
              <p className="text-xs font-bold text-text-primary">
                No Aftermarket matches in stock for this platform
              </p>
              <p className="text-[11px] text-text-muted">
                Check universal components or request special order.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
