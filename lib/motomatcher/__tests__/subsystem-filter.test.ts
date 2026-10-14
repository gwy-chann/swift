import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SUBSYSTEM_CATEGORIES,
  getMotoMatcherFilteredSet,
  type MotoMatcherFilterOptions,
} from '../subsystem-filter.ts';
import type { Product, MotorcycleModelRecord } from '../../types/product.ts';

describe('Subsystem Category & Universal vs. Dedicated Fitment Filtering (SIAA-26)', () => {
  const nmaxModel: MotorcycleModelRecord = {
    id: 'nmax-155-id',
    make: 'Yamaha',
    model: 'NMAX 155',
    displacement_cc: 155,
    year_start: 2020,
    year_end: 2024,
    category: 'Scooter',
  };

  const sampleProducts: Product[] = [
    // 1. OEM Brake Pad - Dedicated NMAX
    {
      sku: 'YAM-NMAX-BP-OEM',
      name: 'Yamaha Genuine NMAX Front Brake Pad',
      category: 'Brakes',
      brand: 'Yamaha Genuine',
      model: 'Yamaha NMAX 155',
      retail: 450,
      wholesale: 380,
      cost: 280,
      stock: 10,
      minThreshold: 5,
      location: 'Rack A-01 / Shelf 2',
      oem: true,
    },
    // 2. Aftermarket Brake Pad - Dedicated NMAX
    {
      sku: 'RCB-NMAX-BP-S',
      name: 'RCB S-Series Ceramic Brake Pad NMAX',
      category: 'Brakes',
      brand: 'Racing Boy',
      model: 'Yamaha NMAX 155',
      retail: 580,
      wholesale: 480,
      cost: 350,
      stock: 14,
      minThreshold: 4,
      location: 'Rack A-01 / Shelf 3',
      oem: false,
    },
    // 3. OEM CVT Belt - Dedicated NMAX
    {
      sku: 'YAM-NMAX-BELT',
      name: 'Yamaha Genuine NMAX Drive Belt',
      category: 'Drivetrain',
      brand: 'Yamaha Genuine',
      model: 'Yamaha NMAX 155',
      retail: 1150,
      wholesale: 950,
      cost: 750,
      stock: 6,
      minThreshold: 3,
      location: 'Rack B-01 / Shelf 1',
      oem: true,
    },
    // 4. Aftermarket CVT Belt - Dedicated NMAX
    {
      sku: 'KOS-NMAX-BELT-K',
      name: 'Koso Racing Kevlar Belt NMAX',
      category: 'CVT',
      brand: 'Koso',
      model: 'Yamaha NMAX 155',
      retail: 1450,
      wholesale: 1200,
      cost: 950,
      stock: 5,
      minThreshold: 2,
      location: 'Rack B-01 / Shelf 2',
      oem: false,
    },
    // 5. Universal 4T Oil - Universal
    {
      sku: 'MOT-3100-10W40',
      name: 'Motul 3100 Gold 4T 10W40 (1L)',
      category: 'Fluids',
      brand: 'Motul',
      model: 'Universal',
      retail: 390,
      wholesale: 330,
      cost: 260,
      stock: 28,
      minThreshold: 10,
      location: 'Aisle 1 / Shelf 1',
      oem: false,
    },
    // 6. Universal Brake Fluid - Universal
    {
      sku: 'MOT-DOT4-FLUID',
      name: 'Motul DOT 4 High Performance Brake Fluid (500ml)',
      category: 'Fluids',
      brand: 'Motul',
      model: 'Universal',
      retail: 280,
      wholesale: 220,
      cost: 180,
      stock: 15,
      minThreshold: 5,
      location: 'Aisle 1 / Shelf 2',
      oem: false,
    },
    // 7. Non-matching product (Honda Click Drive Belt)
    {
      sku: 'HON-CLK-CVTB',
      name: 'Honda Click OEM Drive Belt',
      category: 'Drivetrain',
      brand: 'Honda OEM',
      model: 'Honda Click 125i/150i',
      retail: 850,
      wholesale: 720,
      cost: 520,
      stock: 4,
      minThreshold: 2,
      location: 'Rack B-04 / Shelf 1',
      oem: true,
    },
  ];

  describe('Scenario 1: Subsystem Category Pill Filtering', () => {
    it('filters parts synchronously to show only the selected subsystem (Brakes)', () => {
      const options: MotoMatcherFilterOptions = {
        selectedModel: nmaxModel,
        systemCategory: 'Brakes',
        includeUniversal: true,
      };

      const result = getMotoMatcherFilteredSet(sampleProducts, options);

      // Only Brakes (YAM-NMAX-BP-OEM and RCB-NMAX-BP-S)
      assert.equal(result.totalMatches, 2);
      assert.equal(result.oemCount, 1);
      assert.equal(result.aftermarketCount, 1);
      assert.equal(result.oemParts[0].sku, 'YAM-NMAX-BP-OEM');
      assert.equal(result.aftermarketParts[0].sku, 'RCB-NMAX-BP-S');
    });

    it('filters parts by Drivetrain matching items categorized as Drivetrain and CVT aliases', () => {
      const options: MotoMatcherFilterOptions = {
        selectedModel: nmaxModel,
        systemCategory: 'Drivetrain',
        includeUniversal: true,
      };

      const result = getMotoMatcherFilteredSet(sampleProducts, options);

      // Matches YAM-NMAX-BELT (Drivetrain) and KOS-NMAX-BELT-K (CVT)
      assert.equal(result.totalMatches, 2);
      assert.equal(result.oemCount, 1);
      assert.equal(result.aftermarketCount, 1);
      assert.equal(result.oemParts[0].sku, 'YAM-NMAX-BELT');
      assert.equal(result.aftermarketParts[0].sku, 'KOS-NMAX-BELT-K');
    });

    it('filters parts by Fluids returning universal fluid items', () => {
      const options: MotoMatcherFilterOptions = {
        selectedModel: nmaxModel,
        systemCategory: 'Fluids',
        includeUniversal: true,
      };

      const result = getMotoMatcherFilteredSet(sampleProducts, options);

      assert.equal(result.totalMatches, 2);
      assert.equal(result.oemCount, 0);
      assert.equal(result.aftermarketCount, 2);
      assert.deepEqual(
        result.aftermarketParts.map((p) => p.sku),
        ['MOT-3100-10W40', 'MOT-DOT4-FLUID']
      );
    });
  });

  describe('Scenario 2: "All Categories" Reset Action', () => {
    it('restores the full matrix of compatible parts when "ALL" is selected', () => {
      const options: MotoMatcherFilterOptions = {
        selectedModel: nmaxModel,
        systemCategory: 'ALL',
        includeUniversal: true,
      };

      const result = getMotoMatcherFilteredSet(sampleProducts, options);

      // 2 OEM (Brake, Belt) + 4 Aftermarket (RCB Brake, Koso Belt, Motul Oil, Motul DOT4)
      assert.equal(result.totalMatches, 6);
      assert.equal(result.oemCount, 2);
      assert.equal(result.aftermarketCount, 4);
    });

    it('resets correctly from an active category back to ALL without losing items', () => {
      const activeOptions: MotoMatcherFilterOptions = {
        selectedModel: nmaxModel,
        systemCategory: 'Brakes',
        includeUniversal: true,
      };
      const filteredResult = getMotoMatcherFilteredSet(sampleProducts, activeOptions);
      assert.equal(filteredResult.totalMatches, 2);

      const resetOptions: MotoMatcherFilterOptions = {
        ...activeOptions,
        systemCategory: 'ALL',
      };
      const resetResult = getMotoMatcherFilteredSet(sampleProducts, resetOptions);
      assert.equal(resetResult.totalMatches, 6);
    });
  });

  describe('Scenario 3: Universal Parts Visibility Toggle', () => {
    it('excludes universal parts when includeUniversal is false', () => {
      const options: MotoMatcherFilterOptions = {
        selectedModel: nmaxModel,
        systemCategory: 'ALL',
        includeUniversal: false,
      };

      const result = getMotoMatcherFilteredSet(sampleProducts, options);

      // Only dedicated NMAX parts (2 OEM + 2 Aftermarket); 2 Universal fluids excluded
      assert.equal(result.totalMatches, 4);
      assert.equal(result.oemCount, 2);
      assert.equal(result.aftermarketCount, 2);

      const skus = result.filteredProducts.map((p) => p.sku);
      assert.equal(skus.includes('MOT-3100-10W40'), false);
      assert.equal(skus.includes('MOT-DOT4-FLUID'), false);
    });

    it('returns empty list for universal-only category when includeUniversal is false', () => {
      const options: MotoMatcherFilterOptions = {
        selectedModel: nmaxModel,
        systemCategory: 'Fluids',
        includeUniversal: false,
      };

      const result = getMotoMatcherFilteredSet(sampleProducts, options);

      assert.equal(result.totalMatches, 0);
      assert.equal(result.oemCount, 0);
      assert.equal(result.aftermarketCount, 0);
    });

    it('re-includes universal parts when includeUniversal is toggled back to true', () => {
      const options: MotoMatcherFilterOptions = {
        selectedModel: nmaxModel,
        systemCategory: 'Fluids',
        includeUniversal: true,
      };

      const result = getMotoMatcherFilteredSet(sampleProducts, options);

      assert.equal(result.totalMatches, 2);
      assert.equal(result.aftermarketCount, 2);
    });
  });

  describe('Scenario 4: Result Count Indicators', () => {
    it('OEM and Aftermarket counters sum exactly to totalMatches', () => {
      const testCategories = ['ALL', 'Brakes', 'Drivetrain', 'Fluids', 'Engine'];

      for (const cat of testCategories) {
        for (const incUniv of [true, false]) {
          const result = getMotoMatcherFilteredSet(sampleProducts, {
            selectedModel: nmaxModel,
            systemCategory: cat,
            includeUniversal: incUniv,
          });

          assert.equal(
            result.totalMatches,
            result.oemCount + result.aftermarketCount,
            `Count mismatch for category ${cat} with includeUniversal=${incUniv}`
          );
        }
      }
    });

    it('returns exact 0 counts when no parts match a category', () => {
      const options: MotoMatcherFilterOptions = {
        selectedModel: nmaxModel,
        systemCategory: 'Suspension',
        includeUniversal: true,
      };

      const result = getMotoMatcherFilteredSet(sampleProducts, options);

      assert.equal(result.totalMatches, 0);
      assert.equal(result.oemCount, 0);
      assert.equal(result.aftermarketCount, 0);
      assert.deepEqual(result.oemParts, []);
      assert.deepEqual(result.aftermarketParts, []);
    });
  });

  describe('Scenario 5: Universal Platform Selection Mode', () => {
    it('returns only universal items when isUniversalPlatform is true', () => {
      const options: MotoMatcherFilterOptions = {
        selectedModel: null,
        isUniversalPlatform: true,
        systemCategory: 'ALL',
        includeUniversal: true,
      };

      const result = getMotoMatcherFilteredSet(sampleProducts, options);

      assert.equal(result.totalMatches, 2);
      assert.deepEqual(
        result.filteredProducts.map((p) => p.sku),
        ['MOT-3100-10W40', 'MOT-DOT4-FLUID']
      );
    });
  });

  describe('SUBSYSTEM_CATEGORIES Taxonomy Integrity', () => {
    it('contains "ALL" as the initial reset category', () => {
      assert.equal(SUBSYSTEM_CATEGORIES[0].id, 'ALL');
      assert.equal(SUBSYSTEM_CATEGORIES[0].label, 'All Systems');
    });

    it('contains all standard motorcycle subsystems', () => {
      const ids = SUBSYSTEM_CATEGORIES.map((c) => c.id);
      assert.ok(ids.includes('Brakes'));
      assert.ok(ids.includes('Drivetrain'));
      assert.ok(ids.includes('Fluids'));
      assert.ok(ids.includes('Ignition'));
      assert.ok(ids.includes('Engine'));
      assert.ok(ids.includes('Tires'));
      assert.ok(ids.includes('Suspension'));
    });
  });
});
