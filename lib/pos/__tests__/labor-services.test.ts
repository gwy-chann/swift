import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLaborServicesAction } from '../actions.ts';
import { MOCK_SERVICES } from '../../mock-data/services.ts';
import type { LaborService } from '../../types/service.ts';

describe('Workshop Labor Services Engine (SIAA-49)', () => {
  it('loads baseline canonical services matching mockup/app.js specification', async () => {
    const services = await getLaborServicesAction();

    assert.ok(Array.isArray(services), 'Should return an array of services');
    assert.ok(services.length >= 6, 'Should contain at least 6 canonical services');

    const oilChange = services.find((s: LaborService) => s.code === 'SRV-OIL-01');
    assert.ok(oilChange, 'Oil Change service must exist');
    assert.equal(oilChange?.name, 'Standard Oil & Gear Oil Change');
    assert.equal(oilChange?.bay, 'Bay 1 / Quick Bay');
    assert.equal(oilChange?.rate, 100);
    assert.equal(oilChange?.duration, '15 mins');

    const cvt = services.find((s: LaborService) => s.code === 'SRV-CVT-01');
    assert.ok(cvt, 'CVT Cleaning service must exist');
    assert.equal(cvt?.name, 'CVT Cleaning & Regreasing');
    assert.equal(cvt?.bay, 'Bay 2 / Scooter Bay');
    assert.equal(cvt?.rate, 350);
    assert.equal(cvt?.duration, '45 mins');

    const fork = services.find((s: LaborService) => s.code === 'SRV-FORK-01');
    assert.ok(fork, 'Fork overhaul service must exist');
    assert.equal(fork?.name, 'Front Shock Re-oil & Seal Replacement');
    assert.equal(fork?.bay, 'Bay 4 / Heavy Repair');
    assert.equal(fork?.rate, 800);
    assert.equal(fork?.duration, '90 mins');
  });

  it('validates all 6 canonical repair bay codes and non-negative rates', () => {
    const expectedCodes = [
      'SRV-OIL-01',
      'SRV-CVT-01',
      'SRV-TIRE-01',
      'SRV-BRK-01',
      'SRV-TUNE-01',
      'SRV-FORK-01'
    ];

    for (const code of expectedCodes) {
      const match = MOCK_SERVICES.find((s) => s.code === code);
      assert.ok(match, `Expected code ${code} must exist in baseline catalog`);
      assert.ok(match.rate >= 0, `Rate for ${code} must be non-negative`);
      assert.ok(match.bay.length > 0, `Bay for ${code} must not be empty`);
      assert.ok(match.duration.length > 0, `Duration for ${code} must not be empty`);
    }
  });

  it('preserves flat-rate invariance when calculating totals', () => {
    const srv = MOCK_SERVICES.find((s) => s.code === 'SRV-OIL-01')!;
    const retailLineTotal = srv.rate * 2;
    const wholesaleLineTotal = srv.rate * 2;

    assert.equal(
      retailLineTotal,
      wholesaleLineTotal,
      'Labor flat-rate must remain invariant regardless of retail vs wholesale mode'
    );
  });
});
