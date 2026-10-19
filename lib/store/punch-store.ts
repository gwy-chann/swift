'use client';

import { useSyncExternalStore } from 'react';
import type { PunchLog } from '../types/logs.ts';
import { mapStaffShiftRow, type DbStaffShift } from '../types/logs.ts';
import { MOCK_PUNCH_LOGS } from '../mock-data/index.ts';
import { MOCK_STAFF_PROFILES } from '../mock-data/users.ts';
import type { StaffPermissions } from '../types/auth.ts';
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from '../types/auth.ts';
import { ShiftRpcError, SHIFT_RPC_ERROR_CODES, formatDurationToHoursMinutes } from '../contracts/punch-clock-rpcs.ts';
import {
  SWIFT_STORAGE_KEYS,
  type OfflinePunchActionType,
  type QueuedPunchAction,
  type ActiveShiftCacheItem,
  type StoredStaffShiftState,
  type OfflineSyncResult,
} from '../contracts/offline-shift-sync.ts';

export {
  SWIFT_STORAGE_KEYS,
  type OfflinePunchActionType,
  type QueuedPunchAction,
  type ActiveShiftCacheItem,
  type StoredStaffShiftState,
  type OfflineSyncResult,
};

export interface PunchStoreError {
  code: string;
  message: string;
  timestamp: number;
}

export type ShiftStateStatus = 'on_shift' | 'break' | 'completed' | 'idle';

export interface StaffMemberShiftState {
  isShiftActive: boolean;
  activeShiftId?: string | null;
  shiftStatus: ShiftStateStatus;
  shiftSeconds: number;
  shiftId?: string;
  staffName: string;
  profileId: string;
  role?: string;
  permissions?: StaffPermissions;
  clockInTime?: string;
}

export interface PunchStoreState {
  isShiftActive: boolean;
  activeShiftId: string | null;
  shiftSeconds: number;
  punchLogs: PunchLog[];
  currentStaff: string;
  currentProfileId: string;
  currentStaffRole: string;
  currentPermissions: StaffPermissions;
  shiftStatus: ShiftStateStatus;
  lastError: PunchStoreError | null;
  activeStaffCount: number;
  staffSessions: Record<string, StaffMemberShiftState>;
}

export type OfflineSyncDispatcher = (
  action: QueuedPunchAction
) => Promise<{ success: boolean; shiftId?: string; error?: string }>;

let defaultSyncDispatcher: OfflineSyncDispatcher | null = null;
let offlineActionSequence = 0;

function generateOfflineActionId(): string {
  offlineActionSequence += 1;
  return `OFFLINE-${Date.now()}-${offlineActionSequence}`;
}

export function registerOfflineSyncDispatcher(dispatcher: OfflineSyncDispatcher): void {
  defaultSyncDispatcher = dispatcher;
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: Storage }).localStorage) {
    return (globalThis as { localStorage?: Storage }).localStorage || null;
  }
  return null;
}

