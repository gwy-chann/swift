"use client";

import React, { useState, useMemo } from "react";
import { Zap, Search, ShoppingCart, CheckCircle2, Plus, Minus, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { Product } from "@/lib/types/product";
import { StockBadge } from "@/components/inventory/stock-badge";
import { ManagerOverrideModal } from "@/components/staff/pos/manager-override-modal";

interface PosCartItem {
  product: Product;
  qty: number;
  isOverridden?: boolean;
}

const LABOR_SERVICES: Product[] = [
  {
    sku: "SRV-OIL-01",
    name: "Standard Bay Oil Change Labor",
    category: "SERVICES",
    stock: 999,
    minThreshold: 0,
    location: "Service Bay 1",
    cost: 50,
    wholesale: 120,
    retail: 150,
    oem: false,
    model: "Universal",
    brand: "Swift Workshop"
  },
  {
    sku: "SRV-TIRE-02",
    name: "Tire Vulcanizing & Wheel Balancing",
    category: "SERVICES",
    stock: 999,
    minThreshold: 0,
    location: "Service Bay 2",
    cost: 60,
    wholesale: 160,
    retail: 200,
    oem: false,
    model: "Universal",
    brand: "Swift Workshop"
  }
];

export default function StaffPosPage() {
  const { products } = useInventoryStore();

  const [pricingMode, setPricingMode] = useState<"retail" | "wholesale">("retail");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Cart state
  const [cart, setCart] = useState<PosCartItem[]>([
    {
      product: products.find((p) => p.sku === "MOT-3100-10W40") || {
        sku: "MOT-3100-10W40",
        name: "Motul 3100 Gold 4T 10W40 (1L)",
        category: "Fluids",
        stock: 28,
        minThreshold: 15,
        location: "Aisle 1 / Shelf 1",
        cost: 260,
        wholesale: 330,
        retail: 390,
        oem: false,
        model: "Universal",
        brand: "Motul"
      },
      qty: 1
    },
    {
      product: LABOR_SERVICES[0],
      qty: 1
    }
  ]);

  // Manager override modal state
  const [pendingOverrideProduct, setPendingOverrideProduct] = useState<Product | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Combine store products with labor services
  const allPosItems = useMemo(() => {
    return [...products, ...LABOR_SERVICES];
  }, [products]);

  // Dynamic categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add("ALL");
    set.add("SERVICES");
    for (const p of products) {
      if (p.category && p.category !== "SERVICES") {
        set.add(p.category);
      }
    }
    return Array.from(set);
  }, [products]);

  // Filter items by category & search
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPosItems.filter((item) => {
      const matchCat =
        activeCategory === "ALL" ||
        (activeCategory === "SERVICES"
          ? item.category === "SERVICES"
          : item.category.toLowerCase() === activeCategory.toLowerCase());

      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q);

      return matchCat && matchQuery;
    });
  }, [allPosItems, activeCategory, searchQuery]);

  // Add item to cart with zero-stock protection
  const handleAddToCart = (product: Product) => {
    const existing = cart.find((c) => c.product.sku === product.sku);
    const isService = product.category === "SERVICES";

    // Scenario 3: Zero-stock out-of-stock handling
    if (!isService && product.stock <= 0 && !existing?.isOverridden) {
      setPendingOverrideProduct(product);
      setIsOverrideModalOpen(true);
      return;
    }

    // Check if adding exceeds physical stock
    if (!isService && existing && !existing.isOverridden && existing.qty >= product.stock) {
      setPendingOverrideProduct(product);
      setIsOverrideModalOpen(true);
      return;
    }

    setCart((prev) => {
      const found = prev.find((item) => item.product.sku === product.sku);
      if (found) {
        return prev.map((item) =>
          item.product.sku === product.sku ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const handleAuthorizedOverride = (product: Product) => {
    setCart((prev) => {
      const found = prev.find((item) => item.product.sku === product.sku);
      if (found) {
        return prev.map((item) =>
          item.product.sku === product.sku
            ? { ...item, qty: item.qty + 1, isOverridden: true }
            : item
        );
      }
      return [...prev, { product, qty: 1, isOverridden: true }];
    });
  };

  const handleUpdateQty = (sku: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.sku === sku) {
            const nextQty = item.qty + delta;
            const isService = item.product.category === "SERVICES";

            // If increasing beyond stock without override, trigger override dialog
            if (!isService && delta > 0 && !item.isOverridden && nextQty > item.product.stock) {
              setPendingOverrideProduct(item.product);
              setIsOverrideModalOpen(true);
              return item;
            }

            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is PosCartItem => item !== null);
    });
  };

  const handleRemoveFromCart = (sku: string) => {
    setCart((prev) => prev.filter((item) => item.product.sku !== sku));
  };

  // Financial calculations
  const getItemPrice = React.useCallback(
    (item: Product) => {
      return pricingMode === "wholesale" ? item.wholesale : item.retail;
    },
    [pricingMode]
  );

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + getItemPrice(item.product) * item.qty, 0);
  }, [cart, getItemPrice]);

  const discountAmount = useMemo(() => {
    return subtotal * (discountPercent / 100);
  }, [subtotal, discountPercent]);

  const totalDue = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    setIsCompleted(true);
    setTimeout(() => {
      setIsCompleted(false);
      setCart([]);
      setDiscountPercent(0);
    }, 1500);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-6.5rem)] animate-in fade-in duration-200">
      {/* Left Pane: Fast Item Catalog */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        {/* Catalog Header */}
        <div className="p-4 border-b border-border bg-bg-surface/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-text-primary">Fast-Lane Checkout</h3>
            </div>
            <div className="relative sm:w-80">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan Barcode / SKU & hit [ENTER]..."
                aria-label="Scan or search parts"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-input border border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-text-primary placeholder:text-text-muted outline-hidden"
                autoFocus
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat
                    ? "bg-primary text-text-light shadow-xs"
                    : "bg-bg-base text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                {cat === "ALL" ? "All Fast Items" : cat === "SERVICES" ? "Add Labor / Bay Service" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const isService = item.category === "SERVICES";
              const isOutOfStock = !isService && item.stock <= 0;
              const isLowStock = !isService && item.stock > 0 && item.stock <= item.minThreshold;
              const itemPrice = getItemPrice(item);

              return (
                <div
                  key={item.sku}
                  onClick={() => handleAddToCart(item)}
                  className={`p-3.5 bg-bg-card border rounded-lg flex flex-col justify-between gap-2.5 transition-all shadow-xs group cursor-pointer ${
                    isOutOfStock
                      ? "border-danger/30 hover:border-danger/60 bg-danger-light/10"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono text-text-muted font-bold">{item.sku}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-muted font-bold text-text-secondary">
                        {item.location || "Floor Stock"}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-text-primary group-hover:text-primary mt-1 line-clamp-2">
                      {item.name}
                    </h4>
                    <div className="mt-1.5 flex items-center gap-2">
                      {!isService ? (
                        <StockBadge stock={item.stock} minThreshold={item.minThreshold} compact />
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-light text-primary border border-primary/20">
                          Workshop Service
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-sm font-extrabold font-mono text-primary">
                      ₱{itemPrice.toFixed(2)}
                    </span>
                    {isOutOfStock ? (
                      <span className="text-[11px] font-bold text-danger flex items-center gap-1 group-hover:underline">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Override</span>
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[11px] font-bold text-danger flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>+ Add</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-text-muted group-hover:text-primary flex items-center gap-1">
                        <span>+ Add</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Pane: Active Ticket / Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden shrink-0">
        {/* Ticket Header */}
        <div className="p-4 border-b border-border bg-bg-surface/50 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-secondary" />
              <span>Current Ticket</span>
            </div>
            <div className="text-[11px] text-text-muted font-mono">Ticket #TX-1043</div>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-bg-base border border-border text-xs font-bold">
            <button
              type="button"
              onClick={() => setPricingMode("retail")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                pricingMode === "retail" ? "bg-primary text-text-light shadow-xs" : "text-text-muted hover:text-text-primary"
              }`}
            >
              Retail
            </button>
            <button
              type="button"
              onClick={() => setPricingMode("wholesale")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                pricingMode === "wholesale" ? "bg-primary text-text-light shadow-xs" : "text-text-muted hover:text-text-primary"
              }`}
            >
              Wholesale
            </button>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-muted">
              <ShoppingCart className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs font-semibold">Active ticket is empty</p>
              <p className="text-[11px]">Click parts from the left catalog or scan barcodes to begin</p>
            </div>
          ) : (
            cart.map((item) => {
              const isService = item.product.category === "SERVICES";
              const isLowStock = !isService && item.product.stock <= item.product.minThreshold && item.product.stock > 0;
              const isOutOfStock = !isService && item.product.stock <= 0;
              const itemTotal = getItemPrice(item.product) * item.qty;

              return (
                <div
                  key={item.product.sku}
                  className="p-3 bg-bg-base border border-border rounded-lg space-y-1.5 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{item.product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-text-muted font-mono">{item.product.sku}</span>
                        {isOutOfStock && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-danger text-text-light">
                            Backorder (Overridden)
                          </span>
                        )}
                        {isLowStock && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-danger-light text-danger border border-danger/30">
                            Low Stock ({item.product.stock} avail)
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono text-text-primary">
                      ₱{itemTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.sku, -1)}
                        aria-label="Decrease quantity"
                        className="p-1 rounded bg-bg-muted hover:bg-bg-hover text-text-secondary cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-xs px-2">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.sku, 1)}
                        aria-label="Increase quantity"
                        className="p-1 rounded bg-bg-muted hover:bg-bg-hover text-text-secondary cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.product.sku)}
                      aria-label="Remove item from ticket"
                      className="p-1 text-text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary & Checkout Footer */}
        <div className="p-4 border-t border-border bg-bg-surface/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-text-primary">₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-danger">
            <span>Discount ({discountPercent}% Standard)</span>
            <span className="font-mono font-bold">-₱{discountAmount.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            {[
              { label: "0% Standard", val: 0 },
              { label: "5% VIP", val: 5 },
              { label: "20% SC/PWD", val: 20 }
            ].map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setDiscountPercent(d.val)}
                className={`flex-1 py-1 px-2 rounded text-[10px] font-bold text-center border transition-colors cursor-pointer ${
                  discountPercent === d.val
                    ? "bg-primary text-text-light border-primary shadow-xs"
                    : "bg-bg-base hover:bg-bg-hover text-text-muted border-border"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">TOTAL DUE</span>
            <span className="text-lg font-black font-mono text-success">₱{totalDue.toFixed(2)}</span>
          </div>

          <button
            type="button"
            disabled={cart.length === 0 || isCompleted}
            onClick={handleCompleteSale}
            className={`w-full py-3 px-4 rounded-lg text-xs font-extrabold shadow-md uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
              cart.length === 0 || isCompleted
                ? "bg-bg-muted text-text-muted border border-border-subtle cursor-not-allowed"
                : "bg-primary hover:bg-primary-hover text-text-light cursor-pointer"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? "SALE RECORDED!" : "COMPLETE SALE (F12)"}</span>
          </button>
        </div>
      </div>

      {/* Manager Override Modal */}
      <ManagerOverrideModal
        isOpen={isOverrideModalOpen}
        product={pendingOverrideProduct}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setPendingOverrideProduct(null);
        }}
        onAuthorize={handleAuthorizedOverride}
      />
    </div>
  );
}
