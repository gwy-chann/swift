import type { WorkOrder, WorkOrderStatus } from './service.ts';

export interface WorkOrderLaborTask {
  id: string;
  description: string;
  completed: boolean;
  notes?: string;
}

export interface WorkOrderRequiredPart {
  sku: string;
  partName: string;
  quantityNeeded: number;
  stockAvailable: number;
  shelfLocation: string; // e.g. "Rack A, Shelf 2"
  isAvailable: boolean;  // stockAvailable >= quantityNeeded
}

export interface DetailedWorkOrder extends WorkOrder {
  bayName?: string;
  mechanicName?: string;
  customerPhone?: string;
  laborTasks?: WorkOrderLaborTask[];
  requiredParts?: WorkOrderRequiredPart[];
  remainingMinutes?: number;
}

export interface WorkshopQueueFilterState {
  tab: 'my-jobs' | 'all-bays';
  status: 'ALL' | WorkOrderStatus;
  searchQuery: string;
}

export interface WorkshopQueueSummary {
  activeJobsCount: number;
  myJobsCount: number;
  pendingPartsCount: number;
  completedTodayCount: number;
  activeBaysCount: number;
  totalBaysCount: number;
}
