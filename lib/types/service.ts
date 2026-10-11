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
