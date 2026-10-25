'use server';

import type { WorkOrderStatus } from '../types/service.ts';
import type { DetailedWorkOrder } from '../types/workshop.ts';
import type {
  AdminMotorRepairItem,
  RepairsDashboardKpiSummary,
  RepairsFilterState,
  RepairStageBadge,
  RepairsActionResult,
  AdminReassignMechanicInput,
} from './repairs-contracts.ts';
import { AdminReassignMechanicSchema } from './repairs-contracts.ts';
import {
  fetchWorkshopOrdersAction,
  assignMechanicAction,
  getInMemoryWorkOrders,
} from '../workshop/workshop-actions.ts';
import { logSecurityEventAction } from '../admin/audit-actions.ts';

async function safeRevalidatePaths(): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/repairs');
    revalidatePath('/staff/work-orders');
    revalidatePath('/admin');
  } catch {
    // Revalidation not active in pure unit test runner
  }
}

/**
 * Extracts motorcycle make from model description.
 */
export function deriveVehicleMake(vehicleModel: string): string {
  if (!vehicleModel || typeof vehicleModel !== 'string') return 'Motorcycle';
  const trimmed = vehicleModel.trim();
  const knownMakes = ['Yamaha', 'Honda', 'Suzuki', 'Kawasaki', 'Kymco', 'Vespa', 'Ducati', 'BMW', 'KTM'];
  for (const make of knownMakes) {
    if (new RegExp(`^${make}\\b`, 'i').test(trimmed)) {
      return make;
    }
  }
  const firstWord = trimmed.split(' ')[0];
  return firstWord || 'Motorcycle';
}

/**
 * Derives a consistent chassis/VIN token for display and tracking.
 */
export function deriveChassisNumber(orderNumber: string, plateNumber: string, id: string): string {
  const cleanPlate = (plateNumber || 'SWIFT').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const shortId = (id || orderNumber || '0000').replace(/-/g, '').slice(-4).toUpperCase();
  return `CHAS-${cleanPlate}-${shortId}`;
}

/**
 * Maps database WorkOrderStatus to user-facing RepairStageBadge.
 */
export function deriveStageBadge(status: WorkOrderStatus): RepairStageBadge {
  switch (status) {
    case 'QUEUED':
      return 'Pending';
    case 'IN PROGRESS':
      return 'In Progress';
    case 'PENDING_PARTS':
      return 'Waiting for Parts';
    case 'COMPLETED':
      return 'Ready for Release';
    default:
      return 'Pending';
  }
}

/**
 * Calculates elapsed duration in minutes from start timestamp or order creation.
 */
export function calculateElapsedMinutes(
  startedAt: string | Date | null | undefined,
  createdAt: string | Date | null | undefined
): number {
  const reference = startedAt || createdAt;
  if (!reference) return 0;
  const refMs = new Date(reference).getTime();
  const nowMs = Date.now();
  if (isNaN(refMs) || refMs > nowMs) return 0;
  return Math.max(0, Math.round((nowMs - refMs) / 60000));
}

/**
 * Transforms a DetailedWorkOrder into an enriched AdminMotorRepairItem.
 */
export function mapToAdminMotorRepairItem(order: DetailedWorkOrder): AdminMotorRepairItem {
  return {
    ...order,
    vehicleMake: deriveVehicleMake(order.vehicleModel),
    chassisNumber: deriveChassisNumber(order.orderNumber, order.plateNumber, order.id),
    stageBadge: deriveStageBadge(order.status),
    elapsedMinutes: calculateElapsedMinutes(order.startedAt, order.createdAt),
  };
}

/**
 * Computes workshop KPI statistics for dashboard display.
 */
export function computeRepairsKpiSummary(
  items: AdminMotorRepairItem[],
  totalBays = 4
): RepairsDashboardKpiSummary {
  const inProgressCount = items.filter((item) => item.status === 'IN PROGRESS').length;
  const waitingForPartsCount = items.filter((item) => item.status === 'PENDING_PARTS').length;
  const completedTodayCount = items.filter((item) => item.status === 'COMPLETED').length;
  
  // Active motors undergoing work on the shop floor
  const activeRepairsCount = inProgressCount + waitingForPartsCount;

  // Occupied bays currently active
  const occupiedBayIds = new Set(
    items
      .filter((item) => (item.status === 'IN PROGRESS' || item.status === 'PENDING_PARTS') && item.bayId)
      .map((item) => item.bayId as string)
  );
  const occupiedBays = occupiedBayIds.size;
  const effectiveTotalBays = Math.max(1, totalBays);
  const bayUtilizationPercent = Math.min(100, Math.round((occupiedBays / effectiveTotalBays) * 100));

  return {
    activeRepairsCount,
    inProgressCount,
    waitingForPartsCount,
    completedTodayCount,
    occupiedBays,
    totalBays: effectiveTotalBays,
    bayUtilizationPercent,
  };
}

