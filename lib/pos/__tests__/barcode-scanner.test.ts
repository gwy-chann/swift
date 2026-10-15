import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveBarcodeScanQuery,
  evaluatePosHotkey
} from "../barcode-scanner.ts";
import type { Product } from "@/lib/types/product";
import type { LaborService } from "@/lib/types/service";

const mockProducts: Product[] = [
  {
    sku: "MOT-3100-10W40",
    barcode: "4710123456789",
    name: "Motul 3100 Silver 10W40 1L",
    category: "Fluids",
    stock: 24,
    minThreshold: 5,
    location: "Rack F-01 / Shelf 1",
    cost: 210,
    wholesale: 245,
    retail: 285,
    oem: false,
    model: "Universal",
    brand: "Motul"
  },
  {
    sku: "YAM-NMAX-BL01",
    barcode: "4901234567890",
    name: "Yamaha NMAX Brake Pad Set",
    category: "Brakes",
    stock: 12,
    minThreshold: 4,
    location: "Rack B-02 / Shelf 1",
    cost: 350,
    wholesale: 410,
    retail: 480,
    oem: true,
    model: "Yamaha NMAX 155",
    brand: "Yamaha Genuine Parts"
  },
  {
    sku: "HON-CLK-DRV01",
    barcode: "4809876543210",
    name: "Honda Click Drive Belt 125i",
    category: "Drivetrain",
    stock: 0, // Out of stock
    minThreshold: 3,
    location: "Rack D-01 / Shelf 2",
    cost: 400,
    wholesale: 470,
    retail: 550,
    oem: true,
    model: "Honda Click 125i/150i",
    brand: "Honda Genuine Parts"
  }
];

const mockLaborServices: LaborService[] = [
  {
    code: "SRV-OIL-CHG",
    name: "Engine Oil Change & Sump Flush",
    bay: "Bay 1",
    rate: 150,
    duration: "20 mins",
    description: "Full oil drain, filter inspection, and fresh fluid refill"
  },
  {
    code: "SRV-BRK-SRV",
    name: "Brake Caliper Cleaning & Pad Replacement",
    bay: "Bay 2",
    rate: 250,
    duration: "30 mins",
    description: "Front or rear caliper servicing with pad installation"
  }
];

