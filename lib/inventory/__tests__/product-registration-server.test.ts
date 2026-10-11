import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductAction,
  type CreateProductPayload
} from '../../admin/product-actions.ts';

describe('Supabase New Product Registration Server Action & SKU Uniqueness', () => {
  describe('Duplicate SKU Collision Guard (Scenario 1)', () => {
    it('rejects registration when SKU already exists in catalog (exact match)', async () => {
      const payload: CreateProductPayload = {
        sku: 'YAM-NMAX-BL01', // Pre-existing catalog item
        name: 'Duplicate Brake Lever',
        category: 'Brakes',
        brand: 'Yamaha Genuine Parts',
        model: 'Yamaha NMAX 155',
        cost: 250,
        stock: 5,
        minThreshold: 3
      };

      const result = await createProductAction(payload);
      assert.equal(result.success, false);
      assert.equal(result.code, 'SKU_ALREADY_EXISTS');
      assert.ok(result.error?.toLowerCase().includes('already exists'));
    });

    it('rejects registration when SKU matches an existing SKU case-insensitively', async () => {
      const payload: CreateProductPayload = {
        sku: 'yam-nmax-bl01', // Lowercase variation of YAM-NMAX-BL01
        name: 'Duplicate Brake Lever Lowercase',
        category: 'Brakes',
        brand: 'Yamaha Genuine Parts',
        model: 'Yamaha NMAX 155',
        cost: 250,
        stock: 5,
        minThreshold: 3
      };

      const result = await createProductAction(payload);
      assert.equal(result.success, false);
      assert.equal(result.code, 'SKU_ALREADY_EXISTS');
      assert.ok(result.error?.includes('YAM-NMAX-BL01'));
    });
  });

  describe('Input Validation Constraints', () => {
    it('rejects registration when unit cost is zero or negative', async () => {
      const payload: CreateProductPayload = {
        sku: `TEST-COST-${Date.now()}`,
        name: 'Invalid Cost Part',
        category: 'Brakes',
        brand: 'Brembo',
        model: 'Universal',
        cost: -50,
        stock: 10
      };

      const result = await createProductAction(payload);
      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.ok(result.fieldErrors?.cost);
    });

    it('rejects registration when mandatory fields are missing', async () => {
      const payload: CreateProductPayload = {
        sku: '',
        name: '',
        category: '',
        brand: '',
        cost: 100
      };

      const result = await createProductAction(payload);
      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.ok(result.fieldErrors?.sku);
      assert.ok(result.fieldErrors?.name);
      assert.ok(result.fieldErrors?.category);
      assert.ok(result.fieldErrors?.brand);
    });
  });

  describe('Atomic Creation & Automated Markup Calculation (Scenario 2 & 3)', () => {
    it('creates a new product with automated wholesale (+18%) and retail (+40% Aftermarket) markups', async () => {
      const testSku = `TST-AFT-${Date.now()}`;
      const payload: CreateProductPayload = {
        sku: testSku.toLowerCase(), // Test case normalization
        name: 'High Performance Sintered Brake Pads',
        category: 'Brakes',
        brand: 'RCB Racing Boy',
        model: 'Yamaha NMAX 155',
        cost: 1000,
        oem: false,
        stock: 12,
        minThreshold: 4,
        location: 'RACK-B2-S1'
      };

      const result = await createProductAction(payload);
      assert.equal(result.success, true);
      assert.ok(result.product);

      if (result.product) {
        assert.equal(result.product.sku, testSku.toUpperCase());
        assert.equal(result.product.name, payload.name);
        assert.equal(result.product.cost, 1000);
        assert.equal(result.product.wholesale, 1180); // 1000 * 1.18
        assert.equal(result.product.retail, 1400); // 1000 * 1.40 (Aftermarket)
        assert.equal(result.product.stock, 12);
        assert.equal(result.product.minThreshold, 4);
        assert.equal(result.product.location, 'RACK-B2-S1');
        assert.equal(result.product.oem, false);

        // Verify initial inbound stock audit log was written
        const { createAdminClient } = await import('../../supabase/server.ts');
        const supabase = createAdminClient();
        const { data: logs } = await supabase
          .from('stock_adjustment_logs')
          .select('*')
          .eq('sku', testSku.toUpperCase());

        assert.ok(logs && logs.length > 0);
        const log = logs[0];
        assert.equal(log.adjustment_type, 'restock');
        assert.equal(Number(log.quantity_delta), 12);
        assert.equal(Number(log.previous_stock), 0);
        assert.equal(Number(log.new_stock), 12);
      }
    });

    it('creates a new OEM product with +35% default retail markup and initial stock 0', async () => {
      const testSku = `TST-OEM-${Date.now()}`;
      const payload: CreateProductPayload = {
        sku: testSku,
        name: 'Genuine Drive Belt 155',
        category: 'Drivetrain',
        brand: 'Yamaha Genuine Parts',
        model: 'Yamaha Aerox 155',
        cost: 800,
        oem: true,
        stock: 0,
        minThreshold: 5
      };

      const result = await createProductAction(payload);
      assert.equal(result.success, true);
      assert.ok(result.product);

      if (result.product) {
        assert.equal(result.product.sku, testSku);
        assert.equal(result.product.cost, 800);
        assert.equal(result.product.wholesale, 944); // 800 * 1.18
        assert.equal(result.product.retail, 1080); // 800 * 1.35 (OEM)
        assert.equal(result.product.stock, 0);
        assert.equal(result.product.oem, true);

        // Verify zero stock does NOT write unnecessary inbound log
        const { createAdminClient } = await import('../../supabase/server.ts');
        const supabase = createAdminClient();
        const { data: logs } = await supabase
          .from('stock_adjustment_logs')
          .select('*')
          .eq('sku', testSku);

        assert.equal(logs?.length ?? 0, 0);
      }
    });
  });
});
