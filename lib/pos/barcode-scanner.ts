/**
 * Barcode Scanner & POS Hotkey Domain Engine (SIAA-28)
 */

import type { Product } from "@/lib/types/product";
import type { LaborService } from "@/lib/types/service";
import type {
  BarcodeScanResult,
  BarcodeScanStatus
} from "@/specs/029-barcode-scan-pos-hotkeys/contracts/pos-barcode-hotkeys.contract";

export type { BarcodeScanResult, BarcodeScanStatus };

/**
 * Resolves a scanned barcode or manually entered SKU/code against active catalog products and labor services.
 * Follows lookup hierarchy:
 * 1. Exact SKU match (case-insensitive)
 * 2. Exact barcode match (case-insensitive)
 * 3. Exact labor service code match (case-insensitive)
 * 4. Substring product name match
 * 5. Substring labor service name match
 */
export function resolveBarcodeScanQuery(
  rawQuery: string,
  products: Product[],
  laborServices: LaborService[] = []
): BarcodeScanResult {
  const query = rawQuery.trim();
  if (!query) {
    return {
      status: "EMPTY_QUERY",
      query: "",
      requiresManagerOverride: false,
      message: "Scan query cannot be empty"
    };
  }

  const q = query.toLowerCase();

  // 1. Exact SKU match
  const exactSkuProduct = products.find((p) => p.sku.toLowerCase() === q);
  if (exactSkuProduct) {
    if (exactSkuProduct.stock <= 0) {
      return {
        status: "OUT_OF_STOCK_OVERRIDE",
        query,
        matchedItem: exactSkuProduct,
        itemType: "PART",
        requiresManagerOverride: true,
        message: `Item ${exactSkuProduct.sku} is out of stock. Manager override required.`
      };
    }
    return {
      status: "MATCHED_PART",
      query,
      matchedItem: exactSkuProduct,
      itemType: "PART",
      requiresManagerOverride: false
    };
  }

  // 2. Exact Barcode match
  const exactBarcodeProduct = products.find(
    (p) => p.barcode && p.barcode.toLowerCase() === q
  );
  if (exactBarcodeProduct) {
    if (exactBarcodeProduct.stock <= 0) {
      return {
        status: "OUT_OF_STOCK_OVERRIDE",
        query,
        matchedItem: exactBarcodeProduct,
        itemType: "PART",
        requiresManagerOverride: true,
        message: `Item ${exactBarcodeProduct.sku} is out of stock. Manager override required.`
      };
    }
    return {
      status: "MATCHED_PART",
      query,
      matchedItem: exactBarcodeProduct,
      itemType: "PART",
      requiresManagerOverride: false
    };
  }

  // 3. Exact Labor Service Code match
  const exactService = laborServices.find((s) => s.code.toLowerCase() === q);
  if (exactService) {
    return {
      status: "MATCHED_SERVICE",
      query,
      matchedItem: exactService,
      itemType: "SERVICE",
      requiresManagerOverride: false
    };
  }

  // 4. Substring product name match
  const partialNameProduct = products.find((p) =>
    p.name.toLowerCase().includes(q)
  );
  if (partialNameProduct) {
    if (partialNameProduct.stock <= 0) {
      return {
        status: "OUT_OF_STOCK_OVERRIDE",
        query,
        matchedItem: partialNameProduct,
        itemType: "PART",
        requiresManagerOverride: true,
        message: `Item ${partialNameProduct.sku} is out of stock. Manager override required.`
      };
    }
    return {
      status: "MATCHED_PART",
      query,
      matchedItem: partialNameProduct,
      itemType: "PART",
      requiresManagerOverride: false
    };
  }

  // 5. Substring labor service name match
  const partialNameService = laborServices.find((s) =>
    s.name.toLowerCase().includes(q)
  );
  if (partialNameService) {
    return {
      status: "MATCHED_SERVICE",
      query,
      matchedItem: partialNameService,
      itemType: "SERVICE",
      requiresManagerOverride: false
    };
  }

  // 6. Not Found Fallback
  return {
    status: "NOT_FOUND",
    query,
    requiresManagerOverride: false,
    message: "Item code or barcode not found"
  };
}

export type PosHotkeyEvaluationResult =
  | {
      action: "CHECKOUT_PAY";
      preventDefault: true;
      canExecute: true;
    }
  | {
      action: "CHECKOUT_PAY";
      preventDefault: true;
      canExecute: false;
      reason: "CART_EMPTY" | "MODAL_ACTIVE" | "SHIFT_INACTIVE" | "UNAUTHORIZED_ROLE";
      message?: string;
    }
  | {
      action: "CLOSE_MODAL";
      preventDefault: boolean;
      canExecute: boolean;
    }
  | {
      action: "NONE";
      preventDefault: false;
      canExecute: false;
    };

/**
 * Pure evaluator for physical keyboard hotkeys (F12, F9, Escape) on the Fast-Lane POS interface.
 */
export function evaluatePosHotkey(
  key: string,
  options: {
    cartItemCount: number;
    isModalOpen: boolean;
    isShiftActive?: boolean;
    userRole?: string;
  }
): PosHotkeyEvaluationResult {
  if (key === "F12" || key === "F9") {
    if (options.isModalOpen) {
      return {
        action: "CHECKOUT_PAY",
        preventDefault: true,
        canExecute: false,
        reason: "MODAL_ACTIVE"
      };
    }
    if (options.cartItemCount === 0) {
      return {
        action: "CHECKOUT_PAY",
        preventDefault: true,
        canExecute: false,
        reason: "CART_EMPTY",
        message: "Cannot checkout: Cart is empty."
      };
    }
    if (options.isShiftActive === false) {
      return {
        action: "CHECKOUT_PAY",
        preventDefault: true,
        canExecute: false,
        reason: "SHIFT_INACTIVE",
        message: "Active Shift Required: You must clock in / time in before processing customer orders."
      };
    }
    if (options.userRole !== undefined) {
      const normalizedRole = options.userRole.toLowerCase();
      if (normalizedRole !== "cashier" && normalizedRole !== "admin") {
        return {
          action: "CHECKOUT_PAY",
          preventDefault: true,
          canExecute: false,
          reason: "UNAUTHORIZED_ROLE",
          message: "Access Restricted: Only active Cashiers or Store Managers can process sales and accept payments."
        };
      }
    }
    return {
      action: "CHECKOUT_PAY",
      preventDefault: true,
      canExecute: true
    };
  }

  if (key === "Escape") {
    return {
      action: "CLOSE_MODAL",
      preventDefault: true,
      canExecute: options.isModalOpen
    };
  }

  return {
    action: "NONE",
    preventDefault: false,
    canExecute: false
  };
}
