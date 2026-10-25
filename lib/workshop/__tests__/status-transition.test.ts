import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateWorkOrderStatusTransition,
  calculateRemainingMinutes,
} from '../../services/service-bay-mapper.ts';
import {
  fetchWorkshopOrdersAction,
  updateWorkshopOrderStatusAction,
  claimWorkOrderAction,
} from '../workshop-actions.ts';
import type { WorkOrderStatus } from '../../types/service.ts';

describe('Work Order State Machine & Progression Transitions (SIAA-99)', () => {
  describe('validateWorkOrderStatusTransition', () => {
    it('allows valid progression from QUEUED to IN PROGRESS', () => {
      assert.equal(validateWorkOrderStatusTransition('QUEUED', 'IN PROGRESS'), true);
    });

    it('allows valid progression from QUEUED to CANCELLED', () => {
      assert.equal(validateWorkOrderStatusTransition('QUEUED', 'CANCELLED'), true);
    });

    it('rejects jumping directly from QUEUED to COMPLETED', () => {
      assert.equal(validateWorkOrderStatusTransition('QUEUED', 'COMPLETED'), false);
    });

    it('allows transitions between IN PROGRESS and PENDING_PARTS', () => {
      assert.equal(validateWorkOrderStatusTransition('IN PROGRESS', 'PENDING_PARTS'), true);
      assert.equal(validateWorkOrderStatusTransition('PENDING_PARTS', 'IN PROGRESS'), true);
    });

    it('requires PENDING_PARTS to resume to IN PROGRESS before COMPLETED', () => {
      assert.equal(validateWorkOrderStatusTransition('PENDING_PARTS', 'IN PROGRESS'), true);
      assert.equal(validateWorkOrderStatusTransition('PENDING_PARTS', 'COMPLETED'), false);
      assert.equal(validateWorkOrderStatusTransition('IN PROGRESS', 'COMPLETED'), true);
    });

    it('rejects all transitions out of terminal states COMPLETED and CANCELLED', () => {
      const allStatuses: WorkOrderStatus[] = [
        'QUEUED',
        'IN PROGRESS',
        'PENDING_PARTS',
        'COMPLETED',
        'CANCELLED',
      ];

      for (const next of allStatuses) {
        if (next !== 'COMPLETED') {
          assert.equal(
            validateWorkOrderStatusTransition('COMPLETED', next),
            false,
            `COMPLETED must not transition to ${next}`
          );
        }
        if (next !== 'CANCELLED') {
          assert.equal(
            validateWorkOrderStatusTransition('CANCELLED', next),
            false,
            `CANCELLED must not transition to ${next}`
          );
        }
      }
    });

    it('allows idempotent transitions to identical status', () => {
      assert.equal(validateWorkOrderStatusTransition('IN PROGRESS', 'IN PROGRESS'), true);
      assert.equal(validateWorkOrderStatusTransition('QUEUED', 'QUEUED'), true);
    });
  });

  describe('calculateRemainingMinutes', () => {
    it('returns full estimated duration when job has not started', () => {
      assert.equal(calculateRemainingMinutes(null, 45), 45);
      assert.equal(calculateRemainingMinutes(undefined, 30), 30);
    });

    it('calculates remaining duration accurately when elapsed time is within estimate', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const remaining = calculateRemainingMinutes(tenMinsAgo, 30);
      assert.ok(remaining <= 21 && remaining >= 19, `Expected ~20 mins left, got ${remaining}`);
    });

    it('clamps remaining minutes at zero when job runs overtime', () => {
      const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
      assert.equal(calculateRemainingMinutes(twoHoursAgo, 30), 0);
    });
  });

  describe('updateWorkshopOrderStatusAction', () => {
    it('updates work order status atomically with valid progression', async () => {
      const ordersRes = await fetchWorkshopOrdersAction();
      assert.equal(ordersRes.success, true);
      assert.ok(Array.isArray(ordersRes.data) && ordersRes.data.length > 0);

      const target = ordersRes.data[0];
      const res = await updateWorkshopOrderStatusAction(target.id, 'IN PROGRESS');
      assert.equal(res.success, true);
      assert.equal(res.data?.status, 'IN PROGRESS');
      assert.ok(typeof res.data?.updatedAt === 'string');
    });

    it('rejects invalid status jumps and returns error message', async () => {
      const ordersRes = await fetchWorkshopOrdersAction();
      assert.equal(ordersRes.success, true);

      // Find an order that is COMPLETED
      const completedOrder = ordersRes.data?.find((o) => o.status === 'COMPLETED');
      if (completedOrder) {
        const res = await updateWorkshopOrderStatusAction(completedOrder.id, 'QUEUED');
        assert.equal(res.success, false);
        assert.ok(res.error?.includes('Invalid status transition'));
      }
    });
  });

  describe('claimWorkOrderAction', () => {
    it('self-assigns mechanic to an unassigned work order', async () => {
      const ordersRes = await fetchWorkshopOrdersAction();
      const queuedOrder = ordersRes.data?.find((o) => o.status === 'QUEUED' || !o.mechanicId);

      if (queuedOrder) {
        const res = await claimWorkOrderAction(
          queuedOrder.id,
          'd0000000-0000-0000-0000-000000000003',
          'Dante Reyes',
          true
        );

        assert.equal(res.success, true);
        assert.equal(res.data?.mechanicId, 'd0000000-0000-0000-0000-000000000003');
        assert.equal(res.data?.mechanicName, 'Dante Reyes');
        assert.equal(res.data?.status, 'IN PROGRESS');
      }
    });
  });
});
