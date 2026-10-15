"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Barcode, SearchX, MapPin, Tag, ShieldCheck, Layers } from "lucide-react";
import { lookupProductPriceAction } from "@/lib/staff/actions";
import type { ProductPriceCheckResult } from "@/lib/staff/types";

function getStockBadgeClass(stock: number, minThreshold: number): string {
  if (stock > minThreshold) {
    return "bg-success-light text-success border border-success/30";
  }
  if (stock > 0) {
    return "bg-accent-light text-accent border border-accent/30";
  }
  return "bg-danger-light text-danger border border-danger/30";
}

function getStockStatusLabel(stock: number, minThreshold: number): string {
  if (stock > minThreshold) {
    return `IN STOCK (${stock} Units)`;
  }
  if (stock > 0) {
    return `LOW STOCK (${stock} Units)`;
  }
  return "OUT OF STOCK (0 Units)";
}

export default function StaffPriceCheckPage() {
  const [query, setQuery] = useState("YAM-NMAX-BL01");
  const [lookupResult, setLookupResult] = useState<ProductPriceCheckResult | null>(null);
  const [isSearching, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await lookupProductPriceAction(trimmed);
          setLookupResult(res);
        } catch {
          setLookupResult({
            success: false,
            code: "DATABASE_ERROR",
            error: "Unable to query product price at this time.",
          });
        }
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const matchedProduct = hasQuery && lookupResult?.success ? lookupResult.product : null;
  const showEmptyState = hasQuery && lookupResult && !lookupResult.success;

  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
      {/* Price Check Barcode Input */}
      <div className="p-6 bg-bg-surface border border-border rounded-xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Barcode className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary">Instant Barcode & Price Checker</h3>
          <p className="text-xs text-text-muted">
            Scan barcode or enter SKU code for instant customer price inquiries (&lt;200ms)
          </p>
        </div>

        <div className="relative max-w-md mx-auto">
          <input
            id="priceScanInput"
            name="priceScanInput"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scan barcode or type SKU (e.g. YAM-NMAX-BL01)..."
            className="w-full text-center py-3 px-4 bg-bg-input border-2 border-primary focus:ring-4 focus:ring-primary/20 rounded-xl font-mono text-base font-bold text-text-primary outline-hidden transition-all"
            autoFocus
          />
          {isSearching && (
            <div className="absolute right-3.5 top-3.5 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            </div>
          )}
        </div>
      </div>

      {/* Result Card */}
      {matchedProduct && (
        <div className="p-6 bg-bg-card border border-border rounded-xl shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-muted font-bold tracking-wider">
                  {matchedProduct.sku}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-muted text-text-secondary">
                  {matchedProduct.category}
                </span>
              </div>
              <h4 className="text-lg font-bold text-text-primary mt-1">{matchedProduct.name}</h4>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mt-1">
                <span className="flex items-center gap-1 font-semibold text-secondary">
                  <MapPin className="w-3.5 h-3.5" />
                  {matchedProduct.location || "Floor Stock"}
                </span>
                {matchedProduct.model && (
                  <span className="flex items-center gap-1 text-text-muted">
                    <Layers className="w-3.5 h-3.5" />
                    Fitment: {matchedProduct.model}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <span
                className={`inline-block px-3 py-1 rounded-md text-xs font-extrabold ${getStockBadgeClass(
                  matchedProduct.stock,
                  matchedProduct.minThreshold
                )}`}
              >
                {getStockStatusLabel(matchedProduct.stock, matchedProduct.minThreshold)}
              </span>
            </div>
          </div>

          {/* Dual-Tier + SC/PWD Pricing Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
            <div className="p-3.5 bg-bg-base border border-border rounded-lg space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-text-muted font-bold">
                <Tag className="w-3 h-3 text-primary" />
                <span>Retail Price (SRP)</span>
              </div>
              <span className="text-xl font-black font-mono text-primary block">
                ₱{matchedProduct.retailPrice.toFixed(2)}
              </span>
              <span className="text-[10px] text-text-muted">Standard Walk-in Customer</span>
            </div>

            <div className="p-3.5 bg-bg-base border border-border rounded-lg space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-text-muted font-bold">
                <Layers className="w-3 h-3 text-secondary" />
                <span>Wholesale (Bulk 5+)</span>
              </div>
              <span className="text-xl font-black font-mono text-secondary block">
                ₱{matchedProduct.wholesalePrice.toFixed(2)}
              </span>
              <span className="text-[10px] text-text-muted">Fleet &amp; Partner Shops</span>
            </div>

            <div className="p-3.5 bg-bg-base border border-border rounded-lg space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-text-muted font-bold">
                <ShieldCheck className="w-3 h-3 text-text-primary" />
                <span>SC / PWD (20% Off)</span>
              </div>
              <span className="text-xl font-black font-mono text-text-primary block">
                ₱{matchedProduct.scPwdPrice.toFixed(2)}
              </span>
              <span className="text-[10px] text-text-muted">Mandated RA 9994 / RA 10754</span>
            </div>
          </div>
        </div>
      )}

      {showEmptyState && (
        <div className="p-8 bg-bg-surface border border-border rounded-xl shadow-xs text-center space-y-2">
          <SearchX className="w-8 h-8 text-text-muted mx-auto" />
          <p className="text-sm font-bold text-text-primary">
            No Part Found for SKU &quot;{query}&quot;
          </p>
          <p className="text-xs text-text-muted">
            Try scanning another barcode, checking SKU spelling, or verifying parts catalog.
          </p>
        </div>
      )}
    </div>
  );
}
