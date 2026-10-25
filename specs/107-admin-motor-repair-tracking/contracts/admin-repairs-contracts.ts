import { z } from 'zod';
import type { WorkOrderStatus } from '@/lib/types/service';
import type { DetailedWorkOrder } from '@/lib/types/workshop';

export type RepairStageBadge =
  | 'Pending'
  | 'In Progress'
  | 'Waiting for Parts'
  | 'Ready for Release';

export interface AdminMotorRepairItem extends DetailedWorkOrder {
  chassisNumber: string;
  vehicleMake: string;
  stageBadge: RepairStageBadge;
  elapsedMinutes: number;
}

export interface RepairsDashboardKpiSummary {
  activeRepairsCount: number;
  inProgressCount: number;
  waitingForPartsCount: number;
  completedTodayCount: number;
  occupiedBays: number;
  totalBays: number;
  bayUtilizationPercent: number;
}

export interface RepairsFilterState {
  searchQuery: string;
  statusFilter: 'ALL' | WorkOrderStatus;
  mechanicFilter: 'ALL' | (string & {});
  bayFilter: 'ALL' | (string & {});
  viewMode: 'grid' | 'table';
}

export const AdminReassignMechanicSchema = z.object({
  workOrderId: z.string().min(1, 'Work order ID is required'),
  orderNumber: z.string().min(1, 'Order number is required'),
  mechanicId: z.string().min(1, 'Mechanic ID is required'),
  mechanicName: z.string().min(1, 'Mechanic name is required'),
  bayId: z.string().optional().nullable(),
  bayName: z.string().optional(),
  reason: z.string().optional(),
});

export type AdminReassignMechanicInput = z.infer<typeof AdminReassignMechanicSchema>;

export const RepairsFilterSchema = z.object({
  searchQuery: z.string().default(''),
  statusFilter: z.enum(['ALL', 'QUEUED', 'IN PROGRESS', 'PENDING_PARTS', 'COMPLETED', 'CANCELLED']).default('ALL'),
  mechanicFilter: z.string().default('ALL'),
  bayFilter: z.string().default('ALL'),
  viewMode: z.enum(['grid', 'table']).default('grid'),
});
