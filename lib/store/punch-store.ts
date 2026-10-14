'use client';

import { useSyncExternalStore } from 'react';
import type { PunchLog } from '../types/logs.ts';
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
  shiftSeconds: number;
  punchLogs: PunchLog[];
  currentStaff: string;
  shiftStatus: ShiftStateStatus;
  lastError: PunchStoreError | null;
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
    this.state = {
      isShiftActive: true,
      shiftSeconds: 15150, // 04h 12m 30s as in mockup/app.js line 724
      punchLogs: [...MOCK_PUNCH_LOGS],
      currentStaff: 'Mike Morales',
      shiftStatus: 'on_shift',
      lastError: null,
    };
  }

  public getState = (): PunchStoreState => {
    return this.state;
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

    const newLog: PunchLog = {
      id: `PUNCH-${Date.now()}`,
      date: dateStr,
      staff: staffName,
      timeIn: timeStr,
      timeOut: '-- Active Shift --',
      duration: '00h 00m',
      status: 'On Shift',
      terminal: terminalId,
    };

    this.state = {
      ...this.state,
      isShiftActive: true,
      shiftStatus: 'on_shift',
      shiftSeconds: 0,
      currentStaff: staffName,
      lastError: null,
      punchLogs: [newLog, ...this.state.punchLogs],
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

    const updatedLogs = this.state.punchLogs.map((log, index) => {
      if (index === 0 && (log.status === 'On Shift' || log.status === 'Break')) {
        return {
          ...log,
          status: nextStatus === 'break' ? 'Break' : 'On Shift',
        };
      }
      return log;
    });

    this.state = {
      ...this.state,
      shiftStatus: nextStatus,
      punchLogs: updatedLogs,
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

    const updatedLogs = this.state.punchLogs.map((log, index) => {
      if (index === 0 && (log.status === 'On Shift' || log.status === 'Break')) {
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

    this.state = {
      ...this.state,
      isShiftActive: false,
      shiftStatus: 'completed',
      lastError: null,
      punchLogs: updatedLogs,
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
  };
}
