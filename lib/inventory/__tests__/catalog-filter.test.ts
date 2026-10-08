import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterCatalogProducts,
  calculateCatalogStats,
  getStockHealthStatus,
  formatPeso
} from '../catalog-filter.ts';
import type { Product } from '../../types/product';

const SAMPLE_PRODUCTS: Product[] = [
  {
    sku: 'YAM-NMAX-BL01',
    name: 'OEM Front Brake Pads',
    category: 'Brakes',
    stock: 2,
    minThreshold: 5,
    location: 'Rack A-01 / Shelf 2',
    cost: 280,
    wholesale: 380,
    retail: 450,
    oem: true,
    model: 'Yamaha NMAX 155',
    brand: 'Yamaha Genuine Parts'
  },
  {
    sku: 'RCB-NMAX-BP02',
    name: 'RCB S-Series Ceramic Brake Pads',
    category: 'Brakes',
    stock: 14,
    minThreshold: 6,
    location: 'Rack A-01 / Shelf 3',
    cost: 350,
    wholesale: 480,
    retail: 580,
    oem: false,
    model: 'Yamaha NMAX 155',
    brand: 'Racing Boy'
  },
  {
    sku: 'MOT-3100-10W40',
    name: 'Motul 3100 Gold 4T 10W40 (1L)',
    category: 'Fluids',
    stock: 28,
    minThreshold: 15,
    location: 'Aisle 1 / Shelf 1',
    cost: 260,
    wholesale: 330,
    retail: 390,
    oem: false,
    model: 'Universal',
    brand: 'Motul'
  },
  {
    sku: 'HON-CLK-CVTB',
    name: 'OEM Drive Belt (Gates Bando)',
    category: 'Drivetrain',
    stock: 0,
    minThreshold: 8,
    location: 'Rack B-04 / Shelf 1',
    cost: 520,
    wholesale: 720,
    retail: 850,
    oem: true,
    model: 'Honda Click 125i/150i',
    brand: 'Honda OEM'
  }
];

describe('catalog-filter engine', () => {
  describe('getStockHealthStatus', () => {
    it('returns out_of_stock when stock is 0', () => {
      assert.equal(getStockHealthStatus({ stock: 0, minThreshold: 5 }), 'out_of_stock');
    });

    it('returns low when stock is greater than 0 but <= minThreshold', () => {
      assert.equal(getStockHealthStatus({ stock: 2, minThreshold: 5 }), 'low');
      assert.equal(getStockHealthStatus({ stock: 5, minThreshold: 5 }), 'low');
    });

    it('returns healthy when stock is strictly greater than minThreshold', () => {
      assert.equal(getStockHealthStatus({ stock: 6, minThreshold: 5 }), 'healthy');
      assert.equal(getStockHealthStatus({ stock: 20, minThreshold: 5 }), 'healthy');
    });
  });

  describe('filterCatalogProducts', () => {
    it('returns all products when criteria is empty', () => {
      const results = filterCatalogProducts(SAMPLE_PRODUCTS, {});
      assert.equal(results.length, 4);
    });

    it('filters case-insensitively across SKU, name, brand, model, location', () => {
      const bySku = filterCatalogProducts(SAMPLE_PRODUCTS, { query: 'yam-nmax' });
      assert.equal(bySku.length, 1);
      assert.equal(bySku[0].sku, 'YAM-NMAX-BL01');

      const byBrand = filterCatalogProducts(SAMPLE_PRODUCTS, { query: 'racing boy' });
      assert.equal(byBrand.length, 1);
      assert.equal(byBrand[0].sku, 'RCB-NMAX-BP02');

      const byModel = filterCatalogProducts(SAMPLE_PRODUCTS, { query: 'nmax 155' });
      assert.equal(byModel.length, 2);

      const byLocation = filterCatalogProducts(SAMPLE_PRODUCTS, { query: 'rack b-04' });
      assert.equal(byLocation.length, 1);
      assert.equal(byLocation[0].sku, 'HON-CLK-CVTB');
    });

    it('filters by category', () => {
      const brakes = filterCatalogProducts(SAMPLE_PRODUCTS, { category: 'Brakes' });
      assert.equal(brakes.length, 2);

      const fluids = filterCatalogProducts(SAMPLE_PRODUCTS, { category: 'Fluids' });
      assert.equal(fluids.length, 1);
      assert.equal(fluids[0].sku, 'MOT-3100-10W40');

      const all = filterCatalogProducts(SAMPLE_PRODUCTS, { category: 'All' });
      assert.equal(all.length, 4);
    });

    it('filters by stock status', () => {
      const inStock = filterCatalogProducts(SAMPLE_PRODUCTS, { stockStatus: 'in_stock' });
      assert.equal(inStock.length, 2); // RCB (14 > 6), Motul (28 > 15)

      const lowStock = filterCatalogProducts(SAMPLE_PRODUCTS, { stockStatus: 'low_stock' });
      assert.equal(lowStock.length, 1); // YAM-NMAX-BL01 (2 <= 5)

      const outOfStock = filterCatalogProducts(SAMPLE_PRODUCTS, { stockStatus: 'out_of_stock' });
      assert.equal(outOfStock.length, 1); // HON-CLK-CVTB (0)
    });

    it('combines multi-attribute criteria with AND logic', () => {
      const combined = filterCatalogProducts(SAMPLE_PRODUCTS, {
        query: 'nmax',
        category: 'Brakes',
        stockStatus: 'low_stock'
      });
      assert.equal(combined.length, 1);
      assert.equal(combined[0].sku, 'YAM-NMAX-BL01');
    });

    it('returns empty array when no product matches query', () => {
      const none = filterCatalogProducts(SAMPLE_PRODUCTS, { query: 'non-existent-xyz' });
      assert.equal(none.length, 0);
    });
  });

  describe('calculateCatalogStats', () => {
    it('accurately computes summary metrics', () => {
      const stats = calculateCatalogStats(SAMPLE_PRODUCTS);
      assert.equal(stats.totalSkus, 4);
      assert.equal(stats.lowStockCount, 1);
      assert.equal(stats.outOfStockCount, 1);
      // Valuation: (450 * 2) + (580 * 14) + (390 * 28) + (850 * 0) = 900 + 8120 + 10920 + 0 = 19940
      assert.equal(stats.totalValuation, 19940);
      assert.equal(stats.categoriesCount, 3); // Brakes, Fluids, Drivetrain
    });
  });

  describe('formatPeso', () => {
    it('formats numbers into standard Philippine Peso currency strings', () => {
      const formatted = formatPeso(450);
      assert.match(formatted, /₱\s*450\.00/);
    });
  });
});
