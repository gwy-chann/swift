import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { updateProductAction } from '../../admin/product-actions.ts';
import { InventoryStore } from '../../store/inventory-store.ts';
import { calculateMarkupPrices } from '../product-registration.ts';
import type { Product } from '../../types/product.ts';

describe('Admin Product Edit Engine (SIAA-108)', () => {
  describe('Input Validation & Price Rules', () => {
    it('blocks update when required name is empty', async () => {
      const result = await updateProductAction({
        sku: 'TEST-SKU-001',
        name: '   ',
        category: 'Brakes',
        brand: 'Yamaha',
        cost: 250,
        retail: 350,
        userRole: 'admin'
      });

      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.ok(result.fieldErrors?.name);
    });

    it('blocks update when brand is empty', async () => {
      const result = await updateProductAction({
        sku: 'TEST-SKU-001',
        name: 'Performance Disc Rotor',
        category: 'Brakes',
        brand: '',
        cost: 250,
        retail: 350,
        userRole: 'admin'
      });

      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.ok(result.fieldErrors?.brand);
    });

    it('blocks update when unit cost is zero or negative', async () => {
      const resultZero = await updateProductAction({
        sku: 'TEST-SKU-001',
        name: 'Performance Disc Rotor',
        category: 'Brakes',
        brand: 'Yamaha',
        cost: 0,
        retail: 350,
        userRole: 'admin'
      });

      assert.equal(resultZero.success, false);
      assert.equal(resultZero.code, 'VALIDATION_ERROR');
      assert.ok(resultZero.fieldErrors?.cost);

      const resultNegative = await updateProductAction({
        sku: 'TEST-SKU-001',
        name: 'Performance Disc Rotor',
        category: 'Brakes',
        brand: 'Yamaha',
        cost: -150,
        retail: 350,
        userRole: 'admin'
      });

      assert.equal(resultNegative.success, false);
      assert.equal(resultNegative.code, 'VALIDATION_ERROR');
      assert.ok(resultNegative.fieldErrors?.cost);
    });

    it('blocks update when retail price is zero or negative', async () => {
      const result = await updateProductAction({
        sku: 'TEST-SKU-001',
        name: 'Performance Disc Rotor',
        category: 'Brakes',
        brand: 'Yamaha',
        cost: 250,
        retail: 0,
        userRole: 'admin'
      });

      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.ok(result.fieldErrors?.retail);
    });
  });

  describe('RBAC Protection (Non-Admin Role Restriction)', () => {
    it('rejects product updates attempted by mechanic staff role', async () => {
      const result = await updateProductAction({
        sku: 'BP-YAM-001',
        name: 'Modified Brake Pad',
        category: 'Brakes',
        brand: 'Yamaha Genuine',
        cost: 300,
        retail: 450,
        userRole: 'mechanic'
      });

      assert.equal(result.success, false);
      assert.equal(result.code, 'UNAUTHORIZED');
      assert.match(result.error ?? '', /Administrative privileges required/i);
    });

    it('rejects product updates attempted by cashier staff role', async () => {
      const result = await updateProductAction({
        sku: 'BP-YAM-001',
        name: 'Modified Brake Pad',
        category: 'Brakes',
        brand: 'Yamaha Genuine',
        cost: 300,
        retail: 450,
        userRole: 'cashier'
      });

      assert.equal(result.success, false);
      assert.equal(result.code, 'UNAUTHORIZED');
    });
  });

  describe('Wholesale Price Recalculation', () => {
    it('automatically calculates wholesale price markup (+18%) from unit cost for OEM', () => {
      const unitCost = 500;
      const markups = calculateMarkupPrices(unitCost, true);
      assert.equal(markups.wholesale, 590);
    });

    it('automatically calculates wholesale price markup (+18%) from unit cost for Aftermarket', () => {
      const unitCost = 1000;
      const markups = calculateMarkupPrices(unitCost, false);
      assert.equal(markups.wholesale, 1180);
    });
  });

  describe('Reactive InventoryStore Updates', () => {
    const initialProduct: Product = {
      id: 'prod-001',
      sku: 'YAM-NMAX-BP01',
      name: 'Yamaha NMAX Front Brake Pad',
      category: 'Brakes',
      brand: 'Yamaha Genuine',
      model: 'Yamaha NMAX 155',
      cost: 350,
      wholesale: 413,
      retail: 472.5,
      stock: 24,
      minThreshold: 5,
      location: 'RACK-A-01',
      oem: true,
      description: 'Original OEM brake pad for NMAX 155'
    };

    it('updates product fields while strictly preserving SKU and stock quantity', () => {
      const store = new InventoryStore({ products: [initialProduct] });

      const updated = store.updateProduct({
        sku: 'YAM-NMAX-BP01',
        name: 'Yamaha NMAX Front Brake Pad (Upgraded)',
        cost: 400,
        retail: 550,
        location: 'RACK-B-04',
        model: 'Yamaha NMAX 155 / Aerox 155'
      });

      assert.ok(updated);
      assert.equal(updated.name, 'Yamaha NMAX Front Brake Pad (Upgraded)');
      assert.equal(updated.retail, 550);
      assert.equal(updated.cost, 400);
      assert.equal(updated.location, 'RACK-B-04');
      assert.equal(updated.model, 'Yamaha NMAX 155 / Aerox 155');

      // Crucial domain invariants: SKU and stock remain unchanged
      assert.equal(updated.sku, 'YAM-NMAX-BP01');
      assert.equal(updated.stock, 24);
      assert.equal(updated.minThreshold, 5);

      // Verify in store products state
      const productInStore = store.getProductBySku('YAM-NMAX-BP01');
      assert.equal(productInStore?.name, 'Yamaha NMAX Front Brake Pad (Upgraded)');
      assert.equal(productInStore?.stock, 24);
    });
  });
});
