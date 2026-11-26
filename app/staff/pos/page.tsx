"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Smartphone, RefreshCw } from "lucide-react";
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
import { ScannerPairingModal } from "@/components/pos/scanner-pairing-modal";
import { HybridCatalogPane } from "@/components/pos/hybrid-catalog-pane";
import { HybridCartPane } from "@/components/pos/hybrid-cart-pane";
import { getProductsAction } from "@/lib/admin/product-actions";
import { getLaborServicesAction } from "@/lib/pos/actions";
import { useLaborServicesRealtime } from "@/lib/hooks/use-labor-services-realtime";
import { useInventoryRealtime } from "@/lib/hooks/use-inventory-realtime";
import { usePosScannerChannel } from "@/lib/hooks/use-pos-scanner-channel";
import { createScannerSessionInfo, type ScannerSessionInfo } from "@/lib/pos/scanner-session";
import { evaluatePosHotkey, resolveBarcodeScanQuery } from "@/lib/pos/barcode-scanner";
import { evaluatePosCheckoutAuthorization } from "@/lib/contracts/checkout-guard";
import { logSecurityEventAction } from "@/lib/admin/audit-actions";
import { buildPosScanValidationResponse } from "@/lib/pos/availability-validator";
import { broadcastPosScanValidation } from "@/lib/pos/companion-broadcast";
import { calculateCartTotals } from "@/lib/pos/discount-matrix";
import type { Product } from "@/lib/types/product";
import type { LaborService } from "@/lib/types/service";
import type { CustomerIntakeInput } from "@/lib/workshop/intake-dispatch-contracts";

function getScannerButtonClass(state: string): string {
  if (state === "CONNECTED") {
    return "bg-success-light text-success border-success/30 font-semibold";
  }
  if (state === "DISCONNECTED") {
    return "bg-surface-elevated text-text-primary border-border hover:bg-border/30";
  }
  return "bg-warning-light text-warning border-warning/30 animate-pulse font-semibold";
}

function getScannerButtonLabel(state: string, latencyMs?: number): string {
  if (state === "CONNECTED") {
    return `📱 Phone Connected (${latencyMs ?? 15}ms)`;
  }
  if (state === "WAITING_FOR_DEVICE") {
    return "📱 Waiting for Phone...";
  }
  return "📱 Pair Phone Scanner";
}

