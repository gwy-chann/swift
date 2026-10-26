import type { WorkOrderStatus } from '../types/service.ts';
import type { DetailedWorkOrder } from '../types/workshop.ts';
import type {
  AdminMotorRepairItem,
  RepairsDashboardKpiSummary,
  RepairsFilterState,
  RepairStageBadge,
} from './repairs-contracts.ts';

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
