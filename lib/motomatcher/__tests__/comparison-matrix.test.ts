import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fromProductToComparisonPart,
  fromMatrixPartToComparisonPart,
  partitionComparisonParts,
  ComparisonPartItemSchema,
} from '../comparison-matrix-contracts.ts';
import type { Product } from '../../types/product.ts';
import type { MotoMatcherMatrixPart } from '../../types/motomatcher.ts';

describe('ComparisonMatrix Domain & Contracts (SIAA-24)', () => {
  const sampleOemProduct: Product = {
    sku: 'YAM-NMAX-BELT-OEM',
    name: 'Yamaha Genuine CVT V-Belt',
    category: 'Drivetrain',
    brand: 'Yamaha Genuine',
    model: 'Yamaha NMAX 155',
    retail: 1150,
    wholesale: 980,
    cost: 800,
    stock: 14,
    minThreshold: 5,
    location: 'Rack B-02 / Shelf 1',
    oem: true,
  };

  const sampleAftermarketProduct: Product = {
    sku: 'KOS-NMAX-BELT-RACE',
    name: 'Koso Racing Kevlar Reinforced Drive Belt',
    category: 'Drivetrain',
    brand: 'Koso Performance',
    model: 'Yamaha NMAX 155',
    retail: 1480,
    wholesale: 1250,
    cost: 1000,
    stock: 4,
    minThreshold: 5, // low stock!
    location: 'Rack D-04 / Shelf 3',
    oem: false,
  };

  const sampleUniversalProduct: Product = {
    sku: 'MOT-OIL-10W40-SCOOT',
    name: 'Motul Scooter Expert LE 10W-40 4T Engine Oil 1L',
    category: 'Fluids',
    brand: 'Motul',
    model: 'Universal',
    retail: 380,
    wholesale: 320,
    cost: 260,
    stock: 35,
    minThreshold: 10,
    location: 'Rack F-01 / Shelf 1',
    oem: false,
  };

  describe('fromProductToComparisonPart adapter', () => {
    it('correctly adapts an OEM product', () => {
      const part = fromProductToComparisonPart(sampleOemProduct);

      assert.equal(part.sku, 'YAM-NMAX-BELT-OEM');
      assert.equal(part.name, 'Yamaha Genuine CVT V-Belt');
      assert.equal(part.brand, 'Yamaha Genuine');
      assert.equal(part.retailPrice, 1150);
      assert.equal(part.wholesalePrice, 980);
      assert.equal(part.stockLevel, 14);
      assert.equal(part.minThreshold, 5);
      assert.equal(part.shelfLocation, 'Rack B-02 / Shelf 1');
      assert.equal(part.isOem, true);
      assert.equal(part.isUniversal, false);
      assert.equal(part.fitmentType, 'oem');
      assert.equal(part.rawProduct, sampleOemProduct);
    });

    it('correctly adapts an aftermarket upgrade product', () => {
      const part = fromProductToComparisonPart(sampleAftermarketProduct);

      assert.equal(part.sku, 'KOS-NMAX-BELT-RACE');
      assert.equal(part.isOem, false);
      assert.equal(part.isUniversal, false);
      assert.equal(part.fitmentType, 'aftermarket');
      assert.equal(part.stockLevel, 4);
      assert.equal(part.stockLevel <= part.minThreshold, true); // low stock condition
    });

    it('correctly flags a Universal product', () => {
      const part = fromProductToComparisonPart(sampleUniversalProduct);

      assert.equal(part.sku, 'MOT-OIL-10W40-SCOOT');
      assert.equal(part.isOem, false);
      assert.equal(part.isUniversal, true);
      assert.equal(part.fitmentType, 'universal');
    });
  });

  describe('fromMatrixPartToComparisonPart adapter', () => {
    it('adapts MotoMatcherMatrixPart with upsell badge metadata', () => {
      const matrixPart: MotoMatcherMatrixPart = {
        id: '00000000-0000-4000-8000-000000000001',
        sku: 'BRM-CALIPER-4POT',
        name: 'Brembo 4-Piston Radial Caliper',
        brand: 'Brembo',
        category: 'Brakes',
        retail_price: 5200,
        stock_level: 6,
        min_threshold: 2,
        shelf_location: 'Rack A-03 / Shelf 2',
        fitment_type: 'aftermarket',
        fitment_notes: 'Requires 260mm disc adapter',
        year_range: '2019-2024',
        is_universal: false,
        upsell_delta_amount: 3200,
        upsell_delta_percent: 160.0,
        upsell_badge: '+₱3,200.00 (+160.0%)',
        oem_reference_sku: 'YAM-CALIPER-OEM',
      };

      const part = fromMatrixPartToComparisonPart(matrixPart);

      assert.equal(part.id, '00000000-0000-4000-8000-000000000001');
      assert.equal(part.sku, 'BRM-CALIPER-4POT');
      assert.equal(part.retailPrice, 5200);
      assert.equal(part.isOem, false);
      assert.equal(part.fitmentType, 'aftermarket');
      assert.equal(part.upsellDeltaAmount, 3200);
      assert.equal(part.upsellBadge, '+₱3,200.00 (+160.0%)');
    });
  });

  describe('partitionComparisonParts logic', () => {
    it('partitions mixed parts cleanly into OEM vs Aftermarket lists', () => {
      const oemPart = fromProductToComparisonPart(sampleOemProduct);
      const amPart = fromProductToComparisonPart(sampleAftermarketProduct);
      const univPart = fromProductToComparisonPart(sampleUniversalProduct);

      const { oemParts, aftermarketParts } = partitionComparisonParts([
        oemPart,
        amPart,
        univPart,
      ]);

      assert.equal(oemParts.length, 1);
      assert.equal(oemParts[0].sku, 'YAM-NMAX-BELT-OEM');

      assert.equal(aftermarketParts.length, 2);
      assert.deepEqual(
        aftermarketParts.map((p) => p.sku),
        ['KOS-NMAX-BELT-RACE', 'MOT-OIL-10W40-SCOOT']
      );
    });

    it('gracefully handles empty list', () => {
      const { oemParts, aftermarketParts } = partitionComparisonParts([]);
      assert.deepEqual(oemParts, []);
      assert.deepEqual(aftermarketParts, []);
    });

    it('handles only OEM parts', () => {
      const oemPart = fromProductToComparisonPart(sampleOemProduct);
      const { oemParts, aftermarketParts } = partitionComparisonParts([oemPart]);
      assert.equal(oemParts.length, 1);
      assert.equal(aftermarketParts.length, 0);
    });

    it('handles only Aftermarket parts', () => {
      const amPart = fromProductToComparisonPart(sampleAftermarketProduct);
      const { oemParts, aftermarketParts } = partitionComparisonParts([amPart]);
      assert.equal(oemParts.length, 0);
      assert.equal(aftermarketParts.length, 1);
    });
  });

  describe('ComparisonPartItemSchema Zod validation', () => {
    it('validates a conformant item', () => {
      const raw = {
        sku: 'TEST-SKU',
        name: 'Test Part',
        brand: 'Test Brand',
        category: 'Brakes',
        retailPrice: 250,
        stockLevel: 10,
        minThreshold: 2,
        shelfLocation: 'Rack A-1',
        isOem: true,
        fitmentType: 'oem' as const,
      };

      const result = ComparisonPartItemSchema.safeParse(raw);
      assert.equal(result.success, true);
    });

    it('rejects negative retail price', () => {
      const invalid = {
        sku: 'TEST-SKU',
        name: 'Test Part',
        brand: 'Test Brand',
        category: 'Brakes',
        retailPrice: -50,
        stockLevel: 10,
        isOem: true,
        fitmentType: 'oem' as const,
      };

      const result = ComparisonPartItemSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });
  });

  describe('Staff Floor Terminal Touch & Shelf Locator Integration (SIAA-27)', () => {
    it('propagates exact shelf location coordinates to ComparisonPartItem', () => {
      const productWithRack: Product = {
        sku: 'TEST-SHELF-LOC',
        name: 'Brembo Brake Pads',
        category: 'Brakes',
        brand: 'Brembo',
        model: 'Yamaha NMAX 155',
        retail: 950,
        wholesale: 800,
        cost: 650,
        stock: 8,
        minThreshold: 3,
        location: 'Rack A-01 / Shelf 2',
        oem: false,
      };

      const part = fromProductToComparisonPart(productWithRack);
      assert.equal(part.shelfLocation, 'Rack A-01 / Shelf 2');
    });

    it('falls back to shelf_location property if location is empty', () => {
      const rawProduct = {
        sku: 'TEST-FALLBACK',
        name: 'Oil Filter',
        category: 'Engine',
        brand: 'Yamaha Genuine',
        model: 'Yamaha NMAX 155',
        retail: 180,
        wholesale: 150,
        cost: 100,
        stock: 20,
        minThreshold: 5,
        location: '',
        shelf_location: 'Bay C-03 / Bin 4',
        oem: true,
      } as unknown as Product;

      const part = fromProductToComparisonPart(rawProduct);
      assert.equal(part.shelfLocation, 'Bay C-03 / Bin 4');
    });

    it('handles unassigned shelf location gracefully (null)', () => {
      const productNoShelf: Product = {
        sku: 'TEST-UNASSIGNED',
        name: 'Universal Cable Tie Pack',
        category: 'Accessories',
        brand: 'Generic',
        model: 'Universal',
        retail: 50,
        wholesale: 35,
        cost: 20,
        stock: 100,
        minThreshold: 10,
        location: '',
        oem: false,
      };

      const part = fromProductToComparisonPart(productNoShelf);
      assert.equal(part.shelfLocation, null);
    });

    it('supports tabbed mobile partition for mobile/tablet screen viewports (< 768px)', () => {
      const oem = fromProductToComparisonPart(sampleOemProduct);
      const aftermarket = fromProductToComparisonPart(sampleAftermarketProduct);
      const allParts = [oem, aftermarket];

      const { oemParts, aftermarketParts } = partitionComparisonParts(allParts);

      // Mobile active tab logic
      const resolveVisibleParts = (activeTab: 'oem' | 'aftermarket') => {
        return activeTab === 'oem' ? oemParts : aftermarketParts;
      };

      const oemView = resolveVisibleParts('oem');
      assert.equal(oemView.length, 1);
      assert.equal(oemView[0].sku, 'YAM-NMAX-BELT-OEM');

      const aftermarketView = resolveVisibleParts('aftermarket');
      assert.equal(aftermarketView.length, 1);
      assert.equal(aftermarketView[0].sku, 'KOS-NMAX-BELT-RACE');
    });
  });
});
