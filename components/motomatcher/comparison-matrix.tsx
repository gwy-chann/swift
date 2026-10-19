"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  PackageOpen,
  Plus,
  Check,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type {
  ComparisonPartItem,
  ComparisonMatrixProps,
  ComparisonMatrixTab,
} from "@/lib/motomatcher/comparison-matrix-contracts";
import { ShelfLocationTag } from "@/components/inventory/shelf-location-tag";

function renderPartTypeBadge(part: ComparisonPartItem) {
  if (part.isOem) {
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary-light text-primary">
        OEM FACTORY
      </span>
    );
  }
  if (part.isUniversal) {
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-bg-muted text-text-secondary border border-border">
        UNIVERSAL
      </span>
    );
  }
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary/15 text-secondary">
      AFTERMARKET
    </span>
  );
}

function renderStockBadge(part: ComparisonPartItem) {
  if (part.stockLevel <= 0) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block bg-danger-light text-danger border border-danger/20 badge badge-danger">
        Out of Stock
      </span>
    );
  }
  if (part.stockLevel <= part.minThreshold) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-danger-light text-danger">
        <AlertTriangle className="w-2.5 h-2.5" />
        Low Stock ({part.stockLevel})
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block bg-success-light text-success">
      {part.stockLevel} in stock
    </span>
  );
}

function getAddToCartButtonClasses(isAdded: boolean, isOutOfStock: boolean, isOemColumn: boolean): string {
  if (isOutOfStock) {
    return "bg-bg-muted text-text-muted border border-border";
  }
  if (isAdded) {
    return "bg-success text-white shadow-xs";
  }
  if (isOemColumn) {
    return "bg-primary text-white hover:bg-primary-hover shadow-xs";
  }
  return "bg-secondary text-white hover:bg-secondary-hover shadow-xs";
}

function renderAddToCartButtonContent(isAdded: boolean, isOutOfStock: boolean) {
  if (isAdded) {
    return (
      <>
        <Check className="w-4 h-4" />
        <span>Added to Cart</span>
      </>
    );
  }
  if (isOutOfStock) {
    return <span>Out of Stock</span>;
  }
  return (
    <>
      <Plus className="w-4 h-4" />
      <span>Add to POS Cart</span>
    </>
  );
}

