import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMotorcycleModelsAction } from '../../actions/motomatcher-actions.ts';
import {
  MotorcycleModelSchema,
  ProductFitmentSchema,
  FitmentTypeSchema
} from '../../../specs/021-motomatcher-compatibility-schema-seed/contracts/motomatcher.contract.ts';
import { MOCK_MOTORCYCLE_MODEL_RECORDS } from '../../mock-data/motorcycles.ts';

describe('MotoMatcher Compatibility Matrix & Motorcycle Models (SIAA-53)', () => {
  it('retrieves all 5 canonical baseline motorcycle models via getMotorcycleModelsAction', async () => {
    const models = await getMotorcycleModelsAction();
    assert.ok(Array.isArray(models), 'Models must be returned as an array');
    assert.ok(models.length >= 5, 'Should return at least 5 canonical models');

    const modelNames = models.map((m) => `${m.make} ${m.model}`);
    assert.ok(modelNames.includes('Yamaha NMAX 155'), 'Should contain Yamaha NMAX 155');
    assert.ok(modelNames.includes('Yamaha Aerox 155'), 'Should contain Yamaha Aerox 155');
    assert.ok(modelNames.includes('Honda Click 125i/150i'), 'Should contain Honda Click 125i/150i');
    assert.ok(modelNames.includes('Honda ADV 160'), 'Should contain Honda ADV 160');
    assert.ok(modelNames.includes('Suzuki Raider 150 Fi'), 'Should contain Suzuki Raider 150 Fi');
  });

  it('validates each baseline motorcycle model against MotorcycleModelSchema contract', () => {
    for (const model of MOCK_MOTORCYCLE_MODEL_RECORDS) {
      const parsed = MotorcycleModelSchema.safeParse(model);
      assert.ok(parsed.success, `Model ${model.make} ${model.model} should pass schema validation`);
      assert.ok(model.displacement_cc > 0, 'Displacement must be greater than 0');
      assert.ok(model.year_start >= 1900, 'Year start must be a valid year');
      if (model.year_end !== null && model.year_end !== undefined) {
        assert.ok(model.year_end >= model.year_start, 'Year end must be >= year start');
      }
    }
  });

  it('validates FitmentTypeSchema accepts only oem, aftermarket, and universal', () => {
    assert.equal(FitmentTypeSchema.safeParse('oem').success, true);
    assert.equal(FitmentTypeSchema.safeParse('aftermarket').success, true);
    assert.equal(FitmentTypeSchema.safeParse('universal').success, true);
    assert.equal(FitmentTypeSchema.safeParse('custom').success, false);
    assert.equal(FitmentTypeSchema.safeParse('').success, false);
  });

  it('validates ProductFitmentSchema accepts valid fitment pairs and rejects invalid foreign keys', () => {
    const validFitment = {
      id: 'f0000000-0000-0000-0000-000000000001',
      product_id: 'a0000000-0000-0000-0000-000000000001',
      model_id: 'b0000000-0000-0000-0000-000000000001',
      fitment_type: 'oem',
      year_range: '2020-2026',
      notes: 'Front caliper OEM direct fit'
    };


    const parsed = ProductFitmentSchema.safeParse(validFitment);
    assert.ok(parsed.success, 'Valid fitment should pass validation');

    const invalidFitment = {
      ...validFitment,
      product_id: 'not-a-uuid'
    };
    const invalidParsed = ProductFitmentSchema.safeParse(invalidFitment);
    assert.equal(invalidParsed.success, false, 'Invalid UUID should fail validation');
  });
});
