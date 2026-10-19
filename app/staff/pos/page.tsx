"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { useCartStore } from "@/lib/store/cart-store";
import { usePunchStore } from "@/lib/store/punch-store";
import { ManagerOverrideModal } from "@/components/staff/pos/manager-override-modal";
import { ThermalReceiptModal } from "@/components/pos/thermal-receipt-modal";
import { CashTenderModal } from "@/components/pos/cash-tender-modal";
import { ActiveShiftGuardModal } from "@/components/pos/active-shift-guard-modal";
import { HybridCatalogPane } from "@/components/pos/hybrid-catalog-pane";
import { HybridCartPane } from "@/components/pos/hybrid-cart-pane";
import { getProductsAction } from "@/lib/admin/product-actions";
import { getLaborServicesAction } from "@/lib/pos/actions";
import { useLaborServicesRealtime } from "@/lib/hooks/use-labor-services-realtime";
import { evaluatePosHotkey } from "@/lib/pos/barcode-scanner";
import type { Product } from "@/lib/types/product";
import type { LaborService } from "@/lib/types/service";

export default function StaffPosPage() {
  const { products, hydrateProducts } = useInventoryStore();
  const { isShiftActive, shiftStatus, currentStaff } = usePunchStore();
  const {
    items,
    totals,
    addPart,
    addService,
    isPaymentModalOpen,
    openPaymentModal,
    closePaymentModal,
    isReceiptModalOpen,
    activeReceiptData,
    closeReceiptModal,
    checkout
  } = useCartStore();
  const [laborServices, setLaborServices] = useState<LaborService[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShiftGuardModalOpen, setIsShiftGuardModalOpen] = useState(false);
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

  const handleOpenPayment = useCallback(() => {
    if (items.length === 0 || isProcessing) return;
    if (!isShiftActive || shiftStatus !== "on_shift") {
      setIsShiftGuardModalOpen(true);
      return;
    }
    openPaymentModal();
  }, [items.length, isProcessing, isShiftActive, shiftStatus, openPaymentModal]);

  const handleConfirmPayment = useCallback(async (cashTendered: number) => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      const cashierName = currentStaff?.trim() || "Staff Cashier";
      const result = await checkout({
        cashier: cashierName,
        cashTendered,
        paymentMethod: "Cash"
      });

      if (!result.success) {
        const errorDetail = result.error || (result.sku ? `Insufficient stock for SKU ${result.sku}` : 'Checkout failed');
        showToast("error", `Cannot complete checkout: ${errorDetail}`);
        return;
      }

      showToast("success", `Sale completed successfully! Receipt #${result.receiptNumber}`);

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
  }, [items, isProcessing, currentStaff, checkout, showToast, hydrateProducts]);

  const handleScanNotFound = useCallback(() => {
    showToast("error", "Item code or barcode not found");
  }, [showToast]);

  const handleCloseModals = useCallback(() => {
    if (isPaymentModalOpen) closePaymentModal();
    if (isReceiptModalOpen) closeReceiptModal();
    if (isShiftGuardModalOpen) setIsShiftGuardModalOpen(false);
    if (isOverrideModalOpen) {
      setIsOverrideModalOpen(false);
      setPendingOverrideProduct(null);
    }
  }, [
    isPaymentModalOpen,
    isReceiptModalOpen,
    isShiftGuardModalOpen,
    isOverrideModalOpen,
    closePaymentModal,
    closeReceiptModal
  ]);

  // Keyboard hotkey for F12 checkout: if modal is not open, open payment modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAnyModalOpen =
        isPaymentModalOpen ||
        isReceiptModalOpen ||
        isOverrideModalOpen ||
        isShiftGuardModalOpen;

      const evaluation = evaluatePosHotkey(e.key, {
        cartItemCount: items.length,
        isModalOpen: isAnyModalOpen,
        isShiftActive: isShiftActive && shiftStatus === "on_shift"
      });

      if (evaluation.action === "CHECKOUT_PAY") {
        if (evaluation.preventDefault) e.preventDefault();
        if (evaluation.canExecute) {
          handleOpenPayment();
          return;
        }
        if (evaluation.reason === "SHIFT_INACTIVE") {
          setIsShiftGuardModalOpen(true);
          return;
        }
        if (evaluation.reason === "CART_EMPTY") {
          showToast("error", evaluation.message || "Cannot checkout: Cart is empty.");
        }
        return;
      }

      if (evaluation.action === "CLOSE_MODAL" && evaluation.canExecute) {
        handleCloseModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    items.length,
    isPaymentModalOpen,
    isReceiptModalOpen,
    isOverrideModalOpen,
    isShiftGuardModalOpen,
    isShiftActive,
    shiftStatus,
    handleOpenPayment,
    handleCloseModals,
    showToast
  ]);

  return (
    <section
      id="view-staff-pos"
      className="flex flex-col gap-3 h-[calc(100vh-6.5rem)] animate-in fade-in duration-200"
    >
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
          onScanNotFound={handleScanNotFound}
          title="Fast-Lane Checkout"
        />

        {/* Right Pane: Hybrid Active Ticket & Cart */}
        <HybridCartPane
          ticketNumber="TX-1043"
          catalogProducts={products}
          onRequireOverride={handleRequireOverride}
          onCompleteSale={handleOpenPayment}
          isProcessing={isProcessing}
          isShiftActive={isShiftActive}
          shiftStatus={shiftStatus}
        />
      </div>

      {/* Active Shift Time-In Guard Modal (SIAA-74) */}
      <ActiveShiftGuardModal
        isOpen={isShiftGuardModalOpen}
        shiftStatus={shiftStatus}
        currentStaff={currentStaff}
        onClose={() => setIsShiftGuardModalOpen(false)}
      />

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

      {/* Cash Tender & Change Calculation Modal (SIAA-21) */}
      <CashTenderModal
        isOpen={isPaymentModalOpen}
        totalDue={totals.total}
        isProcessing={isProcessing}
        onClose={closePaymentModal}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Printable Thermal Receipt Modal */}
      <ThermalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={closeReceiptModal}
        onFinish={() => {
          closeReceiptModal();
          showToast("success", "Receipt printed & checkout session finalized.");
        }}
        receiptData={activeReceiptData}
      />
    </section>
  );
}

