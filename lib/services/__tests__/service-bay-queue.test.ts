import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatWorkOrderStatusLabel,
  getWorkOrderStatusBadgeClass,
  formatMechanicTurnaround,
  calculateActiveBaysCount,
  formatActiveCapacityBadge,
  type ServiceBayDisplayItem,
} from '../service-bay-queue.ts';

describe('Service Bay Work Order Queue & Mechanic Utilization Monitor (SIAA-35)', () => {
  describe('Scenario 1: Live Multi-Bay Activity Panel & Capacity Calculation', () => {
    it('calculates active bays count correctly for mixed status list', () => {
      const bays: ServiceBayDisplayItem[] = [
        {
          id: '1',
          bayName: 'Bay 1 (Quick Bay)',
          status: 'IN PROGRESS',
          vehicleService: 'Yamaha NMAX 155 • Oil Change + Brake Pads',
          mechanicInfo: 'Mechanic: Dante Reyes (~10 mins left)',
        },
        {
          id: '2',
          bayName: 'Bay 2 (Scooter Bay)',
          status: 'IN PROGRESS',
          vehicleService: 'Honda Click 150i • Full CVT Overhaul',
          mechanicInfo: 'Mechanic: Alex Lim (~25 mins left)',
        },
        {
          id: '3',
          bayName: 'Bay 3 (Mechanical Bay)',
          status: 'QUEUED',
          vehicleService: 'Suzuki Raider 150 Fi • Clutch Replacement',
          mechanicInfo: 'Waiting for Bay clearance',
        },
        {
          id: '4',
          bayName: 'Bay 4 (Tuning & Diagnostics)',
          status: 'PENDING_PARTS',
          vehicleService: 'Kawasaki Ninja 400 • ECU Remap & Dyno Tune',
          mechanicInfo: 'Mechanic: Dante Reyes (Waiting for counter parts)',
        },
      ];

      const activeCount = calculateActiveBaysCount(bays);
      assert.equal(activeCount, 3);
      assert.equal(formatActiveCapacityBadge(activeCount), '3 Bays Active');
    });

    it('formats single active bay capacity with singular noun', () => {
      assert.equal(formatActiveCapacityBadge(1), '1 Bay Active');
      assert.equal(formatActiveCapacityBadge(4), '4 Bays Active');
      assert.equal(formatActiveCapacityBadge(0), '0 Bays Active');
    });
  });

  describe('Scenario 2: Assigned Mechanic & Time Remaining Tracker', () => {
    it('formats in-progress job with assigned mechanic name and remaining minutes', () => {
      const info = formatMechanicTurnaround('Dante Reyes', 'IN PROGRESS', 10);
      assert.equal(info, 'Mechanic: Dante Reyes (~10 mins left)');
    });

    it('formats another in-progress job with different mechanic and minutes', () => {
      const info = formatMechanicTurnaround('Alex Lim', 'IN PROGRESS', 25);
      assert.equal(info, 'Mechanic: Alex Lim (~25 mins left)');
    });

    it('formats queued jobs without assigned bay as waiting for bay clearance', () => {
      const info = formatMechanicTurnaround('Dante Reyes', 'QUEUED', null);
      assert.equal(info, 'Waiting for Bay clearance');
    });

    it('formats completed work orders as ready for pickup', () => {
      const info = formatMechanicTurnaround('Dante Reyes', 'COMPLETED', 0);
      assert.equal(info, 'Mechanic: Dante Reyes (Ready for pickup)');
    });

    it('formats pending parts work orders as waiting for counter parts', () => {
      const info = formatMechanicTurnaround('Dante Reyes', 'PENDING_PARTS', 0);
      assert.equal(info, 'Mechanic: Dante Reyes (Waiting for counter parts)');
    });

    it('falls back to default mechanic name if none provided', () => {
      const info = formatMechanicTurnaround(null, 'IN PROGRESS', 15);
      assert.equal(info, 'Mechanic: Dante Reyes (~15 mins left)');
    });
  });

  describe('Scenario 3: Work Order Status Badge Hierarchy', () => {
    it('returns warning amber badge styling and label for IN PROGRESS jobs', () => {
      const label = formatWorkOrderStatusLabel('IN PROGRESS');
      const badgeClass = getWorkOrderStatusBadgeClass('IN PROGRESS');

      assert.equal(label, 'In Progress');
      assert.ok(badgeClass.includes('bg-accent-light'));
      assert.ok(badgeClass.includes('text-accent'));
      assert.ok(badgeClass.includes('border-accent/30'));
    });

    it('returns neutral gray badge styling and label for QUEUED jobs', () => {
      const label = formatWorkOrderStatusLabel('QUEUED');
      const badgeClass = getWorkOrderStatusBadgeClass('QUEUED');

      assert.equal(label, 'Queued');
      assert.ok(badgeClass.includes('bg-bg-muted'));
      assert.ok(badgeClass.includes('text-text-secondary'));
      assert.ok(badgeClass.includes('border-border-subtle'));
    });

    it('returns success green badge styling and label for COMPLETED jobs', () => {
      const label = formatWorkOrderStatusLabel('COMPLETED');
      const badgeClass = getWorkOrderStatusBadgeClass('COMPLETED');

      assert.equal(label, 'Ready for Inspection / Pickup');
      assert.ok(badgeClass.includes('bg-success-light'));
      assert.ok(badgeClass.includes('text-success'));
      assert.ok(badgeClass.includes('border-success/30'));
    });

    it('returns amber badge styling and label for PENDING_PARTS jobs', () => {
      const label = formatWorkOrderStatusLabel('PENDING_PARTS');
      const badgeClass = getWorkOrderStatusBadgeClass('PENDING_PARTS');

      assert.equal(label, 'Waiting for Parts');
      assert.ok(badgeClass.includes('bg-accent-light'));
      assert.ok(badgeClass.includes('text-accent'));
    });

    it('returns danger red badge styling and label for CANCELLED jobs', () => {
      const label = formatWorkOrderStatusLabel('CANCELLED');
      const badgeClass = getWorkOrderStatusBadgeClass('CANCELLED');

      assert.equal(label, 'Cancelled');
      assert.ok(badgeClass.includes('bg-danger-light'));
      assert.ok(badgeClass.includes('text-danger'));
    });
  });
});