export function ComparisonMatrix({
  oemParts,
  aftermarketParts,
  onAddToCart,
  addedSku: externalAddedSku,
  isLoading = false,
  emptyOemMessage = "No OEM matches in stock for this platform. Check alternative aftermarket parts or consult distributor catalog.",
  emptyAftermarketMessage = "No Aftermarket matches in stock for this platform. Check universal components or request special order.",
  className = "",
  touchOptimized = true,
  activeMobileTab: externalActiveMobileTab,
  onMobileTabChange: externalOnMobileTabChange,
}: Readonly<ComparisonMatrixProps>) {
  const [internalAddedSku, setInternalAddedSku] = useState<string | null>(null);
  const [internalMobileTab, setInternalMobileTab] = useState<ComparisonMatrixTab>("oem");

  const activeAddedSku = externalAddedSku !== undefined ? externalAddedSku : internalAddedSku;
  const activeMobileTab = externalActiveMobileTab ?? internalMobileTab;

  const handleMobileTabChange = (tab: ComparisonMatrixTab) => {
    if (externalOnMobileTabChange) {
      externalOnMobileTabChange(tab);
    } else {
      setInternalMobileTab(tab);
    }
  };

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
    const isOutOfStock = part.stockLevel <= 0;
    const buttonTouchClass = touchOptimized ? "min-h-[44px]" : "min-h-[36px]";
    const buttonClasses = getAddToCartButtonClasses(isAdded, isOutOfStock, isOemColumn);

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
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-text-muted">
                {part.sku}
              </span>
              {renderPartTypeBadge(part)}

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

            {/* Warehouse Shelf Locator & Brand Metadata */}
            <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap pt-0.5">
              <span className="font-semibold text-text-secondary">{part.brand}</span>
              <span>•</span>
              <ShelfLocationTag location={part.shelfLocation} className="text-[11px] py-0.5" />
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

            <div className="mt-0.5">{renderStockBadge(part)}</div>
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
            aria-label={isOutOfStock ? `${part.name} is out of stock` : `Add ${part.name} to POS Cart`}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonTouchClass} active:scale-98 ${buttonClasses}`}
          >
            {renderAddToCartButtonContent(isAdded, isOutOfStock)}
          </button>
        </div>
      </div>
    );
  };

  const renderOemContent = () => {
    if (isLoading) {
      return (
        <div className="p-8 bg-bg-surface border border-border rounded-xl text-center text-text-muted text-xs">
          Loading OEM components...
        </div>
      );
    }
    if (oemParts.length > 0) {
      return (
        <div className="space-y-2.5">
          {oemParts.map((part) => renderPartCard(part, true))}
        </div>
      );
    }
    return (
      <div className="p-8 bg-bg-surface border border-border border-dashed rounded-xl text-center space-y-2">
        <PackageOpen className="w-7 h-7 text-text-muted mx-auto" />
        <p className="text-xs font-bold text-text-primary">
          No OEM matches found for this model
        </p>
        <p className="text-[11px] text-text-muted leading-relaxed">
          {emptyOemMessage}
        </p>
      </div>
    );
  };

  const renderAftermarketContent = () => {
    if (isLoading) {
      return (
        <div className="p-8 bg-bg-surface border border-border rounded-xl text-center text-text-muted text-xs">
          Loading aftermarket components...
        </div>
      );
    }
    if (aftermarketParts.length > 0) {
      return (
        <div className="space-y-2.5">
          {aftermarketParts.map((part) => renderPartCard(part, false))}
        </div>
      );
    }
    return (
      <div className="p-8 bg-bg-surface border border-border border-dashed rounded-xl text-center space-y-2">
        <PackageOpen className="w-7 h-7 text-text-muted mx-auto" />
        <p className="text-xs font-bold text-text-primary">
          No Aftermarket matches found for this model
        </p>
        <p className="text-[11px] text-text-muted leading-relaxed">
          {emptyAftermarketMessage}
        </p>
      </div>
    );
  };

  return (
    <div
      className={`space-y-3 ${className}`}
      data-testid="comparison-matrix"
      data-touch-optimized={touchOptimized}
    >
      {/* Mobile Segmented Column Switcher (< 768px viewports) */}
      <div className="md:hidden flex p-1 bg-bg-muted/80 rounded-xl border border-border gap-1">
        <button
          type="button"
          onClick={() => handleMobileTabChange("oem")}
          className={`flex-1 min-h-11 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeMobileTab === "oem"
              ? "bg-bg-surface text-primary shadow-xs border border-primary/20"
              : "text-text-secondary hover:text-text-primary"
          }`}
          aria-label={`Show OEM Standard Factory Parts (${oemParts.length})`}
          aria-pressed={activeMobileTab === "oem"}
        >
          <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
          <span>OEM Factory</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-primary-light text-primary">
            {oemParts.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleMobileTabChange("aftermarket")}
          className={`flex-1 min-h-11 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeMobileTab === "aftermarket"
              ? "bg-bg-surface text-secondary shadow-xs border border-secondary/20"
              : "text-text-secondary hover:text-text-primary"
          }`}
          aria-label={`Show Performance and Aftermarket Parts (${aftermarketParts.length})`}
          aria-pressed={activeMobileTab === "aftermarket"}
        >
          <Zap className="w-4 h-4 shrink-0 text-secondary" />
          <span>Aftermarket</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary">
            {aftermarketParts.length}
          </span>
        </button>
      </div>

      {/* Dual Column Layout (Desktop side-by-side, Mobile single-tab active) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1: OEM Standard Replacement */}
        <section
          className={`space-y-3 ${activeMobileTab === "oem" ? "block" : "hidden md:block"}`}
          aria-label="OEM Standard Factory Parts"
        >
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

          {renderOemContent()}
        </section>

        {/* Column 2: Alternative / Performance Aftermarket */}
        <section
          className={`space-y-3 ${activeMobileTab === "aftermarket" ? "block" : "hidden md:block"}`}
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

          {renderAftermarketContent()}
        </section>
      </div>
    </div>
  );
}
