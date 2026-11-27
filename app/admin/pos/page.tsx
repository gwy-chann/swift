"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, AlertCircle, Smartphone, RefreshCw } from "lucide-react";
import { useInventoryStore } from "@/lib/store/inventory-store";
import { useCartStore } from "@/lib/store/cart-store";
import { ManagerOverrideModal } from "@/components/staff/pos/manager-override-modal";
import { ThermalReceiptModal } from "@/components/pos/thermal-receipt-modal";
import { CashTenderModal } from "@/components/pos/cash-tender-modal";
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
import { resolveBarcodeScanQuery } from "@/lib/pos/barcode-scanner";
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
    return "bg-bg-surface text-text-primary border-border hover:bg-bg-hover";
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

export default function AdminPosPage() {
  const { products, hydrateProducts } = useInventoryStore();

  // Multi-terminal realtime sync with master products catalog
  useInventoryRealtime();
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
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [intakeData, setIntakeData] = useState<CustomerIntakeInput | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // SIAA-111: Scanner session & pairing state
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [scannerSession, setScannerSession] = useState<ScannerSessionInfo | null>(null);
  const [hasScannerDisconnected, setHasScannerDisconnected] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setScannerSession((prev) => prev || createScannerSessionInfo("ADMIN-01"));
    });
  }, []);

  const handleRegenerateSession = useCallback(() => {
    const newSession = createScannerSessionInfo("ADMIN-01");
    setScannerSession(newSession);
    setHasScannerDisconnected(false);
  }, []);

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
        } else {
          showToast("error", `Cannot add ${product.name}: Insufficient stock available.`);
        }
        broadcastPosScanValidation(
          buildPosScanValidationResponse({
            status: "EXCEEDS_STOCK",
            product,
            currentCartQty,
            availableStock: product.stock,
            message: `Cannot add ${product.name}: Insufficient stock available.`
          }),
          scannerSession?.sessionKey
        );
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
  const lastProcessedCompanionScanRef = useRef<{ code: string; time: number } | null>(null);
  const handleCompanionBarcodeScan = useCallback(
    (code: string) => {
      const now = Date.now();
      if (
        lastProcessedCompanionScanRef.current &&
        lastProcessedCompanionScanRef.current.code === code &&
        now - lastProcessedCompanionScanRef.current.time < 500
      ) {
        return; // Suppress duplicate scan within 500ms
      }
      lastProcessedCompanionScanRef.current = { code, time: now };

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
    terminalId: "ADMIN-01",
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

  const handleOpenPayment = useCallback(() => {
    if (items.length === 0 || isProcessing) return;
    const hasServiceItems = items.some((item) => item.type === "service");
    if (hasServiceItems && !intakeData) {
      setIsIntakeModalOpen(true);
      return;
    }
    openPaymentModal();
  }, [items, isProcessing, intakeData, openPaymentModal]);

  const handleIntakeSubmit = useCallback(
    (intake: CustomerIntakeInput) => {
      setIntakeData(intake);
      setIsIntakeModalOpen(false);
      openPaymentModal();
    },
    [openPaymentModal]
  );

  const handleConfirmPayment = useCallback(async (cashTendered: number) => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await checkout({
        cashier: "Carlos Rodriguez (Admin)",
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
  }, [items, isProcessing, checkout, intakeData, showToast, hydrateProducts]);

  // Keyboard shortcut F12 checkout: if modal is not open, open payment modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" &&
        !isPaymentModalOpen &&
        !isIntakeModalOpen &&
        !isReceiptModalOpen &&
        !isOverrideModalOpen &&
        !isPairingModalOpen
      ) {
        e.preventDefault();
        handleOpenPayment();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaymentModalOpen, isIntakeModalOpen, isReceiptModalOpen, isOverrideModalOpen, isPairingModalOpen, handleOpenPayment]);

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-8.5rem)] animate-in fade-in duration-200">
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
      <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-bg-surface border border-border shrink-0 print:hidden shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-text-primary tracking-wide">
            Admin Counter POS
          </span>
          <span className="text-2xs px-2 py-0.5 rounded bg-bg-base text-text-muted font-mono border border-border">
            Terminal ADMIN-01
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

      {/* POS Terminal Workspace: Admin does NOT need to time in */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0 print:hidden">
        {/* Left Pane: Catalog */}
        <HybridCatalogPane
          products={products}
          laborServices={laborServices}
          onSelectProduct={handleSelectProduct}
          onSelectService={handleSelectService}
          onScanNotFound={handleScanNotFound}
          showTitle={false}
        />

        {/* Right Pane: Hybrid Cart with isAdmin=true */}
        <HybridCartPane
          ticketNumber="TX-ADMIN-01"
          catalogProducts={products}
          onRequireOverride={handleRequireOverride}
          onCompleteSale={handleOpenPayment}
          isProcessing={isProcessing}
          isAdmin={true}
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

      {/* SIAA-111: Scanner Pairing Modal */}
      <ScannerPairingModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        sessionInfo={scannerSession}
        connectionState={scannerConnectionState}
        telemetry={scannerTelemetry}
        onRegenerateSession={handleRegenerateSession}
      />
    </div>
  );
}
