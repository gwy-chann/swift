import type { PunchLog } from '@/lib/types/logs';
import type { StaffMemberShiftState, ShiftStateStatus } from '@/lib/store/punch-store';

export const STORAGE_KEYS = {
  SHIFT_STATE: 'swift_staff_shift_state',
  OFFLINE_QUEUE: 'swift_offline_punch_queue',
  LEGACY_ACTIVE_SHIFT: 'swift_active_shift',
} as const;

export type OfflinePunchActionType = 'clock_in' | 'clock_out' | 'toggle_break';

export interface QueuedPunchAction {
  id: string;
  type: OfflinePunchActionType;
  profileId: string;
  staffName: string;
  terminalId: string;
  shiftId?: string;
  timestamp: string; // ISO 8601 string
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export interface StoredStaffShiftState {
  version: number;
  lastSavedAt: number;
  currentStaff: string;
  currentProfileId: string;
  isShiftActive: boolean;
  activeShiftId: string | null;
  shiftStatus: ShiftStateStatus;
  shiftSeconds: number;
  activeShift: {
    shiftId: string;
    staffName: string;
    profileId: string;
    clockIn: string;
    status: ShiftStateStatus;
    durationSeconds?: number;
  } | null;
  punchLogs: PunchLog[];
  staffSessions: Record<string, StaffMemberShiftState>;
}

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  lastError: string | null;
}
