import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchOnShiftMechanicsAction,
  assignMechanicAction,
  appendInMemoryWorkOrder,
  resetInMemoryWorkOrders,
} from '../workshop-actions.ts';
import type { DetailedWorkOrder } from '../../types/workshop.ts';

describe('Admin On-Shift Mechanic Dispatch Actions (SIAA-101)', () => {
  beforeEach(() => {
    resetInMemoryWorkOrders();
  });

  describe('fetchOnShiftMechanicsAction', () => {
    it('returns available on-shift mechanics with active status', async () => {
      const result = await fetchOnShiftMechanicsAction();
      assert.strictEqual(result.success, true);
      assert.ok(result.data && result.data.length > 0);

      const dante = result.data.find((m) => m.name === 'Dante Reyes');
      assert.ok(dante, 'Dante Reyes should be listed as on-shift');
      assert.strictEqual(dante.role, 'mechanic');
      assert.strictEqual(dante.status, 'on_shift');
    });
  });

  describe('assignMechanicAction', () => {
    it('assigns an on-shift mechanic to an unassigned work order', async () => {
      const testOrder: DetailedWorkOrder = {
        id: 'wo-test-dispatch-101',
        orderNumber: 'WO-2026-9099',
        bayId: null,
        bayName: 'Bay 1',
        customerName: 'Maria Santos',
        customerPhone: '0918-123-4567',
        vehicleModel: 'Honda Beat 110',
        plateNumber: '456-XYZ',
        serviceCode: 'SRV-OIL-01',
        serviceName: 'Oil Change Service',
        mechanicId: null,
        status: 'QUEUED',
        estimatedDurationMinutes: 20,
        startedAt: null,
        completedAt: null,
        notes: 'Change oil with 10W-40',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      appendInMemoryWorkOrder(testOrder);

      const assignResult = await assignMechanicAction(
        testOrder.id,
        'd0000000-0000-0000-0000-000000000003',
        'Dante Reyes'
      );

      assert.strictEqual(assignResult.success, true);
      assert.ok(assignResult.data);
      assert.strictEqual(
        assignResult.data.mechanicId,
        'd0000000-0000-0000-0000-000000000003'
      );
      assert.strictEqual(assignResult.data.mechanicName, 'Dante Reyes');
    });

    it('returns error when target work order is not found', async () => {
      const result = await assignMechanicAction(
        'non-existent-order-id',
        'd0000000-0000-0000-0000-000000000003',
        'Dante Reyes'
      );

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('Work order not found'));
    });
  });
});
