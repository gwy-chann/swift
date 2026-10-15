import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapServiceBayRow,
  mapWorkOrderRow,
  validateWorkOrderStatusTransition,
  calculateRemainingMinutes,
} from '../service-bay-mapper.ts';
import type { DatabaseServiceBayRow, DatabaseWorkOrderRow } from '../../types/service.ts';

describe('Service Bay & Work Order Domain Mapper (SIAA-66)', () => {
  describe('mapServiceBayRow', () => {
    it('correctly maps snake_case database row to camelCase domain entity', () => {
      const dbRow: DatabaseServiceBayRow = {
        id: 'e0000000-0000-0000-0000-000000000001',
        name: 'Bay 1 (Quick Bay)',
        bay_type: 'Express',
        status: 'OCCUPIED',
        display_order: 1,
        created_at: '2026-10-15T08:00:00.000Z',
        updated_at: '2026-10-15T08:30:00.000Z',
      };

      const domain = mapServiceBayRow(dbRow);

      assert.equal(domain.id, dbRow.id);
      assert.equal(domain.name, 'Bay 1 (Quick Bay)');
      assert.equal(domain.bayType, 'Express');
      assert.equal(domain.status, 'OCCUPIED');
      assert.equal(domain.displayOrder, 1);
      assert.equal(domain.createdAt, dbRow.created_at);
      assert.equal(domain.updatedAt, dbRow.updated_at);
    });

    it('falls back to default AVAILABLE status if status is unknown or invalid', () => {
      const dbRow: DatabaseServiceBayRow = {
        id: 'e0000000-0000-0000-0000-000000000002',
        name: 'Bay 2 (Scooter Bay)',
        bay_type: 'Specialist',
        status: 'INVALID_STATUS' as unknown as DatabaseServiceBayRow['status'],
        display_order: 2,
        created_at: '2026-10-15T08:00:00.000Z',
        updated_at: '2026-10-15T08:00:00.000Z',
      };

      const domain = mapServiceBayRow(dbRow);
      assert.equal(domain.status, 'AVAILABLE');
    });
  });

  describe('mapWorkOrderRow', () => {
    it('correctly maps database work order row with all populated fields', () => {
      const dbRow: DatabaseWorkOrderRow = {
        id: 'f0000000-0000-0000-0000-000000000001',
        order_number: 'WO-2026-0001',
        bay_id: 'e0000000-0000-0000-0000-000000000001',
        customer_name: 'Juan dela Cruz',
        vehicle_model: 'Yamaha NMAX 155',
        plate_number: 'ND-12345',
        service_code: 'SRV-OIL-01',
        service_name: 'Standard Oil & Gear Oil Change',
        mechanic_id: 'd0000000-0000-0000-0000-000000000003',
        status: 'IN PROGRESS',
        estimated_duration_minutes: 30,
        started_at: '2026-10-15T08:15:00.000Z',
        completed_at: null,
        notes: 'Customer requested Motul Gold 10W40',
        created_at: '2026-10-15T08:00:00.000Z',
        updated_at: '2026-10-15T08:15:00.000Z',
      };

      const domain = mapWorkOrderRow(dbRow);

      assert.equal(domain.id, dbRow.id);
      assert.equal(domain.orderNumber, 'WO-2026-0001');
      assert.equal(domain.bayId, 'e0000000-0000-0000-0000-000000000001');
      assert.equal(domain.customerName, 'Juan dela Cruz');
      assert.equal(domain.vehicleModel, 'Yamaha NMAX 155');
      assert.equal(domain.plateNumber, 'ND-12345');
      assert.equal(domain.serviceCode, 'SRV-OIL-01');
      assert.equal(domain.serviceName, 'Standard Oil & Gear Oil Change');
      assert.equal(domain.mechanicId, 'd0000000-0000-0000-0000-000000000003');
      assert.equal(domain.status, 'IN PROGRESS');
      assert.equal(domain.estimatedDurationMinutes, 30);
      assert.equal(domain.startedAt, '2026-10-15T08:15:00.000Z');
      assert.equal(domain.completedAt, null);
      assert.equal(domain.notes, 'Customer requested Motul Gold 10W40');
    });

    it('safely handles nullable foreign keys and timestamps for queued orders', () => {
      const dbRow: DatabaseWorkOrderRow = {
        id: 'f0000000-0000-0000-0000-000000000003',
        order_number: 'WO-2026-0003',
        bay_id: null,
        customer_name: 'Mark Reyes',
        vehicle_model: 'Suzuki Raider 150 Fi',
        plate_number: 'NE-56789',
        service_code: 'SRV-BRK-01',
        service_name: 'Brake Caliper Flush & Bleeding',
        mechanic_id: null,
        status: 'QUEUED',
        estimated_duration_minutes: 25,
        started_at: null,
        completed_at: null,
        notes: null,
        created_at: '2026-10-15T08:30:00.000Z',
        updated_at: '2026-10-15T08:30:00.000Z',
      };

      const domain = mapWorkOrderRow(dbRow);

      assert.equal(domain.bayId, null);
      assert.equal(domain.mechanicId, null);
      assert.equal(domain.startedAt, null);
      assert.equal(domain.completedAt, null);
      assert.equal(domain.notes, null);
      assert.equal(domain.status, 'QUEUED');
    });
  });

  describe('validateWorkOrderStatusTransition', () => {
    it('permits valid lifecycle transitions', () => {
      assert.equal(validateWorkOrderStatusTransition('QUEUED', 'IN PROGRESS'), true);
      assert.equal(validateWorkOrderStatusTransition('QUEUED', 'CANCELLED'), true);
      assert.equal(validateWorkOrderStatusTransition('IN PROGRESS', 'PENDING_PARTS'), true);
      assert.equal(validateWorkOrderStatusTransition('IN PROGRESS', 'COMPLETED'), true);
      assert.equal(validateWorkOrderStatusTransition('IN PROGRESS', 'CANCELLED'), true);
      assert.equal(validateWorkOrderStatusTransition('PENDING_PARTS', 'IN PROGRESS'), true);
      assert.equal(validateWorkOrderStatusTransition('PENDING_PARTS', 'CANCELLED'), true);
    });

    it('rejects invalid or terminal status transitions', () => {
      assert.equal(validateWorkOrderStatusTransition('COMPLETED', 'IN PROGRESS'), false);
      assert.equal(validateWorkOrderStatusTransition('COMPLETED', 'QUEUED'), false);
      assert.equal(validateWorkOrderStatusTransition('CANCELLED', 'IN PROGRESS'), false);
      assert.equal(validateWorkOrderStatusTransition('QUEUED', 'COMPLETED'), false);
    });
  });

  describe('calculateRemainingMinutes', () => {
    it('returns estimated duration if work has not started', () => {
      const remaining = calculateRemainingMinutes(null, 30);
      assert.equal(remaining, 30);
    });

    it('calculates remaining minutes accurately for active job', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const remaining = calculateRemainingMinutes(tenMinutesAgo, 30);
      assert.ok(remaining <= 20 && remaining >= 19, `Expected ~20 mins, got ${remaining}`);
    });

    it('floors remaining minutes at zero when overdue', () => {
      const fortyMinutesAgo = new Date(Date.now() - 40 * 60 * 1000).toISOString();
      const remaining = calculateRemainingMinutes(fortyMinutesAgo, 30);
      assert.equal(remaining, 0);
    });
  });
});
