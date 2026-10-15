/**
 * Canonical Contracts & Schemas for Executive Realtime Operational Broadcast
 * Jira Ticket: SIAA-68 (STORY-6.8)
 */

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export type RealtimeChannelStatus =
  | 'CONNECTING'
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CHANNEL_ERROR'
  | 'CLOSED';

export interface DbTransactionBroadcast {
  id?: string;
  receipt_number?: string;
  cashier_name?: string;
  pricing_mode?: string;
  total_due: number;
  subtotal?: number;
  discount_amount?: number;
  payment_method?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface DbWorkOrderBroadcast {
  id: string;
  order_number: string;
  bay_id?: string | null;
  customer_name?: string;
  vehicle_model?: string;
  plate_number?: string;
  service_name?: string;
  service_code?: string;
  mechanic_id?: string | null;
  status: 'QUEUED' | 'IN PROGRESS' | 'PENDING_PARTS' | 'COMPLETED' | 'CANCELLED';
  estimated_duration_minutes?: number;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface DbServiceBayBroadcast {
  id: string;
  name: string;
  bay_type: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'QUEUED';
  display_order?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface DbProductStockBroadcast {
  id?: string;
  sku: string;
  name?: string;
  stock: number;
  min_threshold: number;
  updated_at?: string;
  [key: string]: unknown;
}

export interface UseExecutiveRealtimeOptions {
  enabled?: boolean;
  channelName?: string;
  onTransaction?: (transaction: DbTransactionBroadcast) => void;
  onWorkOrderChange?: (workOrder: DbWorkOrderBroadcast, eventType: RealtimeEventType) => void;
  onServiceBayChange?: (bay: DbServiceBayBroadcast, eventType: RealtimeEventType) => void;
  onStockAlert?: (product: DbProductStockBroadcast) => void;
  onStatusChange?: (status: RealtimeChannelStatus) => void;
}

export interface UseExecutiveRealtimeResult {
  isConnected: boolean;
  status: RealtimeChannelStatus;
  lastEventTimestamp: string | null;
}
