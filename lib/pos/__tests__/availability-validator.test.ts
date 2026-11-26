import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateProductAvailability,
  buildPosScanValidationResponse
} from "../availability-validator.ts";
import type { Product } from "@/lib/types/product";

const inStockProduct: Product = {
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
};

const soldOutProduct: Product = {
  sku: "HON-CLK-DRV01",
  barcode: "4809876543210",
  name: "Honda Click Drive Belt 125i",
  category: "Drivetrain",
  stock: 0,
  minThreshold: 3,
  location: "Rack D-01 / Shelf 2",
  cost: 400,
  wholesale: 470,
  retail: 550,
  oem: true,
  model: "Honda Click 125i/150i",
  brand: "Honda Genuine Parts"
};

const lowStockProduct: Product = {
  sku: "MOT-3100-10W40",
  barcode: "4710123456789",
  name: "Motul 3100 Silver 10W40 1L",
  category: "Fluids",
  stock: 2,
  minThreshold: 1,
  location: "Rack F-01 / Shelf 1",
  cost: 210,
  wholesale: 245,
  retail: 285,
  oem: false,
  model: "Universal",
  brand: "Motul"
};

describe("SIAA-112: POS Engine: Real-Time Availability Validation & Sold-Out Rejection", () => {
  describe("Scenario 1: Scanned item is in stock and available in sufficient quantity", () => {
    it("allows adding an in-stock product with stock > 0 when cart quantity is 0", () => {
      const result = evaluateProductAvailability(inStockProduct, 0, 1);

      assert.strictEqual(result.canAdd, true);
      assert.strictEqual(result.status, "SUCCESS");
      assert.strictEqual(result.availableStock, 12);
      assert.strictEqual(result.currentCartQty, 0);
      assert.strictEqual(result.targetQty, 1);
    });

    it("builds a SUCCESS broadcast payload with active retail price and remaining stock", () => {
      const payload = buildPosScanValidationResponse({
        status: "SUCCESS",
        product: inStockProduct,
        activePrice: 480,
        currentCartQty: 0,
        requestedQty: 1,
        cartItemCount: 1,
        cartTotal: 480
      });

      assert.strictEqual(payload.status, "SUCCESS");
      assert.strictEqual(payload.sku, "YAM-NMAX-BL01");
      assert.strictEqual(payload.name, "Yamaha NMAX Brake Pad Set");
      assert.strictEqual(payload.price, 480);
      assert.strictEqual(payload.stockRemaining, 11);
      assert.strictEqual(payload.cartItemCount, 1);
      assert.strictEqual(payload.cartTotal, 480);
      assert.ok(payload.timestamp);
    });

    it("applies wholesale price in SUCCESS broadcast payload when wholesale tier is active", () => {
      const payload = buildPosScanValidationResponse({
        status: "SUCCESS",
        product: inStockProduct,
        activePrice: inStockProduct.wholesale,
        currentCartQty: 1,
        requestedQty: 1,
        cartItemCount: 2,
        cartTotal: 820
      });

      assert.strictEqual(payload.status, "SUCCESS");
      assert.strictEqual(payload.price, 410);
      assert.strictEqual(payload.stockRemaining, 10);
      assert.strictEqual(payload.cartTotal, 820);
    });
  });

  describe("Scenario 2: Scanned item is completely sold out (zero or negative stock)", () => {
    it("strictly rejects adding a product with stock <= 0", () => {
      const result = evaluateProductAvailability(soldOutProduct, 0, 1);

      assert.strictEqual(result.canAdd, false);
      assert.strictEqual(result.status, "OUT_OF_STOCK");
      assert.strictEqual(result.reason, "out_of_stock");
      assert.strictEqual(result.availableStock, 0);
      assert.strictEqual(result.message, "Item is sold out");
    });

    it("builds an OUT_OF_STOCK broadcast payload with message 'Item is sold out'", () => {
      const payload = buildPosScanValidationResponse({
        status: "OUT_OF_STOCK",
        product: soldOutProduct,
        requestedQty: 1
      });

      assert.strictEqual(payload.status, "OUT_OF_STOCK");
      assert.strictEqual(payload.sku, "HON-CLK-DRV01");
      assert.strictEqual(payload.name, "Honda Click Drive Belt 125i");
      assert.strictEqual(payload.requestedQty, 1);
      assert.strictEqual(payload.availableStock, 0);
      assert.strictEqual(payload.message, "Item is sold out");
    });
  });

  describe("Scenario 3: Scanned item quantity exceeds remaining inventory ceiling", () => {
    it("rejects adding when cart quantity already equals stock ceiling (2 of 2)", () => {
      const result = evaluateProductAvailability(lowStockProduct, 2, 1);

      assert.strictEqual(result.canAdd, false);
      assert.strictEqual(result.status, "EXCEEDS_STOCK");
      assert.strictEqual(result.reason, "exceeds_stock");
      assert.strictEqual(result.availableStock, 2);
      assert.strictEqual(result.currentCartQty, 2);
      assert.strictEqual(
        result.message,
        "Cannot add another Motul 3100 Silver 10W40 1L: Exceeds available stock (2 units max)"
      );
    });

    it("builds an EXCEEDS_STOCK broadcast payload with currentCartQty and availableStock", () => {
      const payload = buildPosScanValidationResponse({
        status: "EXCEEDS_STOCK",
        product: lowStockProduct,
        currentCartQty: 2,
        availableStock: 2
      });

      assert.strictEqual(payload.status, "EXCEEDS_STOCK");
      assert.strictEqual(payload.sku, "MOT-3100-10W40");
      assert.strictEqual(payload.name, "Motul 3100 Silver 10W40 1L");
      assert.strictEqual(payload.currentCartQty, 2);
      assert.strictEqual(payload.availableStock, 2);
      assert.ok(payload.message?.includes("Exceeds available stock (2 units max)"));
    });
  });

  describe("Scenario 4: Unrecognized barcode or non-catalog SKU resolution", () => {
    it("builds a NOT_FOUND broadcast payload with query and message", () => {
      const payload = buildPosScanValidationResponse({
        status: "NOT_FOUND",
        rawQuery: "UNKNOWN-CODE-123"
      });

      assert.strictEqual(payload.status, "NOT_FOUND");
      assert.strictEqual(payload.query, "UNKNOWN-CODE-123");
      assert.strictEqual(payload.message, "Barcode not found in catalog");
    });
  });
});
