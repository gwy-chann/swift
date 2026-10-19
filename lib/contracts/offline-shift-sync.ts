import type { PunchLog } from '../types/logs.ts';

export const SWIFT_STORAGE_KEYS = {
  SHIFT_STATE: 'swift_staff_shift_state',
  OFFLINE_QUEUE: 'swift_offline_punch_queue',
  LEGACY_ACTIVE_SHIFT: 'swift_active_shift',
} as const;

export type OfflinePunchActionType = 'clock_in' | 'clock_out' | 'toggle_break';
export type ActiveShiftStatus = 'on_shift' | 'break' | 'completed' | 'idle';

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

export interface ActiveShiftCacheItem {
  shiftId: string;
  staffName: string;
  profileId: string;
  clockIn: string;
  status: ActiveShiftStatus;
  durationSeconds?: number;
}

export interface StoredStaffSessionItem {
  isShiftActive: boolean;
  activeShiftId?: string | null;
  shiftStatus: ActiveShiftStatus;
  shiftSeconds: number;
  shiftId?: string;
  staffName: string;
  profileId: string;
  role?: string;
}

export interface StoredStaffShiftState {
  version: number;
  lastSavedAt: number;
  currentStaff: string;
  currentProfileId: string;
  currentStaffRole?: string;
  isShiftActive: boolean;
  activeShiftId: string | null;
  shiftStatus: ActiveShiftStatus;
  shiftSeconds: number;
  activeShift: ActiveShiftCacheItem | null;
  punchLogs: PunchLog[];
  staffSessions: Record<string, StoredStaffSessionItem>;
}

export interface OfflineSyncResult {
  synced: number;
  failed: number;
  remaining: number;
  errors: string[];
}
