'use client';

import { useSyncExternalStore } from 'react';
import type { PunchLog } from '../types/logs.ts';
import { mapStaffShiftRow, type DbStaffShift } from '../types/logs.ts';
import { MOCK_PUNCH_LOGS } from '../mock-data/index.ts';
import { ShiftRpcError, SHIFT_RPC_ERROR_CODES, formatDurationToHoursMinutes } from '../contracts/punch-clock-rpcs.ts';

export interface PunchStoreError {
  code: string;
  message: string;
  timestamp: number;
}

export type ShiftStateStatus = 'on_shift' | 'break' | 'completed' | 'idle';

export interface PunchStoreState {
  isShiftActive: boolean;
  activeShiftId: string | null;
  shiftSeconds: number;
  punchLogs: PunchLog[];
  currentStaff: string;
  shiftStatus: ShiftStateStatus;
  lastError: PunchStoreError | null;
  activeStaffCount: number;
}

function formatShiftDurationTimer(seconds: number): string {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export class PunchStore {
  private state: PunchStoreState;
  private readonly listeners = new Set<() => void>();
  private readonly errorListeners = new Set<(error: PunchStoreError) => void>();

  constructor() {
    const initialLogs = [...MOCK_PUNCH_LOGS];
    this.state = {
      isShiftActive: false,
      activeShiftId: null,
      shiftSeconds: 0,
      punchLogs: initialLogs,
      currentStaff: 'Mike Morales',
      shiftStatus: 'idle',
      lastError: null,
      activeStaffCount: this.calculateActiveStaffCount(initialLogs),
    };
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
      if (error.message.includes('ACTIVE_SHIFT_EXISTS') || (error as { code?: string }).code === 'P0409') {
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
    if (!this.state.isShiftActive || this.state.shiftStatus === 'break') return;
    this.state = {
      ...this.state,
      shiftSeconds: this.state.shiftSeconds + 1,
    };
    this.notify();
  };

  public clockIn = (staff?: string, terminalId: string = 'Terminal #01'): void => {
    // Concurrency / duplicate shift guard
    if (this.state.isShiftActive && (this.state.shiftStatus === 'on_shift' || this.state.shiftStatus === 'break')) {
      const err = this.handleShiftError(
        new ShiftRpcError(
          SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS,
          'Active shift already in progress. Please clock out before starting a new shift.',
          409
        )
      );
      throw new ShiftRpcError(err.code, err.message, 409);
    }

    const staffName = staff ?? this.state.currentStaff;
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
      staff: staffName,
      timeIn: timeStr,
      timeOut: '-- Active Shift --',
      duration: '00h 00m',
      status: 'On Shift',
      terminal: terminalId,
    };

    const updatedLogs = [newLog, ...this.state.punchLogs];

    this.state = {
      ...this.state,
      isShiftActive: true,
      activeShiftId: shiftId,
      shiftStatus: 'on_shift',
      shiftSeconds: 0,
      currentStaff: staffName,
      lastError: null,
      punchLogs: updatedLogs,
      activeStaffCount: this.calculateActiveStaffCount(updatedLogs),
    };
    this.notify();
  };

  public toggleBreak = (): 'break' | 'on_shift' => {
    if (!this.state.isShiftActive) {
      const err = this.handleShiftError(
        new ShiftRpcError(
          SHIFT_RPC_ERROR_CODES.SHIFT_NOT_ACTIVE,
          'Cannot toggle break when no shift is currently active.',
          400
        )
      );
      throw new ShiftRpcError(err.code, err.message, 400);
    }

    const nextStatus: ShiftStateStatus = this.state.shiftStatus === 'on_shift' ? 'break' : 'on_shift';
    const targetId = this.state.activeShiftId;

    let updated = false;
    const updatedLogs = this.state.punchLogs.map((log, index) => {
      const isTarget = targetId ? log.id === targetId : (index === 0 && (log.status === 'On Shift' || log.status === 'Break' || log.status === 'on_shift' || log.status === 'break'));
      if (isTarget && (log.status === 'On Shift' || log.status === 'Break' || log.status === 'on_shift' || log.status === 'break')) {
        updated = true;
        return {
          ...log,
          status: nextStatus === 'break' ? 'Break' : 'On Shift',
        };
      }
      return log;
    });

    if (!updated && updatedLogs.length > 0) {
      for (let i = 0; i < updatedLogs.length; i++) {
        const log = updatedLogs[i];
        if (log.status === 'On Shift' || log.status === 'Break' || log.status === 'on_shift' || log.status === 'break') {
          updatedLogs[i] = {
            ...log,
            status: nextStatus === 'break' ? 'Break' : 'On Shift',
          };
          break;
        }
      }
    }

    this.state = {
      ...this.state,
      shiftStatus: nextStatus,
      punchLogs: updatedLogs,
      activeStaffCount: this.calculateActiveStaffCount(updatedLogs),
      lastError: null,
    };
    this.notify();
    return nextStatus;
  };

  public clockOut = (staff?: string): string => {
    if (!this.state.isShiftActive) {
      const err = this.handleShiftError(
        new ShiftRpcError(
          SHIFT_RPC_ERROR_CODES.SHIFT_NOT_ACTIVE,
          'Shift has already been clocked out or is not active.',
          400
        )
      );
      throw new ShiftRpcError(err.code, err.message, 400);
    }

    const staffName = staff ?? this.state.currentStaff;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const durationStr = formatDurationToHoursMinutes(this.state.shiftSeconds);
    const targetId = this.state.activeShiftId;

    let matched = false;
    const updatedLogs = this.state.punchLogs.map((log, index) => {
      const isTarget = targetId
        ? log.id === targetId
        : (index === 0 || log.timeOut === '-- Active Shift --' || log.status === 'On Shift' || log.status === 'Break');

      if (!matched && isTarget && (log.status === 'On Shift' || log.status === 'Break' || log.status === 'on_shift' || log.status === 'break' || log.timeOut === '-- Active Shift --')) {
        matched = true;
        return {
          ...log,
          staff: staffName,
          timeOut: timeStr,
          duration: durationStr,
          status: 'Completed',
        };
      }
      return log;
    });

    // Fallback if targetId wasn't found in initial map
    if (!matched && updatedLogs.length > 0) {
      for (let i = 0; i < updatedLogs.length; i++) {
        const log = updatedLogs[i];
        if (log.status === 'On Shift' || log.status === 'Break' || log.timeOut === '-- Active Shift --') {
          updatedLogs[i] = {
            ...log,
            staff: staffName,
            timeOut: timeStr,
            duration: durationStr,
            status: 'Completed',
          };
          matched = true;
          break;
        }
      }
    }

    this.state = {
      ...this.state,
      isShiftActive: false,
      activeShiftId: null,
      shiftStatus: 'completed',
      lastError: null,
      punchLogs: updatedLogs,
      activeStaffCount: this.calculateActiveStaffCount(updatedLogs),
    };
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
    const existingIds = new Set(current.map((l) => l.id).filter(Boolean));
    const newLogsToPrepend = recent.filter((log) => !log.id || !existingIds.has(log.id));
    return [...newLogsToPrepend, ...current];
  }

  public rehydrateShift = (
    activeShift: DbStaffShift | null,
    recentLogs?: PunchLog[],
    nowTimestamp?: number
  ): void => {
    const now = nowTimestamp ?? Date.now();
    let isShiftActive = this.state.isShiftActive;
    let activeShiftId = this.state.activeShiftId;
    let shiftStatus: ShiftStateStatus = this.state.shiftStatus;
    let shiftSeconds = this.state.shiftSeconds;
    let currentStaff = this.state.currentStaff;

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
    } else if (!this.state.isShiftActive) {
      // Remote returned activeShift === null and local shift is inactive
      isShiftActive = false;
      activeShiftId = null;
      shiftStatus = 'idle';
      shiftSeconds = 0;
    }

    const mergedLogs = this.mergeRecentLogs(this.state.punchLogs, recentLogs);

    this.state = {
      ...this.state,
      isShiftActive,
      activeShiftId,
      shiftStatus,
      shiftSeconds,
      currentStaff,
      punchLogs: mergedLogs,
      activeStaffCount: this.calculateActiveStaffCount(mergedLogs),
      lastError: null,
    };
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

    if (row.staff_name === this.state.currentStaff && (row.status === 'on_shift' || row.status === 'break')) {
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
  handleRealtimeShiftInsert: typeof punchStore.handleRealtimeShiftInsert;
  handleRealtimeShiftUpdate: typeof punchStore.handleRealtimeShiftUpdate;
  getActiveStaffCount: typeof punchStore.getActiveStaffCount;
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
    handleRealtimeShiftInsert: punchStore.handleRealtimeShiftInsert,
    handleRealtimeShiftUpdate: punchStore.handleRealtimeShiftUpdate,
    getActiveStaffCount: punchStore.getActiveStaffCount,
  };
}