function formatShiftDurationTimer(seconds: number): string {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function resolveStaffRole(profileId?: string, explicitRole?: string): string {
  if (explicitRole) return explicitRole.toLowerCase();
  if (profileId) {
    const found = MOCK_STAFF_PROFILES.find((p) => p.id === profileId);
    if (found?.role) return found.role.toLowerCase();
  }
  return 'cashier';
}

export function resolveStaffPermissions(
  profileId?: string,
  explicitPermissions?: StaffPermissions,
  role?: string
): StaffPermissions {
  if (explicitPermissions) {
    return { ...DEFAULT_STAFF_PERMISSIONS, ...explicitPermissions };
  }
  if (profileId) {
    const found = MOCK_STAFF_PROFILES.find((p) => p.id === profileId);
    if (found?.permissions) {
      return { ...DEFAULT_STAFF_PERMISSIONS, ...found.permissions };
    }
  }
  const resolvedRole = (role || 'cashier').toLowerCase() as keyof typeof DEFAULT_ROLE_PERMISSIONS;
  return DEFAULT_ROLE_PERMISSIONS[resolvedRole] || DEFAULT_STAFF_PERMISSIONS;
}

export class PunchStore {
  private state: PunchStoreState;
  private readonly listeners = new Set<() => void>();
  private readonly errorListeners = new Set<(error: PunchStoreError) => void>();

  constructor() {
    const initialLogs = [...MOCK_PUNCH_LOGS];
    const defaultProfileId = '00000000-0000-0000-0000-000000000002'; // Mike Morales
    const defaultStaff = 'Mike Morales';

    this.state = this.loadInitialState(defaultStaff, defaultProfileId, initialLogs);

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', () => {
        this.syncOfflineQueue().catch((err) => {
          console.warn('[PunchStore] Auto-sync on reconnect error:', err);
        });
      });
    }
  }

  private computeActiveShiftDelta(
    activeShift: ActiveShiftCacheItem | null,
    now: number
  ): {
    isShiftActive: boolean;
    shiftStatus: ShiftStateStatus;
    shiftSeconds: number;
    activeShiftId: string | null;
  } {
    if (!activeShift) {
      return { isShiftActive: false, shiftStatus: 'idle', shiftSeconds: 0, activeShiftId: null };
    }
    const clockInMs = new Date(activeShift.clockIn).getTime();
    const elapsed = Math.max(0, Math.floor((now - clockInMs) / 1000));
    if (activeShift.status === 'on_shift') {
      return {
        isShiftActive: true,
        shiftStatus: 'on_shift',
        shiftSeconds: elapsed,
        activeShiftId: activeShift.shiftId,
      };
    }
    if (activeShift.status === 'break') {
      return {
        isShiftActive: true,
        shiftStatus: 'break',
        shiftSeconds: activeShift.durationSeconds ?? elapsed,
        activeShiftId: activeShift.shiftId,
      };
    }
    return { isShiftActive: false, shiftStatus: 'completed', shiftSeconds: 0, activeShiftId: null };
  }

  private tryLoadStoredState(
    storage: Storage,
    defaultStaff: string,
    defaultProfileId: string,
    initialLogs: PunchLog[]
  ): PunchStoreState | null {
    const storedJson = storage.getItem(SWIFT_STORAGE_KEYS.SHIFT_STATE);
    if (!storedJson) return null;

    try {
      const parsed = JSON.parse(storedJson) as StoredStaffShiftState;
      if (!parsed || typeof parsed !== 'object') return null;

      const now = Date.now();
      const delta = this.computeActiveShiftDelta(parsed.activeShift, now);
      const isShiftActive = parsed.activeShift ? delta.isShiftActive : Boolean(parsed.isShiftActive);
      const shiftStatus = parsed.activeShift ? delta.shiftStatus : parsed.shiftStatus || 'idle';
      const shiftSeconds = parsed.activeShift ? delta.shiftSeconds : parsed.shiftSeconds || 0;
      const activeShiftId = parsed.activeShift ? delta.activeShiftId : parsed.activeShiftId || null;

      const staff = parsed.currentStaff || defaultStaff;
      const profileId = parsed.currentProfileId || defaultProfileId;
      const staffRole = parsed.currentStaffRole || resolveStaffRole(profileId);
      const storedPerms = (
        parsed as StoredStaffShiftState & { currentPermissions?: StaffPermissions }
      ).currentPermissions;
      const staffPermissions = resolveStaffPermissions(profileId, storedPerms, staffRole);
      const logs =
        Array.isArray(parsed.punchLogs) && parsed.punchLogs.length > 0
          ? parsed.punchLogs
          : initialLogs;
      const sessions =
        parsed.staffSessions && typeof parsed.staffSessions === 'object'
          ? (parsed.staffSessions as unknown as Record<string, StaffMemberShiftState>)
          : {
              [profileId]: {
                isShiftActive,
                activeShiftId,
                shiftStatus,
                shiftSeconds,
                staffName: staff,
                profileId,
                role: staffRole,
                permissions: staffPermissions,
              },
            };

      return {
        isShiftActive,
        activeShiftId,
        shiftSeconds,
        punchLogs: logs,
        currentStaff: staff,
        currentProfileId: profileId,
        currentStaffRole: staffRole,
        currentPermissions: staffPermissions,
        shiftStatus,
        lastError: null,
        activeStaffCount: this.calculateActiveStaffCount(logs),
        staffSessions: sessions,
      };
    } catch {
      return null;
    }
  }

  private tryLoadLegacyState(
    storage: Storage,
    defaultStaff: string,
    defaultProfileId: string,
    initialLogs: PunchLog[]
  ): PunchStoreState | null {
    const legacyJson = storage.getItem(SWIFT_STORAGE_KEYS.LEGACY_ACTIVE_SHIFT);
    if (!legacyJson) return null;

    try {
      const parsed = JSON.parse(legacyJson);
      if (
        !parsed ||
        !parsed.clockIn ||
        (parsed.status !== 'on_shift' && parsed.status !== 'break')
      ) {
        return null;
      }
      const now = Date.now();
      const clockInMs = new Date(parsed.clockIn).getTime();
      const elapsed = Math.max(0, Math.floor((now - clockInMs) / 1000));
      const status: ShiftStateStatus = parsed.status;
      const profileId = parsed.profileId || defaultProfileId;
      const staffName = parsed.staffName || defaultStaff;
      const staffRole = resolveStaffRole(profileId);
      const staffPermissions = resolveStaffPermissions(profileId, undefined, staffRole);
      const shiftId = parsed.shiftId || null;
      const shiftSeconds = status === 'break' ? (parsed.durationSeconds ?? elapsed) : elapsed;

      return {
        isShiftActive: true,
        activeShiftId: shiftId,
        shiftSeconds,
        punchLogs: initialLogs,
        currentStaff: staffName,
        currentProfileId: profileId,
        currentStaffRole: staffRole,
        currentPermissions: staffPermissions,
        shiftStatus: status,
        lastError: null,
        activeStaffCount: this.calculateActiveStaffCount(initialLogs),
        staffSessions: {
          [profileId]: {
            isShiftActive: true,
            activeShiftId: shiftId,
            shiftStatus: status,
            shiftSeconds,
            staffName,
            profileId,
            role: staffRole,
            permissions: staffPermissions,
          },
        },
      };
    } catch {
      return null;
    }
  }

  private createDefaultState(
    defaultStaff: string,
    defaultProfileId: string,
    initialLogs: PunchLog[]
  ): PunchStoreState {
    const defaultRole = resolveStaffRole(defaultProfileId);
    const defaultPermissions = resolveStaffPermissions(defaultProfileId, undefined, defaultRole);
    return {
      isShiftActive: false,
      activeShiftId: null,
      shiftSeconds: 0,
      punchLogs: initialLogs,
      currentStaff: defaultStaff,
      currentProfileId: defaultProfileId,
      currentStaffRole: defaultRole,
      currentPermissions: defaultPermissions,
      shiftStatus: 'idle',
      lastError: null,
      activeStaffCount: this.calculateActiveStaffCount(initialLogs),
      staffSessions: {
        [defaultProfileId]: {
          isShiftActive: false,
          shiftStatus: 'idle',
          shiftSeconds: 0,
          staffName: defaultStaff,
          profileId: defaultProfileId,
          role: defaultRole,
          permissions: defaultPermissions,
        },
      },
    };
  }

  private loadInitialState(
    defaultStaff: string,
    defaultProfileId: string,
    initialLogs: PunchLog[]
  ): PunchStoreState {
    const storage = getStorage();
    if (storage) {
      const fromStored = this.tryLoadStoredState(
        storage,
        defaultStaff,
        defaultProfileId,
        initialLogs
      );
      if (fromStored) return fromStored;
      const fromLegacy = this.tryLoadLegacyState(
        storage,
        defaultStaff,
        defaultProfileId,
        initialLogs
      );
      if (fromLegacy) return fromLegacy;
    }
    return this.createDefaultState(defaultStaff, defaultProfileId, initialLogs);
  }

  private calculateActiveStaffCount(logs: PunchLog[]): number {
    const staffStatusMap = new Map<string, string>();
    for (const log of logs) {
      if (log.staff && !staffStatusMap.has(log.staff)) {
        staffStatusMap.set(log.staff, log.status);
      }
    }
    let count = 0;
    for (const status of staffStatusMap.values()) {
      if (
        status === 'On Shift' ||
        status === 'Break' ||
        status === 'on_shift' ||
        status === 'break'
      ) {
        count++;
      }
    }
    return count;
  }

  public getState = (): PunchStoreState => {
    return this.state;
  };

  public getActiveStaffCount = (): number => {
    return this.state.activeStaffCount;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public onError = (listener: (error: PunchStoreError) => void): (() => void) => {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  };

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private notifyError(error: PunchStoreError) {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in punchStore error listener:', err);
      }
    }
  }

  public clearError = (): void => {
    if (this.state.lastError !== null) {
      this.state = {
        ...this.state,
        lastError: null,
      };
      this.notify();
    }
  };

  public handleShiftError = (error: unknown): PunchStoreError => {
    let code: string = 'UNKNOWN_SHIFT_ERROR';
    let message = 'An unexpected error occurred during shift processing.';

    if (error instanceof ShiftRpcError) {
      code = error.code;
      message = error.message;
    } else if (error instanceof Error) {
      if (
        error.message.includes('ACTIVE_SHIFT_EXISTS') ||
        (error as { code?: string }).code === 'P0409'
      ) {
        code = SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS;
        message = 'Active shift already in progress. Please clock out before starting a new shift.';
      } else {
        message = error.message;
      }
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as { code?: string; message?: string; details?: string };
      code = errObj.code || code;
      message = errObj.message || errObj.details || message;
    }

    if (code === SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS) {
      message = 'Active shift already in progress. Please clock out before starting a new shift.';
    }

    const payload: PunchStoreError = {
      code,
      message,
      timestamp: Date.now(),
    };

    this.state = {
      ...this.state,
      lastError: payload,
    };
    this.notify();
    this.notifyError(payload);
    return payload;
  };

  public tickSecond = (): void => {
    let sessionsChanged = false;
    const newSessions = { ...this.state.staffSessions };
    for (const pid in newSessions) {
      const s = newSessions[pid];
      if (s.isShiftActive && s.shiftStatus === 'on_shift') {
        newSessions[pid] = { ...s, shiftSeconds: s.shiftSeconds + 1 };
        sessionsChanged = true;
      }
    }

    const currentSession = newSessions[this.state.currentProfileId];
    if (sessionsChanged || (this.state.isShiftActive && this.state.shiftStatus === 'on_shift')) {
      this.state = {
        ...this.state,
        shiftSeconds: currentSession ? currentSession.shiftSeconds : this.state.shiftSeconds + 1,
        staffSessions: newSessions,
      };
      this.notify();
    }
  };

  public switchStaff = (profile: {
    id: string;
    name: string;
    role?: string;
    permissions?: StaffPermissions;
  }): void => {
    const role = resolveStaffRole(profile.id, profile.role);
    const permissions = resolveStaffPermissions(profile.id, profile.permissions, role);
    const existing = this.state.staffSessions[profile.id];
    if (existing) {
      this.state = {
        ...this.state,
        currentStaff: profile.name,
        currentProfileId: profile.id,
        currentStaffRole: role,
        currentPermissions: permissions,
        isShiftActive: existing.isShiftActive,
        activeShiftId: existing.activeShiftId || null,
        shiftStatus: existing.shiftStatus,
        shiftSeconds: existing.shiftSeconds,
        lastError: null,
        staffSessions: {
          ...this.state.staffSessions,
          [profile.id]: {
            ...existing,
            role,
            permissions,
          },
        },
      };
    } else {
      const newSession: StaffMemberShiftState = {
        isShiftActive: false,
        activeShiftId: null,
        shiftStatus: 'idle',
        shiftSeconds: 0,
        staffName: profile.name,
        profileId: profile.id,
        role,
        permissions,
      };
      this.state = {
        ...this.state,
        currentStaff: profile.name,
        currentProfileId: profile.id,
        currentStaffRole: role,
        currentPermissions: permissions,
        isShiftActive: false,
        activeShiftId: null,
        shiftStatus: 'idle',
        shiftSeconds: 0,
        lastError: null,
        staffSessions: {
          ...this.state.staffSessions,
          [profile.id]: newSession,
        },
      };
    }
    this.persistFullStateToStorage();
    this.notify();
  };

  public updateStaffPermissions = (profileId: string, permissions: StaffPermissions): void => {
    const isCurrent = profileId === this.state.currentProfileId;
    const existing = this.state.staffSessions[profileId];
    const updatedSessions = {
      ...this.state.staffSessions,
      ...(existing
        ? {
            [profileId]: {
              ...existing,
              permissions,
            },
          }
        : {}),
    };

    this.state = {
      ...this.state,
      ...(isCurrent ? { currentPermissions: permissions } : {}),
      staffSessions: updatedSessions,
    };
    this.persistFullStateToStorage();
    this.notify();
  };

  public getStaffSession = (profileId: string): StaffMemberShiftState | undefined => {
    return this.state.staffSessions[profileId];
  };

  private persistActiveShiftToStorage(data: {
    shiftId: string;
    staffName: string;
    profileId: string;
    clockIn: string;
    status: string;
    durationSeconds?: number;
  }): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      if (data.status === 'completed' || data.status === 'idle') {
        storage.removeItem(SWIFT_STORAGE_KEYS.LEGACY_ACTIVE_SHIFT);
      } else {
        storage.setItem(SWIFT_STORAGE_KEYS.LEGACY_ACTIVE_SHIFT, JSON.stringify(data));
      }
    } catch {
      // Ignore
    }
  }

  private clearActiveShiftFromStorage(): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(SWIFT_STORAGE_KEYS.LEGACY_ACTIVE_SHIFT);
      const stored = storage.getItem(SWIFT_STORAGE_KEYS.SHIFT_STATE);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredStaffShiftState;
        parsed.isShiftActive = false;
        parsed.activeShiftId = null;
        parsed.shiftStatus = 'completed';
        parsed.activeShift = null;
        storage.setItem(SWIFT_STORAGE_KEYS.SHIFT_STATE, JSON.stringify(parsed));
      }
    } catch {
      // Ignore
    }
  }

  private persistFullStateToStorage(): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      const currentSession = this.state.staffSessions[this.state.currentProfileId];
      const activeShiftId = this.state.activeShiftId || currentSession?.activeShiftId || null;
      const clockInIso =
        currentSession?.clockInTime ||
        new Date(Date.now() - this.state.shiftSeconds * 1000).toISOString();

      const storedState: StoredStaffShiftState = {
        version: 1,
        lastSavedAt: Date.now(),
        currentStaff: this.state.currentStaff,
        currentProfileId: this.state.currentProfileId,
        currentStaffRole: this.state.currentStaffRole,
        isShiftActive: this.state.isShiftActive,
        activeShiftId,
        shiftStatus: this.state.shiftStatus,
        shiftSeconds: this.state.shiftSeconds,
        activeShift: this.state.isShiftActive
          ? {
              shiftId: activeShiftId || `PUNCH-${Date.now()}`,
              staffName: this.state.currentStaff,
              profileId: this.state.currentProfileId,
              clockIn: clockInIso,
              status: this.state.shiftStatus,
              durationSeconds: this.state.shiftSeconds,
            }
          : null,
        punchLogs: this.state.punchLogs,
        staffSessions: this.state.staffSessions as unknown as Record<string, import('../contracts/offline-shift-sync.ts').StoredStaffSessionItem>,
      };

      storage.setItem(SWIFT_STORAGE_KEYS.SHIFT_STATE, JSON.stringify(storedState));
    } catch (err) {
      console.warn('[PunchStore] Failed to persist state to storage:', err);
    }
  }

  private applyStoredStateRehydration(parsed: StoredStaffShiftState): void {
    const now = Date.now();
    const delta = this.computeActiveShiftDelta(parsed.activeShift, now);
    const profileId = parsed.currentProfileId || this.state.currentProfileId;
    const staffName = parsed.currentStaff || this.state.currentStaff;
    const currentStaffRole = parsed.currentStaffRole || resolveStaffRole(profileId);

    const isShiftActive = parsed.activeShift ? delta.isShiftActive : Boolean(parsed.isShiftActive);
    const shiftStatus = parsed.activeShift ? delta.shiftStatus : parsed.shiftStatus || 'idle';
    const shiftSeconds = parsed.activeShift ? delta.shiftSeconds : parsed.shiftSeconds || 0;
    const activeShiftId = parsed.activeShift ? delta.activeShiftId : parsed.activeShiftId || null;

    const updatedSessions = { ...this.state.staffSessions, ...(parsed.staffSessions as unknown as Record<string, StaffMemberShiftState> || {}) };
    if (isShiftActive) {
      updatedSessions[profileId] = {
        ...(updatedSessions[profileId] || {}),
        isShiftActive: true,
        activeShiftId,
        shiftStatus,
        shiftSeconds,
        staffName,
        profileId,
        role: currentStaffRole,
      };
    }

    const logs =
      Array.isArray(parsed.punchLogs) && parsed.punchLogs.length > 0
        ? this.mergeRecentLogs(this.state.punchLogs, parsed.punchLogs)
        : this.state.punchLogs;

    this.state = {
      ...this.state,
      isShiftActive,
      activeShiftId,
      shiftStatus,
      shiftSeconds,
      currentStaff: staffName,
      currentProfileId: profileId,
      currentStaffRole,
      punchLogs: logs,
      activeStaffCount: this.calculateActiveStaffCount(logs),
      staffSessions: updatedSessions,
    };
    this.notify();
  }

  private applyLegacyStorageRehydration(parsed: {
    status: ShiftStateStatus;
    clockIn: string;
    profileId?: string;
    staffName?: string;
    shiftId?: string;
    durationSeconds?: number;
  }): void {
    const now = Date.now();
    const clockInMs = new Date(parsed.clockIn).getTime();
    const elapsed = Math.max(0, Math.floor((now - clockInMs) / 1000));
    const status: ShiftStateStatus = parsed.status;
    const profileId = parsed.profileId || this.state.currentProfileId;
    const staffName = parsed.staffName || this.state.currentStaff;
    const staffRole = resolveStaffRole(profileId);
    const shiftId = parsed.shiftId || this.state.activeShiftId;

    const updatedSessions = { ...this.state.staffSessions };
    updatedSessions[profileId] = {
      isShiftActive: true,
      activeShiftId: shiftId,
      shiftStatus: status,
      shiftSeconds: status === 'break' ? (parsed.durationSeconds ?? elapsed) : elapsed,
      staffName,
      profileId,
      role: staffRole,
    };

    this.state = {
      ...this.state,
      isShiftActive: true,
      activeShiftId: shiftId,
      shiftStatus: status,
      shiftSeconds: status === 'break' ? (parsed.durationSeconds ?? elapsed) : elapsed,
      currentStaff: staffName,
      currentProfileId: profileId,
      currentStaffRole: staffRole,
      staffSessions: updatedSessions,
    };
    this.notify();
  }

  public rehydrateFromStorage = (): void => {
    const storage = getStorage();
    if (!storage) return;
    try {
      const stored = storage.getItem(SWIFT_STORAGE_KEYS.SHIFT_STATE);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredStaffShiftState;
        if (parsed && typeof parsed === 'object') {
          this.applyStoredStateRehydration(parsed);
          return;
        }
      }

      const legacyStored = storage.getItem(SWIFT_STORAGE_KEYS.LEGACY_ACTIVE_SHIFT);
      if (!legacyStored) return;
      const parsed = JSON.parse(legacyStored);
      if (
        parsed &&
        (parsed.status === 'on_shift' || parsed.status === 'break') &&
        parsed.clockIn
      ) {
        this.applyLegacyStorageRehydration(parsed);
      }
    } catch (err) {
      console.warn('[PunchStore] Failed to rehydrate active shift from storage:', err);
    }
  };

  public getOfflineQueue = (): QueuedPunchAction[] => {
    const storage = getStorage();
    if (!storage) return [];
    try {
      const stored = storage.getItem(SWIFT_STORAGE_KEYS.OFFLINE_QUEUE);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  public enqueueOfflinePunch = (
    action: Omit<QueuedPunchAction, 'id' | 'timestamp' | 'retryCount' | 'status'>
  ): QueuedPunchAction => {
    const item: QueuedPunchAction = {
      ...action,
      id: generateOfflineActionId(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    const storage = getStorage();
    if (storage) {
      try {
        const queue = this.getOfflineQueue();
        queue.push(item);
        storage.setItem(SWIFT_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
      } catch (err) {
        console.warn('[PunchStore] Failed to enqueue offline punch:', err);
      }
    }

    this.notify();
    return item;
  };

  public dequeueOfflinePunch = (actionId: string): void => {
    const storage = getStorage();
    if (!storage) return;
    try {
      const queue = this.getOfflineQueue().filter((item) => item.id !== actionId);
      storage.setItem(SWIFT_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
      this.notify();
    } catch (err) {
      console.warn('[PunchStore] Failed to dequeue offline punch:', err);
    }
  };

  public clearOfflineQueue = (): void => {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(SWIFT_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
      this.notify();
    } catch {
      // Ignore
    }
  };

  private async processSyncItem(
    item: QueuedPunchAction,
    dispatcher: OfflineSyncDispatcher
  ): Promise<{ success: boolean; shiftId?: string; error?: string }> {
    item.status = 'syncing';
    try {
      const res = await dispatcher(item);
      if (res.success) {
        return { success: true, shiftId: res.shiftId };
      }
      return { success: false, error: res.error || 'Sync dispatch failed' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  public syncOfflineQueue = async (
    customDispatcher?: OfflineSyncDispatcher
  ): Promise<OfflineSyncResult> => {
    const activeDispatcher = customDispatcher || defaultSyncDispatcher;
    const queue = this.getOfflineQueue();
    const result: OfflineSyncResult = {
      synced: 0,
      failed: 0,
      remaining: queue.length,
      errors: [],
    };

    if (queue.length === 0 || !activeDispatcher) {
      return result;
    }

    const remainingQueue: QueuedPunchAction[] = [];

    for (const item of queue) {
      const outcome = await this.processSyncItem(item, activeDispatcher);
      if (outcome.success) {
        result.synced += 1;
        if (outcome.shiftId && (item.type === 'clock_in' || !this.state.activeShiftId)) {
          this.setActiveShiftId(outcome.shiftId, item.profileId);
        }
      } else {
        item.status = 'failed';
        item.retryCount += 1;
        item.error = outcome.error;
        result.failed += 1;
        if (outcome.error) {
          result.errors.push(outcome.error);
        }
        remainingQueue.push(item);
      }
    }

    const storage = getStorage();
    if (storage) {
      try {
        storage.setItem(SWIFT_STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(remainingQueue));
      } catch {
        // Ignore
      }
    }

    result.remaining = remainingQueue.length;
    this.notify();
    return result;
  };

  public setActiveShiftId = (shiftId: string, profileId?: string): void => {
    const targetProfileId = profileId || this.state.currentProfileId;
    const session = this.state.staffSessions[targetProfileId];
    const updatedSessions = {
      ...this.state.staffSessions,
      [targetProfileId]: session
        ? { ...session, activeShiftId: shiftId, shiftId }
        : {
            isShiftActive: this.state.isShiftActive,
            activeShiftId: shiftId,
            shiftStatus: this.state.shiftStatus,
            shiftSeconds: this.state.shiftSeconds,
            staffName: this.state.currentStaff,
            profileId: targetProfileId,
          },
    };

    this.state = {
      ...this.state,
      activeShiftId: targetProfileId === this.state.currentProfileId ? shiftId : this.state.activeShiftId,
      staffSessions: updatedSessions,
    };

    const storage = getStorage();
    if (this.state.isShiftActive && storage) {
      try {
        const stored = storage.getItem(SWIFT_STORAGE_KEYS.LEGACY_ACTIVE_SHIFT);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.shiftId = shiftId;
          storage.setItem(SWIFT_STORAGE_KEYS.LEGACY_ACTIVE_SHIFT, JSON.stringify(parsed));
        }
      } catch {
        // Ignore
      }
    }

    this.persistFullStateToStorage();
    this.notify();
  };

  public clockIn = (
    staff?: string,
    terminalId: string = 'Terminal #01',
    profileId?: string
  ): void => {
    const targetProfileId = profileId || this.state.currentProfileId;
    const targetStaff = staff ?? this.state.currentStaff;
    const existingSession = this.state.staffSessions[targetProfileId];

    // Concurrency / duplicate shift guard
    if (
      existingSession &&
      existingSession.isShiftActive &&
      (existingSession.shiftStatus === 'on_shift' || existingSession.shiftStatus === 'break')
    ) {
      const err = this.handleShiftError(
        new ShiftRpcError(
          SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS,
          'Active shift already in progress. Please clock out before starting a new shift.',
          409
        )
      );
      throw new ShiftRpcError(err.code, err.message, 409);
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const shiftId = `PUNCH-${Date.now()}`;

    const newLog: PunchLog = {
      id: shiftId,
      date: dateStr,
      staff: targetStaff,
      timeIn: timeStr,
      timeOut: '-- Active Shift --',
      duration: '00h 00m',
      status: 'On Shift',
      terminal: terminalId,
    };

    const updatedLogs = [newLog, ...this.state.punchLogs];

    const updatedSession: StaffMemberShiftState = {
      isShiftActive: true,
      activeShiftId: shiftId,
      shiftStatus: 'on_shift',
      shiftSeconds: 0,
      staffName: targetStaff,
      profileId: targetProfileId,
      clockInTime: now.toISOString(),
    };

    const isCurrent = targetProfileId === this.state.currentProfileId;

    this.persistActiveShiftToStorage({
      shiftId,
      staffName: targetStaff,
      profileId: targetProfileId,
      clockIn: now.toISOString(),
      status: 'on_shift',
      durationSeconds: 0,
    });

    this.state = {
      ...this.state,
      isShiftActive: isCurrent ? true : this.state.isShiftActive,
      activeShiftId: isCurrent ? shiftId : this.state.activeShiftId,
      shiftStatus: isCurrent ? 'on_shift' : this.state.shiftStatus,
      shiftSeconds: isCurrent ? 0 : this.state.shiftSeconds,
      currentStaff: isCurrent ? targetStaff : this.state.currentStaff,
      lastError: null,
      punchLogs: updatedLogs,
      activeStaffCount: this.calculateActiveStaffCount(updatedLogs),
      staffSessions: {
        ...this.state.staffSessions,
        [targetProfileId]: updatedSession,
      },
    };
    this.persistFullStateToStorage();
    this.notify();
  };

  public toggleBreak = (profileId?: string): 'break' | 'on_shift' => {
    const targetProfileId = profileId || this.state.currentProfileId;
    const currentSession = this.state.staffSessions[targetProfileId] || {
      isShiftActive: this.state.isShiftActive,
      shiftStatus: this.state.shiftStatus,
      shiftSeconds: this.state.shiftSeconds,
      staffName: this.state.currentStaff,
      profileId: targetProfileId,
    };

    if (!currentSession.isShiftActive) {
      const err = this.handleShiftError(
        new ShiftRpcError(
          SHIFT_RPC_ERROR_CODES.SHIFT_NOT_ACTIVE,
          'Cannot toggle break when no shift is currently active.',
          400
        )
      );
      throw new ShiftRpcError(err.code, err.message, 400);
    }

    const nextStatus: ShiftStateStatus =
      currentSession.shiftStatus === 'on_shift' ? 'break' : 'on_shift';
    const targetId = this.state.activeShiftId || currentSession.shiftId;

    let updated = false;
    const updatedLogs = this.state.punchLogs.map((log, index) => {
      const isTarget = targetId
        ? log.id === targetId
        : index === 0 &&
          (log.status === 'On Shift' ||
            log.status === 'Break' ||
            log.status === 'on_shift' ||
            log.status === 'break');
      if (
        isTarget &&
        (log.status === 'On Shift' ||
          log.status === 'Break' ||
          log.status === 'on_shift' ||
          log.status === 'break')
      ) {
        updated = true;
        return {
          ...log,
          status: (nextStatus === 'break' ? 'Break' : 'On Shift') as PunchLog['status'],
        };
      }
      return log;
    });

    if (!updated && updatedLogs.length > 0) {
      for (let i = 0; i < updatedLogs.length; i++) {
        const log = updatedLogs[i];
        if (
          log.status === 'On Shift' ||
          log.status === 'Break' ||
          log.status === 'on_shift' ||
          log.status === 'break'
        ) {
          updatedLogs[i] = {
            ...log,
            status: (nextStatus === 'break' ? 'Break' : 'On Shift') as PunchLog['status'],
          };
          break;
        }
      }
    }

    const updatedSession: StaffMemberShiftState = {
      ...currentSession,
      shiftStatus: nextStatus,
    };

    if (targetId) {
      this.persistActiveShiftToStorage({
        shiftId: targetId,
        staffName: currentSession.staffName,
        profileId: targetProfileId,
        clockIn: currentSession.clockInTime || new Date().toISOString(),
        status: nextStatus,
        durationSeconds: currentSession.shiftSeconds,
      });
    }

    const isCurrent = targetProfileId === this.state.currentProfileId;

    this.state = {
      ...this.state,
      shiftStatus: isCurrent ? nextStatus : this.state.shiftStatus,
      punchLogs: updatedLogs,
      activeStaffCount: this.calculateActiveStaffCount(updatedLogs),
      lastError: null,
      staffSessions: {
        ...this.state.staffSessions,
        [targetProfileId]: updatedSession,
      },
    };
    this.persistFullStateToStorage();
    this.notify();
    return nextStatus;
  };

  public clockOut = (staff?: string, profileId?: string): string => {
    const targetProfileId = profileId || this.state.currentProfileId;
    const currentSession = this.state.staffSessions[targetProfileId] || {
      isShiftActive: this.state.isShiftActive,
      shiftStatus: this.state.shiftStatus,
      shiftSeconds: this.state.shiftSeconds,
      staffName: this.state.currentStaff,
      profileId: targetProfileId,
    };

    if (!currentSession.isShiftActive) {
      const err = this.handleShiftError(
        new ShiftRpcError(
          SHIFT_RPC_ERROR_CODES.SHIFT_NOT_ACTIVE,
          'Shift has already been clocked out or is not active.',
          400
        )
      );
      throw new ShiftRpcError(err.code, err.message, 400);
    }

    const staffName = staff ?? currentSession.staffName;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const durationStr = formatDurationToHoursMinutes(currentSession.shiftSeconds);
    const targetId = this.state.activeShiftId || currentSession.shiftId;

    let matched = false;
    const updatedLogs = this.state.punchLogs.map((log, index) => {
      const isTarget = targetId
        ? log.id === targetId
        : index === 0 ||
          log.timeOut === '-- Active Shift --' ||
          log.status === 'On Shift' ||
          log.status === 'Break';

      if (
        !matched &&
        isTarget &&
        (log.status === 'On Shift' ||
          log.status === 'Break' ||
          log.status === 'on_shift' ||
          log.status === 'break' ||
          log.timeOut === '-- Active Shift --')
      ) {
        matched = true;
        return {
          ...log,
          staff: staffName,
          timeOut: timeStr,
          duration: durationStr,
          status: 'Completed' as const,
        };
      }
      return log;
    });

    // Fallback if targetId wasn't found in initial map
    if (!matched && updatedLogs.length > 0) {
      for (let i = 0; i < updatedLogs.length; i++) {
        const log = updatedLogs[i];
        if (
          log.status === 'On Shift' ||
          log.status === 'Break' ||
          log.timeOut === '-- Active Shift --'
        ) {
          updatedLogs[i] = {
            ...log,
            staff: staffName,
            timeOut: timeStr,
            duration: durationStr,
            status: 'Completed' as const,
          };
          matched = true;
          break;
        }
      }
    }

    const updatedSession: StaffMemberShiftState = {
      ...currentSession,
      isShiftActive: false,
      activeShiftId: null,
      shiftStatus: 'completed',
    };

    this.clearActiveShiftFromStorage();

    const isCurrent = targetProfileId === this.state.currentProfileId;

    this.state = {
      ...this.state,
      isShiftActive: isCurrent ? false : this.state.isShiftActive,
      activeShiftId: isCurrent ? null : this.state.activeShiftId,
      shiftStatus: isCurrent ? 'completed' : this.state.shiftStatus,
      lastError: null,
      punchLogs: updatedLogs,
      activeStaffCount: this.calculateActiveStaffCount(updatedLogs),
      staffSessions: {
        ...this.state.staffSessions,
        [targetProfileId]: updatedSession,
      },
    };
    this.persistFullStateToStorage();
    this.notify();
    return durationStr;
  };

  public resetTimer = (): void => {
    this.state = {
      ...this.state,
      shiftSeconds: 0,
      lastError: null,
    };
    this.notify();
  };

  private mergeRecentLogs(current: PunchLog[], recent?: PunchLog[]): PunchLog[] {
    if (!recent || recent.length === 0) return current;
    const seenIds = new Set(current.map((l) => l.id).filter(Boolean));
    const newLogsToPrepend: PunchLog[] = [];
    for (const log of recent) {
      if (!log.id || !seenIds.has(log.id)) {
        newLogsToPrepend.push(log);
        if (log.id) {
          seenIds.add(log.id);
        }
      }
    }
    return [...newLogsToPrepend, ...current];
  }

  public rehydrateShift = (
    activeShift: DbStaffShift | null,
    recentLogs?: PunchLog[],
    nowTimestamp?: number,
    profileId?: string
  ): void => {
    const now = nowTimestamp ?? Date.now();
    let isShiftActive = this.state.isShiftActive;
    let activeShiftId = this.state.activeShiftId;
    let shiftStatus: ShiftStateStatus = this.state.shiftStatus;
    let shiftSeconds = this.state.shiftSeconds;
    let currentStaff = this.state.currentStaff;
    const targetProfileId = activeShift?.profile_id || profileId || this.state.currentProfileId;

    if (activeShift) {
      currentStaff = activeShift.staff_name;
      activeShiftId = activeShift.id;
      const clockInMs = new Date(activeShift.clock_in).getTime();
      const elapsed = Math.max(0, Math.floor((now - clockInMs) / 1000));

      if (activeShift.status === 'break') {
        isShiftActive = true;
        shiftStatus = 'break';
        shiftSeconds = activeShift.duration_seconds ?? elapsed;
      } else if (activeShift.status === 'on_shift') {
        isShiftActive = true;
        shiftStatus = 'on_shift';
        shiftSeconds = elapsed;
      } else {
        isShiftActive = false;
        activeShiftId = null;
        shiftStatus = 'completed';
        shiftSeconds = activeShift.duration_seconds ?? 0;
      }

      this.persistActiveShiftToStorage({
        shiftId: activeShift.id,
        staffName: activeShift.staff_name,
        profileId: targetProfileId,
        clockIn: activeShift.clock_in,
        status: activeShift.status,
        durationSeconds: activeShift.duration_seconds ?? elapsed,
      });
    } else {
      // Non-destructive guard:
      // If we already have a locally active shift, do NOT wipe to idle!
      if (!this.state.isShiftActive) {
        isShiftActive = false;
        activeShiftId = null;
        shiftStatus = 'idle';
        shiftSeconds = 0;
      }
    }

    const mergedLogs = this.mergeRecentLogs(this.state.punchLogs, recentLogs);

    const updatedSessions = { ...this.state.staffSessions };
    const currentSession = updatedSessions[targetProfileId] || {
      staffName: currentStaff,
      profileId: targetProfileId,
    };

    updatedSessions[targetProfileId] = {
      ...currentSession,
      isShiftActive,
      activeShiftId: isShiftActive ? activeShiftId : null,
      shiftStatus,
      shiftSeconds,
      staffName: currentStaff,
      profileId: targetProfileId,
      clockInTime: activeShift?.clock_in || currentSession.clockInTime,
    };

    this.state = {
      ...this.state,
      isShiftActive,
      activeShiftId: isShiftActive ? activeShiftId : null,
      shiftStatus,
      shiftSeconds,
      currentStaff,
      currentProfileId: targetProfileId,
      punchLogs: mergedLogs,
      activeStaffCount: this.calculateActiveStaffCount(mergedLogs),
      staffSessions: updatedSessions,
      lastError: null,
    };
    this.persistFullStateToStorage();
    this.notify();
  };

  public handleRealtimeShiftInsert = (row: DbStaffShift): void => {
    const mapped = mapStaffShiftRow(row);
    const exists = this.state.punchLogs.some((l) => l.id === row.id);
    const newLogs = exists ? this.state.punchLogs : [mapped, ...this.state.punchLogs];

    let nextIsActive = this.state.isShiftActive;
    let nextActiveShiftId = this.state.activeShiftId;
    let nextStatus = this.state.shiftStatus;
    let nextStaff = this.state.currentStaff;
    let nextSeconds = this.state.shiftSeconds;

    if (
      row.staff_name === this.state.currentStaff &&
      (row.status === 'on_shift' || row.status === 'break')
    ) {
      nextIsActive = true;
      nextActiveShiftId = row.id;
      nextStatus = row.status as ShiftStateStatus;
      nextStaff = row.staff_name;
      const clockInMs = new Date(row.clock_in).getTime();
      nextSeconds = Math.max(0, Math.floor((Date.now() - clockInMs) / 1000));
    }

    this.state = {
      ...this.state,
      isShiftActive: nextIsActive,
      activeShiftId: nextActiveShiftId,
      shiftStatus: nextStatus,
      currentStaff: nextStaff,
      shiftSeconds: nextSeconds,
      punchLogs: newLogs,
      activeStaffCount: this.calculateActiveStaffCount(newLogs),
    };
    this.persistFullStateToStorage();
    this.notify();
  };

  public handleRealtimeShiftUpdate = (row: DbStaffShift): void => {
    const mapped = mapStaffShiftRow(row);
    let updated = false;
    const newLogs = this.state.punchLogs.map((log) => {
      if (log.id === row.id) {
        updated = true;
        return mapped;
      }
      return log;
    });

    if (!updated) {
      newLogs.unshift(mapped);
    }

    let nextIsActive = this.state.isShiftActive;
    let nextActiveShiftId = this.state.activeShiftId;
    let nextStatus = this.state.shiftStatus;
    let nextSeconds = this.state.shiftSeconds;

    if (row.staff_name === this.state.currentStaff) {
      if (row.status === 'completed') {
        nextIsActive = false;
        nextActiveShiftId = null;
        nextStatus = 'completed';
        if (row.duration_seconds !== null && row.duration_seconds !== undefined) {
          nextSeconds = row.duration_seconds;
        }
      } else if (row.status === 'break') {
        nextStatus = 'break';
        nextActiveShiftId = row.id;
      } else if (row.status === 'on_shift') {
        nextIsActive = true;
        nextActiveShiftId = row.id;
        nextStatus = 'on_shift';
      }
    }

    this.state = {
      ...this.state,
      isShiftActive: nextIsActive,
      activeShiftId: nextActiveShiftId,
      shiftStatus: nextStatus,
      shiftSeconds: nextSeconds,
      punchLogs: newLogs,
      activeStaffCount: this.calculateActiveStaffCount(newLogs),
    };
    this.persistFullStateToStorage();
    this.notify();
  };
}

export const punchStore = new PunchStore();

export function usePunchStore(): PunchStoreState & {
  formattedTimer: string;
  tickSecond: typeof punchStore.tickSecond;
  clockIn: typeof punchStore.clockIn;
  clockOut: typeof punchStore.clockOut;
  toggleBreak: typeof punchStore.toggleBreak;
  resetTimer: typeof punchStore.resetTimer;
  clearError: typeof punchStore.clearError;
  rehydrateShift: typeof punchStore.rehydrateShift;
  rehydrateFromStorage: typeof punchStore.rehydrateFromStorage;
  setActiveShiftId: typeof punchStore.setActiveShiftId;
  handleRealtimeShiftInsert: typeof punchStore.handleRealtimeShiftInsert;
  handleRealtimeShiftUpdate: typeof punchStore.handleRealtimeShiftUpdate;
  getActiveStaffCount: typeof punchStore.getActiveStaffCount;
  switchStaff: typeof punchStore.switchStaff;
  getStaffSession: typeof punchStore.getStaffSession;
  getOfflineQueue: typeof punchStore.getOfflineQueue;
  enqueueOfflinePunch: typeof punchStore.enqueueOfflinePunch;
  dequeueOfflinePunch: typeof punchStore.dequeueOfflinePunch;
  clearOfflineQueue: typeof punchStore.clearOfflineQueue;
  syncOfflineQueue: typeof punchStore.syncOfflineQueue;
  updateStaffPermissions: typeof punchStore.updateStaffPermissions;
} {
  const state = useSyncExternalStore(
    punchStore.subscribe,
    punchStore.getState,
    punchStore.getState
  );

  return {
    ...state,
    formattedTimer: formatShiftDurationTimer(state.shiftSeconds),
    tickSecond: punchStore.tickSecond,
    clockIn: punchStore.clockIn,
    clockOut: punchStore.clockOut,
    toggleBreak: punchStore.toggleBreak,
    resetTimer: punchStore.resetTimer,
    clearError: punchStore.clearError,
    rehydrateShift: punchStore.rehydrateShift,
    rehydrateFromStorage: punchStore.rehydrateFromStorage,
    setActiveShiftId: punchStore.setActiveShiftId,
    handleRealtimeShiftInsert: punchStore.handleRealtimeShiftInsert,
    handleRealtimeShiftUpdate: punchStore.handleRealtimeShiftUpdate,
    getActiveStaffCount: punchStore.getActiveStaffCount,
    switchStaff: punchStore.switchStaff,
    updateStaffPermissions: punchStore.updateStaffPermissions,
    getStaffSession: punchStore.getStaffSession,
    getOfflineQueue: punchStore.getOfflineQueue,
    enqueueOfflinePunch: punchStore.enqueueOfflinePunch,
    dequeueOfflinePunch: punchStore.dequeueOfflinePunch,
    clearOfflineQueue: punchStore.clearOfflineQueue,
    syncOfflineQueue: punchStore.syncOfflineQueue,
  };
}
