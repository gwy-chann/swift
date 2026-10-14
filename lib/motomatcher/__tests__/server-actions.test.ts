import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMotorcycleModelsAction,
  getFitmentMatrixAction,
  addFitmentRuleAction,
} from '../actions.ts';
import { MOTOMATCHER_CACHE_TAGS } from '../mock-engine.ts';
import {
  FitmentMatrixActionResultSchema,
  AddFitmentRuleInputSchema,
} from '../../types/motomatcher.ts';

describe('MotoMatcher Next.js Server Actions & Caching Suite (SIAA-58)', () => {
  const NMAX_MODEL_ID = 'b0000000-0000-0000-0000-000000000001';

  describe('Scenario 1: Type-Safe Server Actions Suite & Models Cache', () => {
    it('returns validated motorcycle models with expected fields', async () => {
      const models = await getMotorcycleModelsAction();
      assert.ok(Array.isArray(models), 'Models must be an array');
      assert.ok(models.length > 0, 'Must have at least one motorcycle model');

      const nmax = models.find((m) => m.model.includes('NMAX'));
      assert.ok(nmax, 'Yamaha NMAX must be among motorcycle models');
      assert.equal(typeof nmax.id, 'string');
      assert.equal(typeof nmax.displacement_cc, 'number');
      assert.equal(typeof nmax.year_start, 'number');
    });

    it('exposes canonical cache tags for Next.js unstable_cache and revalidation', () => {
      assert.equal(MOTOMATCHER_CACHE_TAGS.MODELS, 'motomatcher-models');
      assert.equal(MOTOMATCHER_CACHE_TAGS.MATRIX, 'motomatcher-matrix');
    });

    it('returns standardized { success: true, data } envelope from getFitmentMatrixAction', async () => {
      const result = await getFitmentMatrixAction(NMAX_MODEL_ID);

      // Verify envelope satisfies FitmentMatrixActionResultSchema
      assert.equal(result.success, true);
      assert.ok(result.data, 'result.data must be present');
      assert.ok(Array.isArray(result.data.oem_parts), 'oem_parts must be an array');
      assert.ok(Array.isArray(result.data.aftermarket_parts), 'aftermarket_parts must be an array');

      // Verify validation schema
      const validated = FitmentMatrixActionResultSchema.parse(result);
      assert.equal(validated.success, true);
      assert.ok(validated.data.oem_parts.length > 0);
      assert.ok(validated.data.aftermarket_parts.length > 0);

      // Backward compatibility direct property access
      assert.ok(Array.isArray(result.oem_parts));
      assert.ok(Array.isArray(result.aftermarket_parts));
    });

    it('returns empty matrix with success: true for unknown or empty model ID', async () => {
      const result = await getFitmentMatrixAction('');
      assert.equal(result.success, true);
      assert.deepEqual(result.data, { oem_parts: [], aftermarket_parts: [] });
      assert.deepEqual(result.oem_parts, []);
    });
  });

  describe('Scenario 2: Admin Fitment Rule Management', () => {
    it('validates AddFitmentRuleInput against Zod schema', () => {
      const valid = AddFitmentRuleInputSchema.safeParse({
        productId: 'RCB-NMAX-BP02',
        modelId: NMAX_MODEL_ID,
        fitmentType: 'aftermarket',
        yearRange: '2020-2024',
        notes: 'High-performance pads',
      });
      assert.equal(valid.success, true);

      const invalid = AddFitmentRuleInputSchema.safeParse({
        productId: '',
        modelId: '',
      });
      assert.equal(invalid.success, false);
    });

    it('successfully creates a fitment rule and triggers tag revalidation', async () => {
      const result = await addFitmentRuleAction({
        productId: 'RCB-NMAX-BP02',
        modelId: NMAX_MODEL_ID,
        fitmentType: 'aftermarket',
        yearRange: '2020-2024',
        notes: 'Verified track-grade fitment',
      });

      assert.equal(result.success, true);
      assert.ok(result.ruleId, 'Must return a generated or persisted ruleId');
    });

    it('gracefully handles missing required fields in addFitmentRuleAction', async () => {
      const result = await addFitmentRuleAction({
        productId: '',
        modelId: '',
      });

      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });
});