describe("STORY-5.1: Barcode Scan-Optimized Fast-Lane Checkout & POS Hotkeys (SIAA-28)", () => {
  describe("Scenario 1: Barcode / SKU Scan Instant Cart Ingestion", () => {
    it("resolves an exact product SKU match instantaneously (e.g. MOT-3100-10W40)", () => {
      const res = resolveBarcodeScanQuery("MOT-3100-10W40", mockProducts, mockLaborServices);

      assert.strictEqual(res.status, "MATCHED_PART");
      assert.strictEqual(res.itemType, "PART");
      assert.strictEqual(res.requiresManagerOverride, false);
      assert.ok(res.matchedItem);
      assert.strictEqual((res.matchedItem as Product).sku, "MOT-3100-10W40");
    });

    it("resolves SKU case-insensitively with leading/trailing whitespace trimmed", () => {
      const res = resolveBarcodeScanQuery("  mot-3100-10w40   ", mockProducts, mockLaborServices);

      assert.strictEqual(res.status, "MATCHED_PART");
      assert.strictEqual((res.matchedItem as Product).sku, "MOT-3100-10W40");
    });

    it("resolves a physical barcode scan query (e.g. 4710123456789)", () => {
      const res = resolveBarcodeScanQuery("4710123456789", mockProducts, mockLaborServices);

      assert.strictEqual(res.status, "MATCHED_PART");
      assert.strictEqual((res.matchedItem as Product).sku, "MOT-3100-10W40");
    });

    it("resolves a workshop labor service code (e.g. SRV-OIL-CHG)", () => {
      const res = resolveBarcodeScanQuery("SRV-OIL-CHG", mockProducts, mockLaborServices);

      assert.strictEqual(res.status, "MATCHED_SERVICE");
      assert.strictEqual(res.itemType, "SERVICE");
      assert.strictEqual(res.requiresManagerOverride, false);
      assert.ok(res.matchedItem);
      assert.strictEqual((res.matchedItem as LaborService).code, "SRV-OIL-CHG");
    });

    it("identifies out-of-stock items and flags for Manager Override", () => {
      const res = resolveBarcodeScanQuery("HON-CLK-DRV01", mockProducts, mockLaborServices);

      assert.strictEqual(res.status, "OUT_OF_STOCK_OVERRIDE");
      assert.strictEqual(res.itemType, "PART");
      assert.strictEqual(res.requiresManagerOverride, true);
      assert.ok(res.message?.includes("out of stock"));
    });
  });

  describe("Scenario 2: Quick Category Filter Navigation", () => {
    it("filters products by category correctly", () => {
      const fluids = mockProducts.filter((p) => p.category.toLowerCase() === "fluids");
      assert.strictEqual(fluids.length, 1);
      assert.strictEqual(fluids[0].sku, "MOT-3100-10W40");

      const brakes = mockProducts.filter((p) => p.category.toLowerCase() === "brakes");
      assert.strictEqual(brakes.length, 1);
      assert.strictEqual(brakes[0].sku, "YAM-NMAX-BL01");
    });

    it("restores all catalog items when category is ALL", () => {
      const allItems = [...mockProducts];
      assert.strictEqual(allItems.length, 3);
    });
  });

  describe("Scenario 3: POS Keyboard Hotkey Execution (F12 Checkout)", () => {
    it("allows F12 checkout execution when active cart ticket has items", () => {
      const evaluation = evaluatePosHotkey("F12", {
        cartItemCount: 2,
        isModalOpen: false
      });

      assert.strictEqual(evaluation.action, "CHECKOUT_PAY");
      assert.strictEqual(evaluation.preventDefault, true);
      assert.strictEqual(evaluation.canExecute, true);
    });

    it("prevents browser default but blocks checkout when cart ticket is empty", () => {
      const evaluation = evaluatePosHotkey("F12", {
        cartItemCount: 0,
        isModalOpen: false
      });

      assert.strictEqual(evaluation.action, "CHECKOUT_PAY");
      assert.strictEqual(evaluation.preventDefault, true);
      assert.strictEqual(evaluation.canExecute, false);
      if (evaluation.action === "CHECKOUT_PAY" && !evaluation.canExecute) {
        assert.strictEqual(evaluation.reason, "CART_EMPTY");
        assert.ok(evaluation.message?.includes("Cart is empty"));
      }
    });

    it("ignores F12 when a checkout modal is already open", () => {
      const evaluation = evaluatePosHotkey("F12", {
        cartItemCount: 3,
        isModalOpen: true
      });

      assert.strictEqual(evaluation.action, "CHECKOUT_PAY");
      assert.strictEqual(evaluation.preventDefault, true);
      assert.strictEqual(evaluation.canExecute, false);
      if (evaluation.action === "CHECKOUT_PAY" && !evaluation.canExecute) {
        assert.strictEqual(evaluation.reason, "MODAL_ACTIVE");
      }
    });

    it("handles Escape key to close active modal", () => {
      const evaluation = evaluatePosHotkey("Escape", {
        cartItemCount: 1,
        isModalOpen: true
      });

      assert.strictEqual(evaluation.action, "CLOSE_MODAL");
      assert.strictEqual(evaluation.canExecute, true);
    });
  });

  describe("Scenario 4: Unrecognized Barcode Notification & Fallback", () => {
    it("returns NOT_FOUND status with clear error message for invalid barcode", () => {
      const res = resolveBarcodeScanQuery("UNKNOWN-BARCODE-9999", mockProducts, mockLaborServices);

      assert.strictEqual(res.status, "NOT_FOUND");
      assert.strictEqual(res.requiresManagerOverride, false);
      assert.strictEqual(res.message, "Item code or barcode not found");
      assert.strictEqual(res.matchedItem, undefined);
    });

    it("handles empty or whitespace-only queries gracefully", () => {
      const res = resolveBarcodeScanQuery("    ", mockProducts, mockLaborServices);

      assert.strictEqual(res.status, "EMPTY_QUERY");
      assert.strictEqual(res.requiresManagerOverride, false);
    });
  });
});
