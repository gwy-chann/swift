import type {
  DatabaseServiceBayRow,
  DatabaseWorkOrderRow,
  ServiceBay,
  WorkOrder,
  ServiceBayStatus,
  WorkOrderStatus,
} from '../types/service.ts';

const VALID_BAY_STATUSES: Set<ServiceBayStatus> = new Set([
  'AVAILABLE',
  'OCCUPIED',
  'MAINTENANCE',
  'QUEUED',
]);

const VALID_WORK_ORDER_STATUSES: Set<WorkOrderStatus> = new Set([
  'QUEUED',
  'IN PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
]);

/**
 * Maps a raw PostgreSQL service_bays row to the domain ServiceBay entity.
 */
export function mapServiceBayRow(row: DatabaseServiceBayRow): ServiceBay {
  const status: ServiceBayStatus = VALID_BAY_STATUSES.has(row.status)
    ? row.status
    : 'AVAILABLE';

  return {
    id: row.id,
    name: row.name,
    bayType: row.bay_type,
    status,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a raw PostgreSQL work_orders row to the domain WorkOrder entity.
 */
export function mapWorkOrderRow(row: DatabaseWorkOrderRow): WorkOrder {
  const status: WorkOrderStatus = VALID_WORK_ORDER_STATUSES.has(row.status)
    ? row.status
    : 'QUEUED';

  return {
    id: row.id,
    orderNumber: row.order_number,
    bayId: row.bay_id ?? null,
    customerName: row.customer_name,
    vehicleModel: row.vehicle_model,
    plateNumber: row.plate_number,
    serviceCode: row.service_code,
    serviceName: row.service_name,
    mechanicId: row.mechanic_id ?? null,
    status,
    estimatedDurationMinutes: row.estimated_duration_minutes ?? 30,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Validates whether a proposed status transition is permitted in the work order state machine.
 */
export function validateWorkOrderStatusTransition(
  currentStatus: WorkOrderStatus,
  newStatus: WorkOrderStatus
): boolean {
  if (currentStatus === newStatus) return true;

  // Terminal states cannot transition to any other status
  if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
    return false;
  }

  switch (currentStatus) {
    case 'QUEUED':
      return newStatus === 'IN PROGRESS' || newStatus === 'CANCELLED';

    case 'IN PROGRESS':
      return (
        newStatus === 'PENDING_PARTS' ||
        newStatus === 'COMPLETED' ||
        newStatus === 'CANCELLED'
      );

    case 'PENDING_PARTS':
      return newStatus === 'IN PROGRESS' || newStatus === 'CANCELLED';

    default:
      return false;
  }
}

/**
 * Calculates remaining job duration in minutes based on startedAt timestamp.
 * Returns 0 if work has exceeded the estimated duration, or estimatedDurationMinutes if not started.
 */
export function calculateRemainingMinutes(
  startedAt: string | Date | null | undefined,
  estimatedDurationMinutes: number
): number {
  if (!startedAt) {
    return estimatedDurationMinutes;
  }

  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsedMinutes = Math.floor((now - startTime) / (60 * 1000));
  const remaining = estimatedDurationMinutes - elapsedMinutes;

  return Math.max(0, remaining);
}
