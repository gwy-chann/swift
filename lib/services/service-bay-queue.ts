import type { WorkOrderStatus } from '../types/service.ts';

export interface ServiceBayDisplayItem {
  id: string;
  bayName: string;
  status: WorkOrderStatus;
  vehicleService: string;
  mechanicInfo: string;
}

/**
 * Returns the human-readable status badge label per SIAA-35 acceptance criteria:
 * - IN PROGRESS: 'In Progress'
 * - QUEUED: 'Queued'
 * - COMPLETED: 'Ready for Inspection / Pickup'
 * - PENDING_PARTS: 'Waiting for Parts'
 * - CANCELLED: 'Cancelled'
 */
export function formatWorkOrderStatusLabel(status: WorkOrderStatus): string {
  switch (status) {
    case 'IN PROGRESS':
      return 'In Progress';
    case 'COMPLETED':
      return 'Ready for Inspection / Pickup';
    case 'PENDING_PARTS':
      return 'Waiting for Parts';
    case 'CANCELLED':
      return 'Cancelled';
    case 'QUEUED':
    default:
      return 'Queued';
  }
}

/**
 * Returns the SWIFT design token classes for the status badge per SIAA-35 hierarchy:
 * - IN PROGRESS: amber badge ('bg-accent-light text-accent border border-accent/30')
 * - QUEUED: neutral gray badge ('bg-bg-muted text-text-secondary border border-border-subtle')
 * - COMPLETED: success green badge ('bg-success-light text-success border border-success/30')
 * - PENDING_PARTS: amber badge ('bg-accent-light text-accent border border-accent/30')
 * - CANCELLED: danger red badge ('bg-danger-light text-danger border border-danger/30')
 */
export function getWorkOrderStatusBadgeClass(status: WorkOrderStatus): string {
  switch (status) {
    case 'IN PROGRESS':
      return 'bg-accent-light text-accent border border-accent/30';
    case 'COMPLETED':
      return 'bg-success-light text-success border border-success/30';
    case 'PENDING_PARTS':
      return 'bg-accent-light text-accent border border-accent/30';
    case 'CANCELLED':
      return 'bg-danger-light text-danger border border-danger/30';
    case 'QUEUED':
    default:
      return 'bg-bg-muted text-text-secondary border border-border-subtle';
  }
}

/**
 * Formats mechanic info and remaining duration tracker per SIAA-35 Scenario 2:
 * - In progress with time: 'Mechanic: <Name> (~<M> mins left)'
 * - In progress fallback: 'Mechanic: <Name> (In Progress)'
 * - Queued: 'Waiting for Bay clearance'
 * - Completed: 'Mechanic: <Name> (Ready for pickup)'
 * - Waiting for parts: 'Mechanic: <Name> (Waiting for counter parts)'
 */
export function formatMechanicTurnaround(
  mechanicName?: string | null,
  status: WorkOrderStatus = 'QUEUED',
  minutesLeft?: number | null
): string {
  if (status === 'QUEUED') {
    return 'Waiting for Bay clearance';
  }

  const name =
    mechanicName && mechanicName.trim().length > 0
      ? mechanicName.trim()
      : 'Dante Reyes';

  if (status === 'COMPLETED') {
    return `Mechanic: ${name} (Ready for pickup)`;
  }

  if (status === 'PENDING_PARTS') {
    return `Mechanic: ${name} (Waiting for counter parts)`;
  }

  if (typeof minutesLeft === 'number' && minutesLeft > 0) {
    return `Mechanic: ${name} (~${minutesLeft} mins left)`;
  }

  return `Mechanic: ${name} (In Progress)`;
}

/**
 * Calculates active bays count (occupied by jobs in progress or waiting for parts).
 */
export function calculateActiveBaysCount(
  bays: { status: WorkOrderStatus }[]
): number {
  return bays.filter(
    (bay) => bay.status === 'IN PROGRESS' || bay.status === 'PENDING_PARTS'
  ).length;
}

/**
 * Formats the active capacity badge text (e.g. '4 Bays Active', '1 Bay Active').
 */
export function formatActiveCapacityBadge(activeCount: number): string {
  return `${activeCount} ${activeCount === 1 ? 'Bay' : 'Bays'} Active`;
}
