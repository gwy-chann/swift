"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { useCartStore } from "@/lib/store/cart-store";
import { ManagerOverrideModal } from "@/components/staff/pos/manager-override-modal";
import { HybridCatalogPane } from "@/components/pos/hybrid-catalog-pane";
import { HybridCartPane } from "@/components/pos/hybrid-cart-pane";
import { getProductsAction } from "@/lib/admin/product-actions";
import { getLaborServicesAction, processCheckoutAction } from "@/lib/pos/actions";
import { useLaborServicesRealtime } from "@/lib/hooks/use-labor-services-realtime";
import type { Product } from "@/lib/types/product";
import type { LaborService } from "@/lib/types/service";
import type { CheckoutPayload } from "@/lib/types/transaction";

export default function StaffPosPage() {
  const { products, hydrateProducts } = useInventoryStore();
  const { items, pricingMode, totals, addPart, addService, clearCart } = useCartStore();
  const [laborServices, setLaborServices] = useState<LaborService[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  }, []);

  // Manager override modal state
  const [pendingOverrideProduct, setPendingOverrideProduct] = useState<Product | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getProductsAction()
      .then((fetched) => {
        if (isMounted && fetched.length > 0) {
          hydrateProducts(fetched);
        }
      })
      .catch(() => {});

    getLaborServicesAction()
      .then((services) => {
        if (isMounted && services.length > 0) {
          setLaborServices(services);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [hydrateProducts]);

  // SIAA-59: Realtime multi-terminal rate synchronization in <500ms
  useLaborServicesRealtime({
    onInsert: (service) => {
      if (service.active !== false) {
        setLaborServices((prev) => {
          if (prev.some((s) => s.code === service.code)) {
            return prev.map((s) => (s.code === service.code ? service : s));
          }
          return [...prev, service];
        });
      }
    },
    onUpdate: (service) => {
      setLaborServices((prev) => {
        if (service.active === false) {
          return prev.filter((s) => s.code !== service.code && s.id !== service.id);
        }
        const exists = prev.some((s) => s.code === service.code || (s.id && s.id === service.id));
        if (exists) {
          return prev.map((s) => (s.code === service.code || s.id === service.id ? service : s));
        }
        return [...prev, service];
      });
    },
    onDelete: (id, code) => {
      setLaborServices((prev) => prev.filter((s) => s.code !== code && s.id !== id));
    }
  });

  const handleSelectProduct = useCallback(
    (product: Product) => {
      if (product.stock <= 0) {
        setPendingOverrideProduct(product);
        setIsOverrideModalOpen(true);
        return;
      }

      const res = addPart(product, 1);
      if (!res.success) {
        setPendingOverrideProduct(product);
        setIsOverrideModalOpen(true);
      }
    },
    [addPart]
  );

  const handleSelectService = useCallback(
    (service: LaborService) => {
      addService(service, 1);
    },
    [addService]
  );

  const handleAuthorizedOverride = useCallback(
    (product: Product) => {
      addPart(product, 1, true);
      setIsOverrideModalOpen(false);
      setPendingOverrideProduct(null);
    },
    [addPart]
  );

  const handleRequireOverride = useCallback((product: Product) => {
    setPendingOverrideProduct(product);
    setIsOverrideModalOpen(true);
  }, []);

  const handleCompleteSale = useCallback(async () => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      const payload: CheckoutPayload = {
        pricingMode,
        subtotal: totals.subtotal,
        discountRate: totals.discountRate,
        discountAmount: totals.discountAmount,
        totalDue: totals.total,
        cashTendered: totals.total,
        changeDue: 0,
        paymentMethod: "Cash",
        cashierName: "Fast-Lane Cashier",
        items: items.map((item) => {
          if (item.type === "part") {
            return {
              itemType: "part" as const,
              itemSkuOrCode: item.sku,
              itemName: item.name,
              unitPrice: item.price,
              quantity: item.qty,
              subtotal: item.price * item.qty,
              shelfLocation: item.location || null,
              bay: null
            };
          }
          return {
            itemType: "service" as const,
            itemSkuOrCode: item.code,
            itemName: item.name,
            unitPrice: item.price,
            quantity: item.qty,
            subtotal: item.price * item.qty,
            shelfLocation: null,
            bay: item.bay || null
          };
        })

      };

      const result = await processCheckoutAction(payload);

      if (!result.success) {
        showToast("error", `Cannot complete checkout: ${result.error || `Insufficient stock for SKU ${result.sku}`}`);
        setIsProcessing(false);
        return;
      }

      showToast("success", `Sale completed successfully! Receipt #${result.receiptNumber}`);
      clearCart();

      // Refresh catalog stock counts
      const updated = await getProductsAction();
      if (updated.length > 0) {
        hydrateProducts(updated);
      }
    } catch (err) {
      console.error("[Staff POS] Checkout error:", err);
      showToast("error", "Unexpected error occurred during checkout processing.");
    } finally {
      setIsProcessing(false);
    }
  }, [items, isProcessing, pricingMode, totals, showToast, clearCart, hydrateProducts]);

  // Keyboard hotkey for F12 checkout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        handleCompleteSale();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCompleteSale]);

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-6.5rem)] animate-in fade-in duration-200">
      {/* High-Contrast Toast Notification Banner */}
      {toastMessage && (
        <output
          className={`p-3 rounded-lg border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md transition-all shrink-0 ${
            toastMessage.type === "success"
              ? "bg-success-light text-success border-success/30"
              : "bg-danger-light text-danger border-danger/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </output>
      )}

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        {/* Left Pane: Hybrid Fast Catalog */}
        <HybridCatalogPane
          products={products}
          laborServices={laborServices}
          onSelectProduct={handleSelectProduct}
          onSelectService={handleSelectService}
          title="Fast-Lane Checkout"
        />

        {/* Right Pane: Hybrid Active Ticket & Cart */}
        <HybridCartPane
          ticketNumber="TX-1043"
          catalogProducts={products}
          onRequireOverride={handleRequireOverride}
          onCompleteSale={handleCompleteSale}
          isProcessing={isProcessing}
        />
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
