import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFitmentMatrixAction } from '../actions.ts';
import { executeMockMotoMatcherMatrix } from '../mock-engine.ts';
import {
  calculateUpsellDelta,
  MotoMatcherMatrixPayloadSchema,
} from '../../types/motomatcher.ts';

describe('Supabase Atomic MotoMatcher Matrix Search RPC & Engine (SIAA-54)', () => {
  const NMAX_MODEL_ID = 'b0000000-0000-0000-0000-000000000001';
  const CLICK_MODEL_ID = 'b0000000-0000-0000-0000-000000000003';

  describe('Scenario 1: Partitioned OEM vs. Aftermarket Matrix Result', () => {
    it('returns partitioned oem_parts and aftermarket_parts for Yamaha NMAX 155', async () => {
      const result = await getFitmentMatrixAction(NMAX_MODEL_ID);

      // Verify structure complies with Zod schema contract
      const parsed = MotoMatcherMatrixPayloadSchema.parse(result);
      assert.ok(parsed);

      assert.ok(Array.isArray(result.oem_parts), 'oem_parts must be an array');
      assert.ok(Array.isArray(result.aftermarket_parts), 'aftermarket_parts must be an array');

      // Verify OEM parts
      const oemBrakes = result.oem_parts.find((p) => p.sku === 'YAM-NMAX-BL01');
      assert.ok(oemBrakes, 'OEM front brake pads YAM-NMAX-BL01 must be present in oem_parts');
      assert.equal(oemBrakes.fitment_type, 'oem');
      assert.equal(oemBrakes.is_universal, false);
      assert.equal(oemBrakes.retail_price, 450);
      assert.equal(oemBrakes.brand, 'Yamaha Genuine Parts');
      assert.equal(oemBrakes.shelf_location, 'Rack A-01 / Shelf 2');
      assert.equal(oemBrakes.category, 'Brakes');

      // Verify Aftermarket parts
      const rcbBrakes = result.aftermarket_parts.find((p) => p.sku === 'RCB-NMAX-BP02');
      assert.ok(rcbBrakes, 'RCB ceramic brake pads RCB-NMAX-BP02 must be present in aftermarket_parts');
      assert.equal(rcbBrakes.fitment_type, 'aftermarket');
      assert.equal(rcbBrakes.is_universal, false);
      assert.equal(rcbBrakes.retail_price, 580);
      assert.equal(rcbBrakes.category, 'Brakes');
    });

    it('returns empty matrix when motorcycle model ID is missing or unknown', async () => {
      const emptyResult = await getFitmentMatrixAction('');
      assert.deepEqual(emptyResult, { oem_parts: [], aftermarket_parts: [] });

      const unknownResult = await getFitmentMatrixAction('00000000-non-existent-model');
      assert.deepEqual(unknownResult, { oem_parts: [], aftermarket_parts: [] });
    });
  });

  describe('Scenario 2: Inclusion of Universal Parts', () => {
    it('includes universal fluids in aftermarket_parts flagged with is_universal: true', async () => {
      const result = await getFitmentMatrixAction(NMAX_MODEL_ID);

      const motulOil = result.aftermarket_parts.find((p) => p.sku === 'MOT-3100-10W40');
      assert.ok(motulOil, 'Motul 3100 must be included in aftermarket_parts');
      assert.equal(motulOil.is_universal, true);
      assert.equal(motulOil.fitment_type, 'universal');
      assert.equal(motulOil.category, 'Fluids');

      const shellOil = result.aftermarket_parts.find((p) => p.sku === 'SHL-ADV-AX7');
      assert.ok(shellOil, 'Shell Advance AX7 must be included in aftermarket_parts');
      assert.equal(shellOil.is_universal, true);
      assert.equal(shellOil.fitment_type, 'universal');
    });

    it('universal parts are included across different motorcycle models', async () => {
      const clickResult = await getFitmentMatrixAction(CLICK_MODEL_ID);

      const universalInClick = clickResult.aftermarket_parts.filter((p) => p.is_universal);
      assert.ok(universalInClick.length >= 2, 'Click 125i/150i must also receive universal fluid parts');
    });
  });

  describe('Scenario 3: Subsystem Category & Keyword Filtering', () => {
    it('filters parts server-side when category is specified (e.g. Brakes)', async () => {
      const result = await getFitmentMatrixAction(NMAX_MODEL_ID, 'Brakes');

      assert.ok(result.oem_parts.length > 0);
      assert.ok(result.aftermarket_parts.length > 0);

      // Verify all returned parts belong to 'Brakes' category
      for (const p of result.oem_parts) {
        assert.equal(p.category.toLowerCase(), 'brakes');
      }
      for (const p of result.aftermarket_parts) {
        assert.equal(p.category.toLowerCase(), 'brakes');
      }

      // Fluids and ignition parts must be excluded
      const motulOil = result.aftermarket_parts.find((p) => p.sku === 'MOT-3100-10W40');
      assert.equal(motulOil, undefined, 'Fluids must be filtered out when category is Brakes');

      const densoSpark = result.aftermarket_parts.find((p) => p.sku === 'DEN-IU24-IR');
      assert.equal(densoSpark, undefined, 'Ignition spark plug must be filtered out when category is Brakes');
    });

    it('filters parts dynamically by keyword search across SKU, name, brand, or notes', async () => {
      const ceramicResult = await getFitmentMatrixAction(NMAX_MODEL_ID, null, 'ceramic');
      assert.equal(ceramicResult.oem_parts.length, 0);
      assert.ok(ceramicResult.aftermarket_parts.some((p) => p.sku === 'RCB-NMAX-BP02'));

      const yamResult = await getFitmentMatrixAction(NMAX_MODEL_ID, null, 'YAM');
      assert.ok(yamResult.oem_parts.some((p) => p.sku === 'YAM-NMAX-BL01'));
    });
  });

  describe('Scenario 4: Upsell Price Delta Calculation', () => {
    it('calculates price delta and formatted upsell badge for aftermarket alternative', async () => {
      const result = await getFitmentMatrixAction(NMAX_MODEL_ID, 'Brakes');

      const rcbBrakes = result.aftermarket_parts.find((p) => p.sku === 'RCB-NMAX-BP02');
      assert.ok(rcbBrakes);

      // OEM: 450, Aftermarket: 580 -> Delta = +130, Percent = +28.9%
      assert.equal(rcbBrakes.upsell_delta_amount, 130);
      assert.equal(rcbBrakes.upsell_delta_percent, 28.9);
      assert.equal(rcbBrakes.upsell_badge, '+₱130.00 (+28.9%)');
      assert.equal(rcbBrakes.oem_reference_sku, 'YAM-NMAX-BL01');
    });

    it('computes upsell delta helper accurately for positive, negative, and invalid benchmarks', () => {
      // Positive upsell
      const upsell = calculateUpsellDelta(450, 580);
      assert.deepEqual(upsell, {
        deltaAmount: 130,
        deltaPercent: 28.9,
        badge: '+₱130.00 (+28.9%)',
      });

      // Cheaper aftermarket alternative (cost savings)
      const economy = calculateUpsellDelta(500, 350);
      assert.deepEqual(economy, {
        deltaAmount: -150,
        deltaPercent: -30.0,
        badge: '-₱150.00 (-30.0%)',
      });

      // Zero or negative benchmark retail
      assert.equal(calculateUpsellDelta(0, 580), null);
      assert.equal(calculateUpsellDelta(-50, 580), null);
    });

    it('sets upsell delta to null when no OEM part exists in that category', async () => {
      // Query without category where DEN-IU24-IR (Ignition) has no OEM counterpart for NMAX in seed data
      const result = await getFitmentMatrixAction(NMAX_MODEL_ID);

      const densoSpark = result.aftermarket_parts.find((p) => p.sku === 'DEN-IU24-IR');
      if (densoSpark) {
        assert.equal(densoSpark.upsell_delta_amount, null);
        assert.equal(densoSpark.upsell_delta_percent, null);
        assert.equal(densoSpark.upsell_badge, null);
        assert.equal(densoSpark.oem_reference_sku, null);
      }
    });
  });

  describe('Direct Fallback Engine Invariant Verification', () => {
    it('executes fallback matrix engine synchronously and strictly adheres to Zod contract', () => {
      const result = executeMockMotoMatcherMatrix(NMAX_MODEL_ID, 'Brakes');
      const validated = MotoMatcherMatrixPayloadSchema.safeParse(result);
      assert.equal(validated.success, true);
    });
  });
});
