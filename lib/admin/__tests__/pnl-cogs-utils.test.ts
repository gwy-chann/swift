import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateNetProfit,
  calculateMarginPct,
  isHighYieldMargin,
  formatCurrencyPhp,
  formatUnitCount,
} from "../pnl-cogs-utils.ts";

describe("P&L and COGS Utilities (SIAA-36)", () => {
  describe("calculateNetProfit", () => {
    it("computes net profit as Gross Revenue minus COGS", () => {
      assert.equal(calculateNetProfit(45230.0, 29400.0), 15830.0);
      assert.equal(calculateNetProfit(9360.0, 6240.0), 3120.0);
      assert.equal(calculateNetProfit(6800.0, 1200.0), 5600.0);
    });

    it("handles zero COGS accurately for pure services", () => {
      assert.equal(calculateNetProfit(5000.0, 0), 5000.0);
    });

    it("handles negative profit when COGS exceeds revenue", () => {
      assert.equal(calculateNetProfit(1000.0, 1500.0), -500.0);
    });
  });

  describe("calculateMarginPct", () => {
    it("computes profit margin percentage rounded to 1 decimal place", () => {
      // 15830 / 45230 * 100 = 35.0011... -> 35.0%
      assert.equal(calculateMarginPct(45230.0, 29400.0), 35.0);
      // 3120 / 9360 * 100 = 33.333... -> 33.3%
      assert.equal(calculateMarginPct(9360.0, 6240.0), 33.3);
      // 2970 / 7650 * 100 = 38.8235... -> 38.8%
      assert.equal(calculateMarginPct(7650.0, 4680.0), 38.8);
      // 5600 / 6800 * 100 = 82.3529... -> 82.4%
      assert.equal(calculateMarginPct(6800.0, 1200.0), 82.4);
    });

    it("safely handles 0 or negative gross revenue without NaN or Infinity", () => {
      assert.equal(calculateMarginPct(0, 0), 0.0);
      assert.equal(calculateMarginPct(0, 100), 0.0);
      assert.equal(calculateMarginPct(-500, 200), 0.0);
    });
  });

  describe("isHighYieldMargin", () => {
    it("returns true when margin meets or exceeds target threshold of 30%", () => {
      assert.equal(isHighYieldMargin(35.0), true);
      assert.equal(isHighYieldMargin(30.0), true);
      assert.equal(isHighYieldMargin(82.4), true);
    });

    it("returns false when margin is below target threshold", () => {
      assert.equal(isHighYieldMargin(29.9), false);
      assert.equal(isHighYieldMargin(15.0), false);
      assert.equal(isHighYieldMargin(0), false);
    });
  });

  describe("formatCurrencyPhp", () => {
    it("formats numbers with Philippine Peso sign and comma separators", () => {
      assert.equal(formatCurrencyPhp(45230), "₱45,230.00");
      assert.equal(formatCurrencyPhp(29400.5), "₱29,400.50");
      assert.equal(formatCurrencyPhp(0), "₱0.00");
    });
  });

  describe("formatUnitCount", () => {
    it("formats workshop labor units as 'X Jobs'", () => {
      assert.equal(formatUnitCount("Workshop Labor", 14), "14 Jobs");
      assert.equal(formatUnitCount("Labor / Service Bay", 14), "14 Jobs");
      assert.equal(formatUnitCount("labor", 5), "5 Jobs");
    });

    it("formats physical part units as plain numbers", () => {
      assert.equal(formatUnitCount("Fluids & Engine Oils", 24), "24");
      assert.equal(formatUnitCount("Drivetrain & Belts", 8), "8");
      assert.equal(formatUnitCount("Tires & Tubeless", 6), "6");
    });
  });
});
