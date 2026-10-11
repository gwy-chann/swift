import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapRealtimeDbServiceToLaborService } from '../labor-realtime-mapper.ts';

describe('Realtime Labor Service Payload Mapper (SIAA-59)', () => {
  it('correctly maps raw database payload with snake_case and string rates to LaborService domain model', () => {
    const rawPayload = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'SRV-CVT-01',
      name: 'CVT Cleaning & Regreasing',
      bay: 'Bay 2 / Scooter Bay',
      rate: '400.00',
      duration: '45 mins',
      description: 'Variator, clutch bell, torque drive degreasing',
      active: true,
      created_at: '2026-10-11T00:00:00.000Z',
      updated_at: '2026-10-11T12:00:00.000Z'
    };

    const domain = mapRealtimeDbServiceToLaborService(rawPayload);

    assert.equal(domain.id, '550e8400-e29b-41d4-a716-446655440000');
    assert.equal(domain.code, 'SRV-CVT-01');
    assert.equal(domain.name, 'CVT Cleaning & Regreasing');
    assert.equal(domain.bay, 'Bay 2 / Scooter Bay');
    assert.equal(domain.rate, 400);
    assert.equal(typeof domain.rate, 'number');
    assert.equal(domain.duration, '45 mins');
    assert.equal(domain.active, true);
    assert.equal(domain.createdAt, '2026-10-11T00:00:00.000Z');
    assert.equal(domain.updatedAt, '2026-10-11T12:00:00.000Z');
  });

  it('handles optional description and active defaults when null or missing', () => {
    const minimalPayload = {
      code: 'SRV-OIL-01',
      name: 'Standard Oil & Gear Oil Change',
      bay: 'Bay 1 / Quick Bay',
      rate: 100,
      duration: '15 mins',
      active: null,
      description: null
    };

    const domain = mapRealtimeDbServiceToLaborService(minimalPayload);

    assert.equal(domain.code, 'SRV-OIL-01');
    assert.equal(domain.rate, 100);
    assert.equal(domain.description, undefined);
    assert.equal(domain.active, true);
  });
});