/**
 * Filters and searches admin repair items in-memory based on user filter criteria.
 */
export function filterAdminRepairs(
  items: AdminMotorRepairItem[],
  filters: RepairsFilterState
): AdminMotorRepairItem[] {
  let result = [...items];

  // Status Filter
  if (filters.statusFilter && filters.statusFilter !== 'ALL') {
    result = result.filter((item) => item.status === filters.statusFilter);
  }

  // Mechanic Filter
  if (filters.mechanicFilter && filters.mechanicFilter !== 'ALL') {
    result = result.filter(
      (item) => item.mechanicId === filters.mechanicFilter || item.mechanicName === filters.mechanicFilter
    );
  }

  // Bay Filter
  if (filters.bayFilter && filters.bayFilter !== 'ALL') {
    result = result.filter((item) => item.bayId === filters.bayFilter || item.bayName === filters.bayFilter);
  }

  // Search Query (plate, model, customer, chassis, service)
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.trim().toLowerCase();
    result = result.filter(
      (item) =>
        item.plateNumber?.toLowerCase().includes(q) ||
        item.vehicleModel?.toLowerCase().includes(q) ||
        item.customerName?.toLowerCase().includes(q) ||
        item.customerPhone?.toLowerCase().includes(q) ||
        item.chassisNumber?.toLowerCase().includes(q) ||
        item.orderNumber?.toLowerCase().includes(q) ||
        item.serviceName?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.mechanicName?.toLowerCase().includes(q)
    );
  }

  return result;
}

/**
 * Server action to fetch all active repair work orders and calculate live dashboard KPIs.
 */
export async function fetchAdminRepairsAction(): Promise<
  RepairsActionResult<{ items: AdminMotorRepairItem[]; summary: RepairsDashboardKpiSummary }>
> {
  try {
    const ordersResult = await fetchWorkshopOrdersAction();
    const rawOrders: DetailedWorkOrder[] = ordersResult.success && ordersResult.data
      ? ordersResult.data
      : getInMemoryWorkOrders();

    const items = rawOrders.map(mapToAdminMotorRepairItem);
    const summary = computeRepairsKpiSummary(items);

    return {
      success: true,
      data: {
        items,
        summary,
      },
    };
  } catch (error) {
    const fallbackItems = getInMemoryWorkOrders().map(mapToAdminMotorRepairItem);
    return {
      success: true,
      data: {
        items: fallbackItems,
        summary: computeRepairsKpiSummary(fallbackItems),
      },
      error: error instanceof Error ? error.message : 'Fallback to memory store',
    };
  }
}

/**
 * Server action for administrative reassignment of a repair job to an on-shift mechanic.
 */
export async function reassignMotorRepairMechanicAction(
  rawInput: AdminReassignMechanicInput
): Promise<RepairsActionResult<AdminMotorRepairItem>> {
  const parsed = AdminReassignMechanicSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid reassignment parameters',
    };
  }

  const { workOrderId, orderNumber, mechanicId, mechanicName, bayId, bayName, reason } = parsed.data;

  try {
    // Execute workshop mechanic assignment
    const assignResult = await assignMechanicAction(workOrderId, mechanicId, mechanicName);
    if (!assignResult.success) {
      return {
        success: false,
        error: assignResult.error || 'Failed to assign mechanic to work order',
      };
    }

    // Record forensic audit log entry
    await logSecurityEventAction({
      action: `Admin reassigned work order ${orderNumber} to mechanic ${mechanicName}`,
      severity: 'info',
      metadata: {
        workOrderId,
        orderNumber,
        mechanicId,
        mechanicName,
        bayId: bayId ?? null,
        bayName: bayName ?? null,
        reason: reason ?? 'Admin workshop dispatch reassignment',
      },
    });

    await safeRevalidatePaths();

    // Retrieve updated item
    const refreshed = await fetchAdminRepairsAction();
    const updated = refreshed.data?.items.find((item) => item.id === workOrderId || item.orderNumber === orderNumber);

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reassign mechanic',
    };
  }
}
