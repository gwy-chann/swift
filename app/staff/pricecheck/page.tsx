"use client";

import{ useState, useEffect, useMemo } from "react";
import { Barcode, SearchX } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { getProductsAction } from "@/lib/admin/product-actions";

function getStockBadgeClass(stock: number, minThreshold: number): string {
  if (stock > minThreshold) {
    return "bg-success-light text-success";
  }
  if (stock > 0) {
    return "bg-accent-light text-accent";
  }
  return "bg-danger-light text-danger";
}

export default function StaffPriceCheckPage() {
  const [skuInput, setSkuInput] = useState("YAM-NMAX-BL01");
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
        console.error("Failed to load products for price check:", error);
      });
    return () => {
      isMounted = false;
    };
  }, [hydrateProducts]);

  const matchedProduct = useMemo(() => {
    const q = skuInput.trim().toLowerCase();
    if (!q) return null;
    return (
      products.find((p) => p.sku.toLowerCase() === q) ||
      products.find((p) => p.name.toLowerCase().includes(q)) ||
      null
    );
  }, [products, skuInput]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200">
      {/* Price Check Barcode Input */}
      <div className="p-6 bg-bg-surface border border-border rounded-xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Barcode className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary">Instant Barcode & Price Checker</h3>
          <p className="text-xs text-text-muted">Scan barcode or enter SKU code for customer price inquiries</p>
        </div>

        <div className="relative max-w-md mx-auto">
          <input
            type="text"
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            placeholder="Scan barcode or type SKU (e.g. YAM-NMAX-BL01)..."
            className="w-full text-center py-3 px-4 bg-bg-input border-2 border-primary focus:ring-4 focus:ring-primary/20 rounded-xl font-mono text-base font-bold text-text-primary outline-hidden"
            autoFocus
          />
        </div>
      </div>

      {/* Result Card */}
      {matchedProduct ? (
        <div className="p-6 bg-bg-card border border-border rounded-xl shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono text-text-muted font-bold">{matchedProduct.sku}</span>
              <h4 className="text-lg font-bold text-text-primary mt-1">{matchedProduct.name}</h4>
              <span className="text-xs text-secondary font-semibold">
                Location: {matchedProduct.location || "Floor Stock"}
              </span>
            </div>
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-extrabold ${getStockBadgeClass(
                matchedProduct.stock,
                matchedProduct.minThreshold
              )}`}
            >
              {matchedProduct.stock > 0
                ? `IN STOCK (${matchedProduct.stock} Units)`
                : "OUT OF STOCK (0 Units)"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
            <div className="p-3 bg-bg-base border border-border rounded-lg">
              <span className="text-[11px] text-text-muted font-bold block">Retail Price (SRP)</span>
              <span className="text-lg font-black font-mono text-primary">₱{matchedProduct.retail.toFixed(2)}</span>
            </div>

            <div className="p-3 bg-bg-base border border-border rounded-lg">
              <span className="text-[11px] text-text-muted font-bold block">Wholesale (Bulk 5+)</span>
              <span className="text-lg font-black font-mono text-secondary">
                ₱{matchedProduct.wholesale.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-bg-base border border-border rounded-lg col-span-2 sm:col-span-1">
              <span className="text-[11px] text-text-muted font-bold block">SC / PWD (20% Off)</span>
              <span className="text-lg font-black font-mono text-text-primary">
                ₱{(matchedProduct.retail * 0.8).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-bg-surface border border-border rounded-xl shadow-xs text-center space-y-2">
          <SearchX className="w-8 h-8 text-text-muted mx-auto" />
          <p className="text-sm font-bold text-text-primary">No Part Found for SKU &quot;{skuInput}&quot;</p>
          <p className="text-xs text-text-muted">Try scanning another barcode or checking spelling.</p>
        </div>
      )}
    </div>
  );
}
