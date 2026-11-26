/**
 * POS Real-Time Availability Validation & Sold-Out Rejection Engine (SIAA-112)
 */

import type { Product } from "@/lib/types/product";
import type {
  PosScanStatus,
  PosScanValidationResponse,
  AvailabilityCheckResult
} from "@/specs/112-pos-realtime-availability-validation/contracts/pos-scan-validation.contract";

export type {
  PosScanStatus,
  PosScanValidationResponse,
  AvailabilityCheckResult
};

/**
 * Strictly evaluates product stock availability against the current cart quantity
 * before cart insertion or modification.
 *
 * Scenarios:
 * 1. product.stock <= 0 => OUT_OF_STOCK
 * 2. currentCartQty + requestedQty > product.stock => EXCEEDS_STOCK
 * 3. within stock ceiling => SUCCESS
 */
export function evaluateProductAvailability(
  product: Product,
  currentCartQty: number = 0,
  requestedQty: number = 1
): AvailabilityCheckResult {
  const stock = product.stock ?? 0;
  const targetQty = currentCartQty + requestedQty;

  // Scenario 2: Scanned item is completely sold out
  if (stock <= 0) {
    return {
      canAdd: false,
      status: "OUT_OF_STOCK",
      reason: "out_of_stock",
      message: "Item is sold out",
      availableStock: 0,
      currentCartQty,
      targetQty
    };
  }

  // Scenario 3: Scanned item quantity exceeds remaining inventory ceiling
  if (targetQty > stock) {
    return {
      canAdd: false,
      status: "EXCEEDS_STOCK",
      reason: "exceeds_stock",
      message: `Cannot add another ${product.name}: Exceeds available stock (${stock} units max)`,
      availableStock: stock,
      currentCartQty,
      targetQty
    };
  }

  // Scenario 1: Scanned item is in stock and available in sufficient quantity
  return {
    canAdd: true,
    status: "SUCCESS",
    availableStock: stock,
    currentCartQty,
    targetQty
  };
}

export interface BuildValidationResponseParams {
  status: PosScanStatus;
  product?: Product;
  rawQuery?: string;
  activePrice?: number;
  availableStock?: number;
  requestedQty?: number;
  currentCartQty?: number;
  targetQty?: number;
  cartItemCount?: number;
  cartTotal?: number;
  message?: string;
  timestamp?: number;
}

/**
 * Builds a standardized PosScanValidationResponse matching SIAA-112 & SIAA-113 telemetry contracts.
 */
export function buildPosScanValidationResponse(
  params: BuildValidationResponseParams
): PosScanValidationResponse {
  const timestamp = params.timestamp ?? Date.now();

  switch (params.status) {
    case "SUCCESS": {
      const product = params.product;
      const targetQty = params.targetQty ?? ((params.currentCartQty ?? 0) + (params.requestedQty ?? 1));
      const stockRemaining = product ? Math.max(0, (product.stock ?? 0) - targetQty) : 0;
      const price = params.activePrice ?? (product ? product.retail : 0);

      return {
        status: "SUCCESS",
        sku: product?.sku,
        name: product?.name,
        price,
        stockRemaining,
        cartItemCount: params.cartItemCount,
        cartTotal: params.cartTotal,
        timestamp
      };
    }

    case "OUT_OF_STOCK": {
      const product = params.product;
      return {
        status: "OUT_OF_STOCK",
        sku: product?.sku,
        name: product?.name,
        requestedQty: params.requestedQty ?? 1,
        availableStock: 0,
        message: params.message || "Item is sold out",
        timestamp
      };
    }

    case "EXCEEDS_STOCK": {
      const product = params.product;
      const stock = product?.stock ?? params.availableStock ?? 0;
      const currentCartQty = params.currentCartQty ?? stock;
      return {
        status: "EXCEEDS_STOCK",
        sku: product?.sku,
        name: product?.name,
        currentCartQty,
        availableStock: stock,
        message:
          params.message ||
          (product
            ? `Cannot add another ${product.name}: Exceeds available stock (${stock} units max)`
            : "Exceeds available stock"),
        timestamp
      };
    }

    case "NOT_FOUND":
    default: {
      return {
        status: "NOT_FOUND",
        query: params.rawQuery,
        message: params.message || "Barcode not found in catalog",
        timestamp
      };
    }
  }
}
