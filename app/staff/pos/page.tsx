"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { useCartStore } from "@/lib/store/cart-store";
import { usePunchStore } from "@/lib/store/punch-store";
import { getRolePrimaryRoute } from "@/lib/staff/navigation";
import { ManagerOverrideModal } from "@/components/staff/pos/manager-override-modal";
import { UnauthorizedRoleModal } from "@/components/pos/unauthorized-role-modal";
import { PosManagerOverrideModal } from "@/components/pos/manager-override-modal";
import { ThermalReceiptModal } from "@/components/pos/thermal-receipt-modal";
import { CashTenderModal } from "@/components/pos/cash-tender-modal";
import { ActiveShiftGuardModal } from "@/components/pos/active-shift-guard-modal";
import { CustomerIntakeModal } from "@/components/pos/customer-intake-modal";
import { HybridCatalogPane } from "@/components/pos/hybrid-catalog-pane";
import { HybridCartPane } from "@/components/pos/hybrid-cart-pane";
import { getProductsAction } from "@/lib/admin/product-actions";
import { getLaborServicesAction } from "@/lib/pos/actions";
import { useLaborServicesRealtime } from "@/lib/hooks/use-labor-services-realtime";
import { evaluatePosHotkey } from "@/lib/pos/barcode-scanner";
import { evaluatePosCheckoutAuthorization } from "@/lib/contracts/checkout-guard";
import { logSecurityEventAction } from "@/lib/admin/audit-actions";
import type { Product } from "@/lib/types/product";
import type { LaborService } from "@/lib/types/service";
import type { CustomerIntakeInput } from "@/lib/workshop/intake-dispatch-contracts";

