"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  MapPin,
  PackageOpen,
  Plus,
  Check,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { ComparisonPartItem, ComparisonMatrixProps } from "@/lib/motomatcher/comparison-matrix-contracts";

export function ComparisonMatrix({
  oemParts,
  aftermarketParts,
  onAddToCart,
  addedSku: externalAddedSku,
  isLoading = false,
  emptyOemMessage = "No OEM matches in stock for this platform. Check alternative aftermarket parts or consult distributor catalog.",
  emptyAftermarketMessage = "No Aftermarket matches in stock for this platform. Check universal components or request special order.",
  className = "",
}: ComparisonMatrixProps) {
  const [internalAddedSku, setInternalAddedSku] = useState<string | null>(null);

  const activeAddedSku = externalAddedSku !== undefined ? externalAddedSku : internalAddedSku;

  const handleCardAddToCart = (part: ComparisonPartItem) => {
    if (onAddToCart) {
      onAddToCart(part);
    }
    if (externalAddedSku === undefined) {
      setInternalAddedSku(part.sku);
      setTimeout(() => setInternalAddedSku(null), 1800);
    }
  };

  const formatPrice = (amount: number) => {
    return `₱${amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderPartCard = (part: ComparisonPartItem, isOemColumn: boolean) => {
    const isAdded = activeAddedSku === part.sku;
    const isLowStock = part.stockLevel <= part.minThreshold;
    const isOutOfStock = part.stockLevel <= 0;

    return (
      <div
        key={part.sku}
        className={`p-3.5 bg-bg-surface border rounded-xl transition-all duration-150 space-y-2.5 shadow-xs ${
          isOemColumn
            ? "border-border hover:border-primary"
            : "border-border hover:border-secondary"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-text-muted">
                {part.sku}
              </span>
              {part.isOem ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary-light text-primary">
                  OEM FACTORY
                </span>
              ) : part.isUniversal ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bg-muted text-text-secondary border border-border">
                  UNIVERSAL
                </span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary/15 text-secondary">
                  AFTERMARKET
                </span>
              )}

              {part.upsellBadge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary/15 text-secondary flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {part.upsellBadge}
                </span>
              )}
            </div>

            <h5
              className="text-xs font-bold text-text-primary truncate"
              title={part.name}
            >
              {part.name}
            </h5>

            <div className="flex items-center gap-2 text-[10px] text-text-secondary flex-wrap">
              <span className="font-semibold">{part.brand}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-text-muted" />
                {part.shelfLocation || "Floor Stock"}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={`text-sm font-bold font-mono ${
                isOemColumn ? "text-primary" : "text-secondary"
              }`}
            >
              {formatPrice(part.retailPrice)}
            </div>

            <div className="mt-0.5">
              {isOutOfStock ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block bg-danger-light text-danger border border-danger/20 badge badge-danger">
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-danger-light text-danger">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Low Stock ({part.stockLevel})
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block bg-success-light text-success">
                  {part.stockLevel} in stock
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-border-subtle gap-2">
          <div>
            {part.wholesalePrice !== undefined ? (
              <span className="text-[10px] text-text-muted font-mono">
                Wholesale: {formatPrice(part.wholesalePrice)}
              </span>
            ) : (
              <span className="text-[10px] text-text-muted">
                Category: {part.category}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => handleCardAddToCart(part)}
            aria-label={`Add ${part.name} to POS Cart`}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isAdded
                ? "bg-success text-white"
                : isOemColumn
                ? "bg-primary text-white hover:bg-primary-hover shadow-xs"
                : "bg-secondary text-white hover:bg-secondary-hover shadow-xs"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3 h-3" />
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>Add to POS Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className}`}
      data-testid="comparison-matrix"
    >
      {/* Column 1: OEM Standard Replacement */}
      <section className="space-y-3" aria-label="OEM Standard Factory Parts">
        <header className="p-3 bg-primary-light border border-primary-border rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
              OEM Standard Factory Parts ({oemParts.length})
            </h4>
          </div>
          <span className="text-[10px] font-semibold text-primary bg-bg-surface px-2 py-0.5 rounded border border-primary/20">
            Original Spec
          </span>
        </header>

        {isLoading ? (
          <div className="p-8 bg-bg-surface border border-border rounded-xl text-center text-text-muted text-xs">
            Loading OEM components...
          </div>
        ) : oemParts.length > 0 ? (
          <div className="space-y-2.5">
            {oemParts.map((part) => renderPartCard(part, true))}
          </div>
        ) : (
          <div className="p-8 bg-bg-surface border border-border border-dashed rounded-xl text-center space-y-2">
            <PackageOpen className="w-7 h-7 text-text-muted mx-auto" />
            <p className="text-xs font-bold text-text-primary">
              No OEM matches found for this model
            </p>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {emptyOemMessage}
            </p>
          </div>
        )}
      </section>

      {/* Column 2: Alternative / Performance Aftermarket */}
      <section
        className="space-y-3"
        aria-label="Performance and Alternative Aftermarket Parts"
      >
        <header className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary" />
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
              Performance / Aftermarket ({aftermarketParts.length})
            </h4>
          </div>
          <span className="text-[10px] font-semibold text-secondary bg-bg-surface px-2 py-0.5 rounded border border-secondary/20">
            Upgrade Spec
          </span>
        </header>

        {isLoading ? (
          <div className="p-8 bg-bg-surface border border-border rounded-xl text-center text-text-muted text-xs">
            Loading aftermarket components...
          </div>
        ) : aftermarketParts.length > 0 ? (
          <div className="space-y-2.5">
            {aftermarketParts.map((part) => renderPartCard(part, false))}
          </div>
        ) : (
          <div className="p-8 bg-bg-surface border border-border border-dashed rounded-xl text-center space-y-2">
            <PackageOpen className="w-7 h-7 text-text-muted mx-auto" />
            <p className="text-xs font-bold text-text-primary">
              No Aftermarket matches found for this model
            </p>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {emptyAftermarketMessage}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
