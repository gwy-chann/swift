import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateServiceCode } from '../service-utils.ts';

describe('Workshop Service Code Generator Utility', () => {
  const existing = ['SRV-OIL-01', 'SRV-BRK-01', 'SRV-CVT-01'];

  it('generates sequential code matching known category keywords', () => {
    assert.equal(generateServiceCode('Full Synthetic Oil Change', existing), 'SRV-OIL-02');
    assert.equal(generateServiceCode('Brake Caliper Pad Replacement', existing), 'SRV-BRK-02');
    assert.equal(generateServiceCode('CVT Pulley Cleaning', existing), 'SRV-CVT-02');
    assert.equal(generateServiceCode('Drive Chain & Sprocket Replacement', existing), 'SRV-CHAIN-01');
    assert.equal(generateServiceCode('Front Fork Re-oil', existing), 'SRV-FORK-01');
    assert.equal(generateServiceCode('Dyno Diagnostic Engine Scan', existing), 'SRV-DIAG-01');
  });

  it('generates sequential slug from first word when no keyword matches', () => {
    assert.equal(generateServiceCode('Fabrication Custom Bracket', existing), 'SRV-FABR-01');
  });

  it('falls back to sequential numeric format when title is empty', () => {
    const code = generateServiceCode('', existing);
    assert.match(code, /^SRV-\d{4}$/);
  });

  it('avoids duplicate codes when multiple items with the same prefix exist', () => {
    const multiple = ['SRV-CHAIN-01', 'SRV-CHAIN-02', 'SRV-CHAIN-03'];
    assert.equal(generateServiceCode('Drive Chain Adjustment', multiple), 'SRV-CHAIN-04');
  });
});
