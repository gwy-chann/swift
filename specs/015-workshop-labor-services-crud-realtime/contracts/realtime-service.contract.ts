import type { LaborService } from '@/lib/types/service';

export type RealtimeChannelStatus =
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | 'CONNECTING';

export interface UseLaborServicesRealtimeOptions {
  enabled?: boolean;
  onInsert?: (service: LaborService) => void;
  onUpdate?: (service: LaborService) => void;
  onDelete?: (serviceId: string, serviceCode: string) => void;
}

export interface UseLaborServicesRealtimeResult {
  isConnected: boolean;
  status: RealtimeChannelStatus;
}
