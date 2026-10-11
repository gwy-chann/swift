"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShoppingCart, CheckCircle2, AlertCircle } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { useCartStore } from "@/lib/store/cart-store";
import { ManagerOverrideModal } from "@/components/staff/pos/manager-override-modal";
import { ThermalReceiptModal } from "@/components/pos/thermal-receipt-modal";
import { HybridCatalogPane } from "@/components/pos/hybrid-catalog-pane";
import { HybridCartPane } from "@/components/pos/hybrid-cart-pane";
import { getProductsAction } from "@/lib/admin/product-actions";
import { getLaborServicesAction } from "@/lib/pos/actions";
import { useLaborServicesRealtime } from "@/lib/hooks/use-labor-services-realtime";
import type { Product } from "@/lib/types/product";
import type { LaborService } from "@/lib/types/service";

export default function AdminPosPage() {
  const { products, hydrateProducts } = useInventoryStore();
  const {
    items,
    totals,
    addPart,
    addService,
    isReceiptModalOpen,
    activeReceiptData,
    closeReceiptModal,
    checkout
  } = useCartStore();
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

  // Realtime multi-terminal labor rate updates
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
      const result = await checkout({
        cashier: "Admin Cashier",
        cashTendered: totals.total,
        paymentMethod: "Cash"
      });

      if (!result.success) {
        showToast("error", `Cannot complete checkout: ${result.error || `Insufficient stock for SKU ${result.sku}`}`);
        return;
      }

      showToast("success", `Sale completed successfully! Receipt #${result.receiptNumber}`);

      const updated = await getProductsAction();
      if (updated.length > 0) {
        hydrateProducts(updated);
      }
    } catch (err) {
      console.error("[Admin POS] Checkout error:", err);
      showToast("error", "Unexpected error occurred during checkout processing.");
    } finally {
      setIsProcessing(false);
    }
  }, [items, isProcessing, totals, checkout, showToast, hydrateProducts]);

  // Keyboard shortcut F12 checkout
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
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Point of Sale (POS) Cashier</h2>
          <p className="text-xs text-text-secondary">
            Hybrid billing for parts sales, workshop bay labor line items, and dual-tier pricing.
          </p>
        </div>
      </div>

      {/* High-Contrast Toast Notification Banner */}
      {toastMessage && (
        <output
          className={`p-3 rounded-lg border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md transition-all ${
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

      {/* POS Terminal Workspace */}
      <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-13rem)]">
        {/* Left Pane: Catalog */}
        <HybridCatalogPane
          products={products}
          laborServices={laborServices}
          onSelectProduct={handleSelectProduct}
          onSelectService={handleSelectService}
          title="Parts & Services Catalog"
        />

        {/* Right Pane: Hybrid Cart */}
        <HybridCartPane
          ticketNumber="TX-ADMIN-01"
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

      {/* Printable Thermal Receipt Modal */}
      <ThermalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={closeReceiptModal}
        receiptData={activeReceiptData}
      />
    </div>
  );
}

