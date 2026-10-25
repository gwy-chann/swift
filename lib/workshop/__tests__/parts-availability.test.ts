import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_MOCK_WORK_ORDERS,
  MOCK_SERVICE_BAYS,
} from '../workshop-mock-data.ts';
import type { WorkOrderRequiredPart } from '../../types/workshop.ts';

describe('Workshop Parts Stock Availability & Shelf Locators (SIAA-99)', () => {
  describe('Mock Data Integrity', () => {
    it('provides at least 4 standard demonstration service bays', () => {
      assert.equal(MOCK_SERVICE_BAYS.length, 4);
      const names = MOCK_SERVICE_BAYS.map((b) => b.name);
      assert.ok(names.some((n) => n.includes('Bay 1')));
      assert.ok(names.some((n) => n.includes('Bay 2')));
      assert.ok(names.some((n) => n.includes('Bay 3')));
      assert.ok(names.some((n) => n.includes('Bay 4')));
    });

    it('contains valid work orders assigned across multiple bays and technicians', () => {
      assert.ok(INITIAL_MOCK_WORK_ORDERS.length >= 4);

      const danteJobs = INITIAL_MOCK_WORK_ORDERS.filter(
        (o) => o.mechanicName === 'Dante Reyes'
      );
      assert.ok(danteJobs.length >= 2, 'Dante Reyes should have multiple assigned jobs');

      const queuedJobs = INITIAL_MOCK_WORK_ORDERS.filter(
        (o) => o.status === 'QUEUED'
      );
      assert.ok(queuedJobs.length >= 1, 'At least one work order should be QUEUED');
    });

    it('validates required replacement parts have accurate stock availability flags', () => {
      for (const order of INITIAL_MOCK_WORK_ORDERS) {
        if (order.requiredParts && order.requiredParts.length > 0) {
          for (const part of order.requiredParts) {
            assert.ok(part.sku.length > 0, 'Part must have a SKU');
            assert.ok(part.shelfLocation.length > 0, 'Part must specify shelf location');
            assert.equal(
              part.isAvailable,
              part.stockAvailable >= part.quantityNeeded,
              `isAvailable flag must match stockAvailable (${part.stockAvailable}) >= quantityNeeded (${part.quantityNeeded}) for ${part.sku}`
            );
          }
        }
      }
    });

    it('identifies orders with missing or low parts correctly', () => {
      const orderWithMissingParts = INITIAL_MOCK_WORK_ORDERS.find((o) =>
        o.requiredParts?.some((p) => !p.isAvailable)
      );

      assert.ok(orderWithMissingParts, 'Expected at least one work order with missing parts');
      const missing = orderWithMissingParts.requiredParts?.filter((p) => !p.isAvailable);
      assert.ok((missing?.length ?? 0) > 0);
    });

    it('verifies all labor tasks have non-empty descriptions', () => {
      for (const order of INITIAL_MOCK_WORK_ORDERS) {
        if (order.laborTasks && order.laborTasks.length > 0) {
          for (const task of order.laborTasks) {
            assert.ok(task.id.length > 0);
            assert.ok(task.description.length > 0);
            assert.equal(typeof task.completed, 'boolean');
          }
        }
      }
    });
  });
});