export default function StaffPosPage() {
  const router = useRouter();
  const { products, hydrateProducts } = useInventoryStore();
  const { isShiftActive, shiftStatus, currentStaff, currentStaffRole } = usePunchStore();
  const isUnauthorizedRole = Boolean(
    currentStaffRole && currentStaffRole !== "cashier" && currentStaffRole !== "admin"
  );
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
  const [isUnauthorizedRoleModalOpen, setIsUnauthorizedRoleModalOpen] = useState(false);
  const [isManagerElevationModalOpen, setIsManagerElevationModalOpen] = useState(false);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [intakeData, setIntakeData] = useState<CustomerIntakeInput | null>(null);
  const [hasOneTimeManagerOverride, setHasOneTimeManagerOverride] = useState(false);
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

  // SIAA-85: Route guard redirecting non-cashier roles (mechanic, inventory_clerk, staff) to authorized workspace
  useEffect(() => {
    if (isUnauthorizedRole) {
      const { targetPath, notificationMessage } = getRolePrimaryRoute(currentStaffRole);
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("swift_staff_redirect_toast", notificationMessage);
        }
      } catch {}
      router.replace(targetPath);
    }
  }, [isUnauthorizedRole, currentStaffRole, router]);

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

  const logUnauthorizedCheckoutAttempt = useCallback(
    (attemptedRole: string) => {
      logSecurityEventAction({
        action: `Unauthorized POS Checkout Attempt by ${currentStaff || 'Floor Staff'} (${attemptedRole})`,
        severity: 'warning',
        terminalIp: 'Terminal #01 (Shop Floor)',
        userEmail: `${attemptedRole}@swift.local`,
        metadata: {
          attemptedRole,
          staffName: currentStaff || 'Floor Staff',
          cartItemCount: items.length,
          cartTotal: totals.total,
          reason: 'UNAUTHORIZED_ROLE',
          attemptedAt: new Date().toISOString(),
        },
      }).catch((err) => {
        console.warn('[Staff POS] Audit logging warning:', err);
      });
    },
    [currentStaff, items.length, totals.total]
  );

  const handleOpenPayment = useCallback(() => {
    if (items.length === 0 || isProcessing) return;

    if (!isShiftActive || shiftStatus !== "on_shift") {
      setIsShiftGuardModalOpen(true);
      return;
    }

    const auth = evaluatePosCheckoutAuthorization({
      isShiftActive: isShiftActive && shiftStatus === "on_shift",
      shiftStatus,
      currentStaffRole,
      cartItemCount: items.length,
      isProcessing,
      hasOneTimeManagerOverride,
    });

    if (!auth.allowed) {
      if (auth.reason === "UNAUTHORIZED_ROLE") {
        setIsUnauthorizedRoleModalOpen(true);
        logUnauthorizedCheckoutAttempt(auth.attemptedRole);
        return;
      }
      if (auth.reason === "SHIFT_INACTIVE") {
        setIsShiftGuardModalOpen(true);
        return;
      }
      if (auth.reason === "CART_EMPTY") {
        showToast("error", auth.message);
        return;
      }
      return;
    }

    const hasServiceItems = items.some((item) => item.type === "service");
    if (hasServiceItems && !intakeData) {
      setIsIntakeModalOpen(true);
      return;
    }

    if (hasOneTimeManagerOverride) {
      setHasOneTimeManagerOverride(false);
    }
    openPaymentModal();
  }, [
    items,
    isProcessing,
    isShiftActive,
    shiftStatus,
    currentStaffRole,
    hasOneTimeManagerOverride,
    intakeData,
    logUnauthorizedCheckoutAttempt,
    openPaymentModal,
    showToast,
  ]);

  const handleIntakeSubmit = useCallback(
    (intake: CustomerIntakeInput) => {
      setIntakeData(intake);
      setIsIntakeModalOpen(false);
      openPaymentModal();
    },
    [openPaymentModal]
  );

  const handleRequestManagerOverride = useCallback(() => {
    setIsUnauthorizedRoleModalOpen(false);
    setIsManagerElevationModalOpen(true);
  }, []);

  const handleManagerOverrideSuccess = useCallback(() => {
    setIsManagerElevationModalOpen(false);
    setHasOneTimeManagerOverride(true);
    showToast("success", "Manager override approved: One-time checkout authorized.");
    const hasServiceItems = items.some((item) => item.type === "service");
    if (hasServiceItems && !intakeData) {
      setIsIntakeModalOpen(true);
    } else {
      openPaymentModal();
    }
  }, [items, intakeData, openPaymentModal, showToast]);

  const handleConfirmPayment = useCallback(async (cashTendered: number) => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      const cashierName = currentStaff?.trim() || "Staff Cashier";
      const result = await checkout({
        cashier: cashierName,
        cashTendered,
        paymentMethod: "Cash",
        customerName: intakeData?.customerName,
        customerPhone: intakeData?.customerPhone,
        vehicleModel: intakeData?.vehicleModel,
        plateNumber: intakeData?.plateNumber,
        notes: intakeData?.complaints,
      });

      if (!result.success) {
        const errorDetail = result.error || (result.sku ? `Insufficient stock for SKU ${result.sku}` : 'Checkout failed');
        showToast("error", `Cannot complete checkout: ${errorDetail}`);
        return;
      }

      setIntakeData(null);
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
  }, [items, isProcessing, currentStaff, checkout, intakeData, showToast, hydrateProducts]);

  const handleScanNotFound = useCallback(() => {
    showToast("error", "Item code or barcode not found");
  }, [showToast]);

  const handleCloseModals = useCallback(() => {
    if (isPaymentModalOpen) closePaymentModal();
    if (isReceiptModalOpen) closeReceiptModal();
    if (isIntakeModalOpen) setIsIntakeModalOpen(false);
    if (isShiftGuardModalOpen) setIsShiftGuardModalOpen(false);
    if (isUnauthorizedRoleModalOpen) setIsUnauthorizedRoleModalOpen(false);
    if (isManagerElevationModalOpen) setIsManagerElevationModalOpen(false);
    if (isOverrideModalOpen) {
      setIsOverrideModalOpen(false);
      setPendingOverrideProduct(null);
    }
  }, [
    isPaymentModalOpen,
    isReceiptModalOpen,
    isIntakeModalOpen,
    isShiftGuardModalOpen,
    isUnauthorizedRoleModalOpen,
    isManagerElevationModalOpen,
    isOverrideModalOpen,
    closePaymentModal,
    closeReceiptModal
  ]);

  // Keyboard hotkey for F12 / F9 checkout: if modal is not open, open payment modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAnyModalOpen =
        isPaymentModalOpen ||
        isReceiptModalOpen ||
        isIntakeModalOpen ||
        isOverrideModalOpen ||
        isShiftGuardModalOpen ||
        isUnauthorizedRoleModalOpen ||
        isManagerElevationModalOpen;

      const evaluation = evaluatePosHotkey(e.key, {
        cartItemCount: items.length,
        isModalOpen: isAnyModalOpen,
        isShiftActive: isShiftActive && shiftStatus === "on_shift",
        userRole: hasOneTimeManagerOverride ? "admin" : currentStaffRole,
      });

      if (evaluation.action === "CHECKOUT_PAY") {
        if (evaluation.preventDefault) e.preventDefault();
        if (evaluation.canExecute) {
          handleOpenPayment();
          return;
        }
        if (evaluation.reason === "UNAUTHORIZED_ROLE") {
          setIsUnauthorizedRoleModalOpen(true);
          logUnauthorizedCheckoutAttempt(currentStaffRole);
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
    isUnauthorizedRoleModalOpen,
    isManagerElevationModalOpen,
    isIntakeModalOpen,
    isShiftActive,
    shiftStatus,
    currentStaffRole,
    hasOneTimeManagerOverride,
    logUnauthorizedCheckoutAttempt,
    handleOpenPayment,
    handleCloseModals,
    showToast
  ]);

  if (isUnauthorizedRole) {
    const { targetPath, notificationMessage } = getRolePrimaryRoute(currentStaffRole);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in">
        <div className="p-4 rounded-full bg-secondary/10 text-secondary mb-4">
          <AlertCircle className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">Redirecting to Authorized Tool</h2>
        <p className="text-sm text-text-muted max-w-md mb-4">{notificationMessage}</p>
        <button
          type="button"
          onClick={() => router.replace(targetPath)}
          className="px-4 py-2 rounded-md bg-secondary text-white font-medium text-xs hover:bg-secondary-hover cursor-pointer"
        >
          Proceed to Workspace
        </button>
      </div>
    );
  }

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
          showTitle={false}
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

      {/* Unauthorized Role Checkout Guard Modal (SIAA-84) */}
      <UnauthorizedRoleModal
        isOpen={isUnauthorizedRoleModalOpen}
        currentStaff={currentStaff}
        currentStaffRole={currentStaffRole}
        onClose={() => setIsUnauthorizedRoleModalOpen(false)}
        onRequestOverride={handleRequestManagerOverride}
      />

      {/* Manager Elevation Override for Checkout (SIAA-84) */}
      <PosManagerOverrideModal
        isOpen={isManagerElevationModalOpen}
        onClose={() => setIsManagerElevationModalOpen(false)}
        onOverrideSuccess={handleManagerOverrideSuccess}
      />

      {/* Stock Depletion Manager Override Modal */}
      <ManagerOverrideModal
        isOpen={isOverrideModalOpen}
        product={pendingOverrideProduct}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setPendingOverrideProduct(null);
        }}
        onAuthorize={handleAuthorizedOverride}
      />

      {/* Customer & Vehicle Intake Modal for Labor Services (SIAA-101) */}
      <CustomerIntakeModal
        isOpen={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        onSubmit={handleIntakeSubmit}
        initialValues={intakeData || undefined}
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

