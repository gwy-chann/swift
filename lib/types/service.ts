export interface LaborService {
  id?: string;
  code: string;
  name: string;
  bay: string; // e.g. "Bay 1 / Quick Bay"
  rate: number; // Flat labor rate in PHP
  duration: string; // e.g. "15 mins", "45 mins"
  description?: string;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ServiceRateAuditLog {
  id: string;
  serviceId: string;
  serviceCode: string;
  oldRate: number;
  newRate: number;
  reason?: string;
  userName: string;
  createdAt: string | Date;
}

export interface CreateLaborServicePayload {
  code: string;
  name: string;
  bay: string;
  rate: number;
  duration: string;
  description?: string;
  active?: boolean;
}

export interface UpdateLaborServicePayload {
  name?: string;
  bay?: string;
  rate?: number;
  duration?: string;
  description?: string;
  active?: boolean;
  reason?: string;
  userName?: string;
}

export type ServiceActionErrorCode =
  | 'NOT_FOUND'
  | 'DUPLICATE_CODE'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'DATABASE_ERROR';

export interface ServiceActionResult<T = LaborService> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ServiceActionErrorCode;
  fieldErrors?: Record<string, string>;
}

// ====================================================================
// SIAA-66: Service Bays & Active Repair Work Orders
// ====================================================================

export type ServiceBayStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'QUEUED';

export type WorkOrderStatus =
  | 'QUEUED'
  | 'IN PROGRESS'
  | 'PENDING_PARTS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface DatabaseServiceBayRow {
  id: string;
  name: string;
  bay_type: string;
  status: ServiceBayStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseWorkOrderRow {
  id: string;
  order_number: string;
  bay_id: string | null;
  customer_name: string;
  vehicle_model: string;
  plate_number: string;
  service_code: string;
  service_name: string;
  mechanic_id: string | null;
  status: WorkOrderStatus;
  estimated_duration_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceBay {
  id: string;
  name: string;
  bayType: string;
  status: ServiceBayStatus;
  displayOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  bayId: string | null;
  customerName: string;
  vehicleModel: string;
  plateNumber: string;
  serviceCode: string;
  serviceName: string;
  mechanicId: string | null;
  status: WorkOrderStatus;
  estimatedDurationMinutes: number;
  startedAt: string | Date | null;
  completedAt: string | Date | null;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