export default function StaffPosPage() {
  const router = useRouter();
  const { products, hydrateProducts } = useInventoryStore();

  // Multi-terminal realtime sync with master products catalog
  useInventoryRealtime();

  const { isShiftActive, shiftStatus, currentStaff, currentStaffRole } = usePunchStore();
  const isUnauthorizedRole = Boolean(
    currentStaffRole && currentStaffRole !== "cashier" && currentStaffRole !== "admin"
  );
  const {
    items,
    totals,
    pricingMode,
    discountRate,
    discountType,
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

  // SIAA-111: Scanner session & pairing state
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [scannerSession, setScannerSession] = useState<ScannerSessionInfo | null>(() =>
    typeof window !== "undefined" ? createScannerSessionInfo("T1") : null
  );
  const [hasScannerDisconnected, setHasScannerDisconnected] = useState(false);

  const handleRegenerateSession = useCallback(() => {
    const newSession = createScannerSessionInfo("T1");
    setScannerSession(newSession);
    setHasScannerDisconnected(false);
  }, []);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  }, []);

  // Display redirect toast if routed from unauthorized workspace
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    try {
      if (typeof window !== "undefined") {
        const storedToast = sessionStorage.getItem("swift_staff_redirect_toast");
        if (storedToast) {
          sessionStorage.removeItem("swift_staff_redirect_toast");
          timer = setTimeout(() => {
            showToast("error", storedToast);
          }, 0);
        }
      }
    } catch {}
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showToast]);

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
      const existingItem = items.find((i) => i.type === "part" && i.sku === product.sku);
      const currentCartQty = existingItem ? existingItem.qty : 0;
      const targetQty = currentCartQty + 1;
      const activePrice = pricingMode === "wholesale" ? product.wholesale : product.retail;

      if (product.stock <= 0) {
        showToast("error", `Cannot add ${product.name}: Item is out of stock.`);
        broadcastPosScanValidation(
          buildPosScanValidationResponse({
            status: "OUT_OF_STOCK",
            product,
            requestedQty: 1,
            availableStock: 0,
            message: "Item is sold out"
          }),
          scannerSession?.sessionKey
        );
        return;
      }

      if (targetQty > product.stock) {
        showToast(
          "error",
          `Cannot add another ${product.name}: Exceeds available stock (${product.stock} units max)`
        );
        broadcastPosScanValidation(
          buildPosScanValidationResponse({
            status: "EXCEEDS_STOCK",
            product,
            currentCartQty,
            availableStock: product.stock,
            message: `Cannot add another ${product.name}: Exceeds available stock (${product.stock} units max)`
          }),
          scannerSession?.sessionKey
        );
        return;
      }

      const res = addPart(product, 1);
      if (!res.success) {
        if (res.reason === "exceeds_stock") {
          showToast(
            "error",
            `Cannot add another ${product.name}: Exceeds available stock (${product.stock} units max)`
          );
          broadcastPosScanValidation(
            buildPosScanValidationResponse({
              status: "EXCEEDS_STOCK",
              product,
              currentCartQty,
              availableStock: product.stock
            }),
            scannerSession?.sessionKey
          );
        } else {
          showToast("error", `Cannot add ${product.name}: Item is out of stock.`);
          broadcastPosScanValidation(
            buildPosScanValidationResponse({
              status: "OUT_OF_STOCK",
              product,
              requestedQty: 1,
              availableStock: 0,
              message: "Item is sold out"
            }),
            scannerSession?.sessionKey
          );
        }
        return;
      }

      const updatedTotals = calculateCartTotals(
        existingItem
          ? items.map((i) =>
              i.type === "part" && i.sku === product.sku ? { ...i, qty: targetQty } : i
            )
          : [
              ...items,
              {
                id: product.sku,
                type: "part",
                sku: product.sku,
                name: product.name,
                price: activePrice,
                qty: 1,
                location: product.location,
                retailPrice: product.retail,
                wholesalePrice: product.wholesale,
                stock: product.stock,
                minThreshold: product.minThreshold
              }
            ],
        discountRate,
        discountType
      );

      broadcastPosScanValidation(
        buildPosScanValidationResponse({
          status: "SUCCESS",
          product,
          activePrice,
          currentCartQty,
          requestedQty: 1,
          targetQty,
          cartItemCount: updatedTotals.itemCount,
          cartTotal: updatedTotals.total
        }),
        scannerSession?.sessionKey
      );
    },
    [items, pricingMode, discountRate, discountType, addPart, showToast, scannerSession?.sessionKey]
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

  const handleRequireOverride = useCallback(
    (product: Product) => {
      showToast("error", `Cannot increase quantity for ${product.name}: Exceeds available stock.`);
    },
    [showToast]
  );

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
    router,
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

  const handleScanNotFound = useCallback(
    (query?: string) => {
      const rawCode = query || "";
      showToast("error", "Item code or barcode not found");
      broadcastPosScanValidation(
        buildPosScanValidationResponse({
          status: "NOT_FOUND",
          rawQuery: rawCode,
          message: "Barcode not found in catalog"
        }),
        scannerSession?.sessionKey
      );
    },
    [showToast, scannerSession?.sessionKey]
  );

  // SIAA-111: Focus-agnostic background scan ingestion from paired companion phone
  const handleCompanionBarcodeScan = useCallback(
    (code: string) => {
      const result = resolveBarcodeScanQuery(code, products, laborServices);
      if (result.status === "MATCHED_PART" && result.matchedItem) {
        handleSelectProduct(result.matchedItem as Product);
      } else if (result.status === "MATCHED_SERVICE" && result.matchedItem) {
        handleSelectService(result.matchedItem as LaborService);
      } else if (result.status === "OUT_OF_STOCK_OVERRIDE" && result.matchedItem) {
        handleSelectProduct(result.matchedItem as Product);
      } else {
        handleScanNotFound(code);
      }
    },
    [products, laborServices, handleSelectProduct, handleSelectService, handleScanNotFound]
  );

  // SIAA-111: Connect to Supabase Realtime Broadcast channel
  const {
    connectionState: scannerConnectionState,
    telemetry: scannerTelemetry
  } = usePosScannerChannel({
    sessionKey: scannerSession?.sessionKey,
    terminalId: "T1",
    onBarcodeScanned: (code) => {
      handleCompanionBarcodeScan(code);
    },
    onDeviceConnected: (payload) => {
      setHasScannerDisconnected(false);
      showToast("success", `Phone scanner connected (${payload.device || "Mobile Device"})`);
    },
    onDeviceDisconnected: () => {
      setHasScannerDisconnected(true);
      showToast("error", "Phone scanner disconnected.");
    }
  });

  const handleCloseModals = useCallback(() => {
    if (isPaymentModalOpen) closePaymentModal();
    if (isReceiptModalOpen) closeReceiptModal();
    if (isIntakeModalOpen) setIsIntakeModalOpen(false);
    if (isShiftGuardModalOpen) setIsShiftGuardModalOpen(false);
    if (isUnauthorizedRoleModalOpen) setIsUnauthorizedRoleModalOpen(false);
    if (isManagerElevationModalOpen) setIsManagerElevationModalOpen(false);
    if (isPairingModalOpen) setIsPairingModalOpen(false);
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
    isPairingModalOpen,
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
        isManagerElevationModalOpen ||
        isPairingModalOpen;

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
    isPairingModalOpen,
    isIntakeModalOpen,
    isShiftActive,
    shiftStatus,
    currentStaffRole,
    hasOneTimeManagerOverride,
    logUnauthorizedCheckoutAttempt,
    handleOpenPayment,
    handleCloseModals,
    showToast,
    router,
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
          className={`p-3 rounded-lg border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md transition-all shrink-0 print:hidden ${
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

      {/* POS Top Action Bar (SIAA-111) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-surface border border-border shrink-0 print:hidden shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-text-primary tracking-wide">
            Fast-Lane Counter POS
          </span>
          <span className="text-2xs px-2 py-0.5 rounded bg-surface-elevated text-text-muted font-mono border border-border">
            Terminal T1
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* SIAA-111: Pair Phone Scanner Action Button */}
          <button
            type="button"
            onClick={() => setIsPairingModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${getScannerButtonClass(
              scannerConnectionState
            )}`}
            aria-label="Pair Phone Barcode Scanner"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>
              {getScannerButtonLabel(
                scannerConnectionState,
                scannerTelemetry.lastPingLatencyMs
              )}
            </span>
          </button>
        </div>
      </div>

      {/* SIAA-111: Scanner Disconnection Recovery Alert Banner */}
      {hasScannerDisconnected && scannerConnectionState === "DISCONNECTED" && (
        <div className="flex items-center justify-between p-2.5 px-3.5 rounded-lg border border-danger/30 bg-danger-light text-danger text-xs font-medium shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Companion phone scanner disconnected. Active cart items remain preserved.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsPairingModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-danger text-white text-2xs font-semibold hover:opacity-90 cursor-pointer transition-opacity"
          >
            <RefreshCw className="w-3 h-3" />
            1-Click Re-pair
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0 print:hidden">
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
        onProceed={() => {
          closeReceiptModal();
          showToast("success", "Checkout session finalized.");
        }}
        onFinish={() => {
          closeReceiptModal();
          showToast("success", "Receipt printed & checkout session finalized.");
        }}
        receiptData={activeReceiptData}
      />

      {/* POS Companion Phone Scanner Pairing Modal (SIAA-111) */}
      <ScannerPairingModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        sessionInfo={scannerSession}
        connectionState={scannerConnectionState}
        telemetry={scannerTelemetry}
        onRegenerateSession={handleRegenerateSession}
      />
    </section>
  );
}

