'use client';

import { useSyncExternalStore } from 'react';
import { PunchLog } from '@/lib/types/logs';
import { MOCK_PUNCH_LOGS } from '@/lib/mock-data';

export interface PunchStoreState {
  isShiftActive: boolean;
  shiftSeconds: number;
  punchLogs: PunchLog[];
  currentStaff: string;
}

function formatShiftDuration(seconds: number): string {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

class PunchStore {
  private state: PunchStoreState;
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.state = {
      isShiftActive: true,
      shiftSeconds: 15150, // 04h 12m 30s as in mockup/app.js line 724
      punchLogs: [...MOCK_PUNCH_LOGS],
      currentStaff: 'Mike Morales'
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

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public tickSecond = (): void => {
    if (!this.state.isShiftActive) return;
    this.state = {
      ...this.state,
      shiftSeconds: this.state.shiftSeconds + 1
    };
    this.notify();
  };

  public clockIn = (staff?: string): void => {
    const staffName = staff ?? this.state.currentStaff;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const newLog: PunchLog = {
      id: `PUNCH-${Date.now()}`,
      date: dateStr,
      staff: staffName,
      timeIn: timeStr,
      timeOut: '-- Active Shift --',
      duration: '00h 00m',
      status: 'On Shift'
    };

    this.state = {
      ...this.state,
      isShiftActive: true,
      shiftSeconds: 0,
      currentStaff: staffName,
      punchLogs: [newLog, ...this.state.punchLogs]
    };
    this.notify();
  };

  public clockOut = (staff?: string): void => {
    const staffName = staff ?? this.state.currentStaff;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const hours = Math.floor(this.state.shiftSeconds / 3600);
    const mins = Math.floor((this.state.shiftSeconds % 3600) / 60);
    const durationStr = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;

    const updatedLogs = this.state.punchLogs.map((log, index) => {
      if (index === 0 && log.status === 'On Shift') {
        return {
          ...log,
          staff: staffName,
          timeOut: timeStr,
          duration: durationStr,
          status: 'Completed'
        };
      }
      return log;
    });

    this.state = {
      ...this.state,
      isShiftActive: false,
      punchLogs: updatedLogs
    };
    this.notify();
  };

  public resetTimer = (): void => {
    this.state = {
      ...this.state,
      shiftSeconds: 0
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
  resetTimer: typeof punchStore.resetTimer;
} {
  const state = useSyncExternalStore(
    punchStore.subscribe,
    punchStore.getState,
    punchStore.getState
  );

  return {
    ...state,
    formattedTimer: formatShiftDuration(state.shiftSeconds),
    tickSecond: punchStore.tickSecond,
    clockIn: punchStore.clockIn,
    clockOut: punchStore.clockOut,
    resetTimer: punchStore.resetTimer
  };
}
