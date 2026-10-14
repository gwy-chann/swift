import { z } from 'zod';
import type { DbStaffShift, PunchLog } from '@/lib/types/logs';

export const RealtimeChannelStatusSchema = z.enum([
  'CONNECTING',
  'SUBSCRIBED',
  'TIMED_OUT',
  'CHANNEL_ERROR',
  'CLOSED',
]);
export type RealtimeChannelStatus = z.infer<typeof RealtimeChannelStatusSchema>;

export const StaffShiftRealtimeEventSchema = z.object({
  eventType: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  table: z.literal('staff_shifts'),
  schema: z.literal('public'),
  commit_timestamp: z.string().optional(),
});
export type StaffShiftRealtimeEvent = z.infer<typeof StaffShiftRealtimeEventSchema>;

export interface UseStaffRealtimeShiftsOptions {
  enabled?: boolean;
  channelName?: string;
  terminalId?: string;
  onInsert?: (shift: DbStaffShift) => void;
  onUpdate?: (shift: DbStaffShift) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (status: RealtimeChannelStatus) => void;
}

export interface UseStaffRealtimeShiftsResult {
  isConnected: boolean;
  status: RealtimeChannelStatus;
  activeStaffCount: number;
}

export interface RehydrateShiftPayload {
  activeShift: DbStaffShift | null;
  recentLogs?: PunchLog[];
  nowTimestamp?: number;
}
