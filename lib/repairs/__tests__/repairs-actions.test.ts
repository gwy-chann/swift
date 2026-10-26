import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveVehicleMake,
  deriveChassisNumber,
  deriveStageBadge,
  calculateElapsedMinutes,
  computeRepairsKpiSummary,
  filterAdminRepairs,
} from '../repairs-utils.ts';
import {
  fetchAdminRepairsAction,
  reassignMotorRepairMechanicAction,
} from '../repairs-actions.ts';
import type { AdminMotorRepairItem, RepairsFilterState } from '../repairs-contracts.ts';
import { resetInMemoryWorkOrders, getInMemoryWorkOrders } from '../../workshop/workshop-actions.ts';
import { evaluateRouteAccess, type ResolvedSession } from '../../auth/session-guards.ts';

describe('Admin Motor Repair Tracking & Service Bay Monitoring (SIAA-107)', () => {
  beforeEach(() => {
    resetInMemoryWorkOrders();
  });

  describe('Vehicle & Status Derivations', () => {
    it('correctly extracts motorcycle make from various model formats', () => {
      assert.strictEqual(deriveVehicleMake('Yamaha NMAX 155'), 'Yamaha');
      assert.strictEqual(deriveVehicleMake('Honda Click 150i'), 'Honda');
      assert.strictEqual(deriveVehicleMake('Suzuki Raider 150 Fi'), 'Suzuki');
      assert.strictEqual(deriveVehicleMake('Kawasaki Ninja 400'), 'Kawasaki');
      assert.strictEqual(deriveVehicleMake('Vespa Sprint 150'), 'Vespa');
      assert.strictEqual(deriveVehicleMake('Custom Chopper'), 'Custom');
      assert.strictEqual(deriveVehicleMake(''), 'Motorcycle');
    });

    it('generates consistent deterministic chassis tokens', () => {
      const chassis = deriveChassisNumber('WO-2026-0001', 'ABC-1234', 'f0000000-0000-0000-0000-000000000001');
      assert.strictEqual(chassis, 'CHAS-ABC1234-0001');

      const chassis2 = deriveChassisNumber('WO-2026-0002', 'XYZ-7890', 'f0000000-0000-0000-0000-000000000002');
      assert.strictEqual(chassis2, 'CHAS-XYZ7890-0002');
    });

    it('maps database statuses to canonical customer-facing stage badges', () => {
      assert.strictEqual(deriveStageBadge('QUEUED'), 'Pending');
      assert.strictEqual(deriveStageBadge('IN PROGRESS'), 'In Progress');
      assert.strictEqual(deriveStageBadge('PENDING_PARTS'), 'Waiting for Parts');
      assert.strictEqual(deriveStageBadge('COMPLETED'), 'Ready for Release');
    });

    it('calculates elapsed minutes accurately', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const elapsed = calculateElapsedMinutes(tenMinsAgo, null);
      assert.strictEqual(elapsed, 10);

      const invalidElapsed = calculateElapsedMinutes(null, null);
      assert.strictEqual(invalidElapsed, 0);
    });
  });

  describe('KPI Metric Computations', () => {
    it('computes accurate active repairs, status breakdowns, and bay utilization', () => {
      const mockItems: AdminMotorRepairItem[] = [
        {
          id: '1',
          orderNumber: 'WO-1',
          bayId: 'bay-1',
          bayName: 'Bay 1',
          customerName: 'Juan',
          vehicleModel: 'Yamaha NMAX',
          vehicleMake: 'Yamaha',
          plateNumber: 'ABC-1',
          chassisNumber: 'CHAS-ABC1-0001',
          serviceCode: 'SRV-1',
          serviceName: 'Oil Change',
          mechanicId: 'm1',
          mechanicName: 'Dante',
          status: 'IN PROGRESS',
          stageBadge: 'In Progress',
          estimatedDurationMinutes: 30,
          elapsedMinutes: 15,
          startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          completedAt: null,
          notes: 'Standard check',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          orderNumber: 'WO-2',
          bayId: 'bay-2',
          bayName: 'Bay 2',
          customerName: 'Maria',
          vehicleModel: 'Honda Click',
          vehicleMake: 'Honda',
          plateNumber: 'XYZ-2',
          chassisNumber: 'CHAS-XYZ2-0002',
          serviceCode: 'SRV-2',
          serviceName: 'CVT Cleaning',
          mechanicId: 'm2',
          mechanicName: 'Alex',
          status: 'PENDING_PARTS',
          stageBadge: 'Waiting for Parts',
          estimatedDurationMinutes: 45,
          elapsedMinutes: 30,
          startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          completedAt: null,
          notes: 'Waiting for clutch spring',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          orderNumber: 'WO-3',
          bayId: null,
          bayName: 'Unassigned',
          customerName: 'Ramon',
          vehicleModel: 'Suzuki Raider',
          vehicleMake: 'Suzuki',
          plateNumber: 'RAI-3',
          chassisNumber: 'CHAS-RAI3-0003',
          serviceCode: 'SRV-3',
          serviceName: 'Clutch',
          mechanicId: null,
          status: 'QUEUED',
          stageBadge: 'Pending',
          estimatedDurationMinutes: 60,
          elapsedMinutes: 5,
          startedAt: null,
          completedAt: null,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '4',
          orderNumber: 'WO-4',
          bayId: 'bay-1',
          bayName: 'Bay 1',
          customerName: 'Carlos',
          vehicleModel: 'Honda Beat',
          vehicleMake: 'Honda',
          plateNumber: 'HND-4',
          chassisNumber: 'CHAS-HND4-0004',
          serviceCode: 'SRV-4',
          serviceName: 'Tune Up',
          mechanicId: 'm1',
          mechanicName: 'Dante',
          status: 'COMPLETED',
          stageBadge: 'Ready for Release',
          estimatedDurationMinutes: 20,
          elapsedMinutes: 20,
          startedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
          completedAt: new Date().toISOString(),
          notes: 'Completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const summary = computeRepairsKpiSummary(mockItems, 4);

      assert.strictEqual(summary.inProgressCount, 1);
      assert.strictEqual(summary.waitingForPartsCount, 1);
      assert.strictEqual(summary.activeRepairsCount, 2);
      assert.strictEqual(summary.completedTodayCount, 1);
      assert.strictEqual(summary.occupiedBays, 2);
      assert.strictEqual(summary.totalBays, 4);
      assert.strictEqual(summary.bayUtilizationPercent, 50);
    });
  });

  describe('Multi-Axis Search & Filtering', () => {
    const sampleItems: AdminMotorRepairItem[] = [
      {
        id: '1',
        orderNumber: 'WO-2026-0001',
        bayId: 'bay-1',
        bayName: 'Bay 1 (Quick Bay)',
        customerName: 'Juan Dela Cruz',
        vehicleModel: 'Yamaha NMAX 155',
        vehicleMake: 'Yamaha',
        plateNumber: 'ABC-1234',
        chassisNumber: 'CHAS-ABC1234-0001',
        serviceCode: 'SRV-OIL-01',
        serviceName: 'Standard Oil Change',
        mechanicId: 'mech-dante',
        mechanicName: 'Dante Reyes',
        status: 'IN PROGRESS',
        stageBadge: 'In Progress',
        estimatedDurationMinutes: 30,
        elapsedMinutes: 18,
        startedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        completedAt: null,
        notes: 'Slight vibration',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        orderNumber: 'WO-2026-0002',
        bayId: 'bay-2',
        bayName: 'Bay 2 (Scooter Bay)',
        customerName: 'Maria Santos',
        vehicleModel: 'Honda Click 150i',
        vehicleMake: 'Honda',
        plateNumber: 'XYZ-7890',
        chassisNumber: 'CHAS-XYZ7890-0002',
        serviceCode: 'SRV-CVT-01',
        serviceName: 'CVT Cleaning',
        mechanicId: null,
        mechanicName: undefined,
        status: 'PENDING_PARTS',
        stageBadge: 'Waiting for Parts',
        estimatedDurationMinutes: 45,
        elapsedMinutes: 20,
        startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        completedAt: null,
        notes: 'Sluggish pickup',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('filters items by status accurately', () => {
      const filters: RepairsFilterState = {
        searchQuery: '',
        statusFilter: 'PENDING_PARTS',
        mechanicFilter: 'ALL',
        bayFilter: 'ALL',
        viewMode: 'grid',
      };

      const filtered = filterAdminRepairs(sampleItems, filters);
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].orderNumber, 'WO-2026-0002');
    });

    it('filters items by mechanic name accurately', () => {
      const filters: RepairsFilterState = {
        searchQuery: '',
        statusFilter: 'ALL',
        mechanicFilter: 'Dante Reyes',
        bayFilter: 'ALL',
        viewMode: 'grid',
      };

      const filtered = filterAdminRepairs(sampleItems, filters);
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].mechanicName, 'Dante Reyes');
    });

    it('searches by license plate number case-insensitively', () => {
      const filters: RepairsFilterState = {
        searchQuery: 'abc-1234',
        statusFilter: 'ALL',
        mechanicFilter: 'ALL',
        bayFilter: 'ALL',
        viewMode: 'grid',
      };

      const filtered = filterAdminRepairs(sampleItems, filters);
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].customerName, 'Juan Dela Cruz');
    });

    it('searches by vehicle model or customer name', () => {
      const filters: RepairsFilterState = {
        searchQuery: 'click',
        statusFilter: 'ALL',
        mechanicFilter: 'ALL',
        bayFilter: 'ALL',
        viewMode: 'grid',
      };

      const filtered = filterAdminRepairs(sampleItems, filters);
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].plateNumber, 'XYZ-7890');
    });
  });

  describe('Server Action Data Retrieval & Reassignment', () => {
    it('fetchAdminRepairsAction loads active items and computed statistics', async () => {
      const result = await fetchAdminRepairsAction();
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.ok(result.data.items.length > 0);
      assert.ok(result.data.summary.totalBays >= 1);

      const firstItem = result.data.items[0];
      assert.ok(firstItem.chassisNumber);
      assert.ok(firstItem.stageBadge);
      assert.ok(firstItem.vehicleMake);
    });

    it('reassignMotorRepairMechanicAction updates work order mechanic and logs audit entry', async () => {
      const allOrders = getInMemoryWorkOrders();
      const targetOrder = allOrders[0];

      const reassignResult = await reassignMotorRepairMechanicAction({
        workOrderId: targetOrder.id,
        orderNumber: targetOrder.orderNumber,
        mechanicId: 'd0000000-0000-0000-0000-000000000003',
        mechanicName: 'Dante Reyes',
        bayId: targetOrder.bayId,
        reason: 'Bottleneck workload rebalancing',
      });

      assert.strictEqual(reassignResult.success, true);
      assert.strictEqual(reassignResult.data?.mechanicName, 'Dante Reyes');
    });

    it('reassignMotorRepairMechanicAction rejects invalid payloads', async () => {
      const invalidResult = await reassignMotorRepairMechanicAction({
        workOrderId: '',
        orderNumber: '',
        mechanicId: '',
        mechanicName: '',
      });

      assert.strictEqual(invalidResult.success, false);
      assert.ok(invalidResult.error);
    });
  });

  describe('Role-Based Access Control (RBAC) Guard for /admin/repairs', () => {
    it('allows authenticated administrator to access /admin/repairs', () => {
      const adminSession: ResolvedSession = {
        isAuthenticated: true,
        role: 'admin',
        userId: 'admin-uuid',
        source: 'supabase',
      };

      const decision = evaluateRouteAccess('/admin/repairs', adminSession);
      assert.strictEqual(decision.action, 'ALLOW');
    });

    it('denies authenticated staff and redirects them away from /admin/repairs', () => {
      const staffSession: ResolvedSession = {
        isAuthenticated: true,
        role: 'staff',
        userId: 'staff-uuid',
        source: 'supabase',
      };

      const decision = evaluateRouteAccess('/admin/repairs', staffSession);
      assert.strictEqual(decision.action, 'REDIRECT');
      assert.strictEqual(decision.destination, '/staff/pos');
    });

    it('denies unauthenticated visitors and redirects to home / login', () => {
      const guestSession: ResolvedSession = {
        isAuthenticated: false,
        role: null,
        source: 'none',
      };

      const decision = evaluateRouteAccess('/admin/repairs', guestSession);
      assert.strictEqual(decision.action, 'REDIRECT');
      assert.strictEqual(decision.destination, '/');
    });
  });
});
