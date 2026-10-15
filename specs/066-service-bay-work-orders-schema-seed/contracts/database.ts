export interface DatabaseServiceBayRow {
  id: string;
  name: string;
  bay_type: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'QUEUED';
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
  status: 'QUEUED' | 'IN PROGRESS' | 'PENDING_PARTS' | 'COMPLETED' | 'CANCELLED';
  estimated_duration_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
