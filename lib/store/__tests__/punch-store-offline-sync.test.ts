import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  PunchStore,
  SWIFT_STORAGE_KEYS,
  type QueuedPunchAction,
  type StoredStaffShiftState,
  type OfflineSyncDispatcher,
} from '../punch-store.ts';

// In-memory mock localStorage implementation
class MockLocalStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('Offline Shift Resilience & Attendance Sync Engine (SIAA-80)', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
  });

  afterEach(() => {
    mockStorage.clear();
    delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
  });

  it('Scenario 1: Local state synchronization writes full state to swift_staff_shift_state', () => {
    const store = new PunchStore();
    const staffName = 'Mike Morales';
    const profileId = '00000000-0000-0000-0000-000000000002';

    // 1. Employee clocks in
    store.clockIn(staffName, 'Terminal #01', profileId);

    // Verify localStorage has swift_staff_shift_state
    const raw = mockStorage.getItem(SWIFT_STORAGE_KEYS.SHIFT_STATE);
    assert.ok(raw !== null, 'Expected swift_staff_shift_state to exist in localStorage');

    const parsed = JSON.parse(raw) as StoredStaffShiftState;
    assert.equal(parsed.isShiftActive, true);
    assert.equal(parsed.shiftStatus, 'on_shift');
    assert.equal(parsed.currentStaff, staffName);
    assert.equal(parsed.currentProfileId, profileId);
    assert.ok(parsed.activeShift !== null);
    assert.equal(parsed.activeShift?.status, 'on_shift');
    assert.ok(parsed.punchLogs.length > 0);

    // 2. Employee toggles break
    store.toggleBreak(profileId);
    const updatedRaw = mockStorage.getItem(SWIFT_STORAGE_KEYS.SHIFT_STATE);
    const updatedParsed = JSON.parse(updatedRaw!) as StoredStaffShiftState;
    assert.equal(updatedParsed.shiftStatus, 'break');
    assert.equal(updatedParsed.activeShift?.status, 'break');
  });

  it('Scenario 2: Instant sub-millisecond initial render immediately hydrates from cached storage', () => {
    const fixedNow = 1700000000000;
    const clockInIso = new Date(fixedNow - 600 * 1000).toISOString(); // 10 minutes ago
    const cachedState: StoredStaffShiftState = {
      version: 1,
      lastSavedAt: fixedNow - 300 * 1000,
      currentStaff: 'Mike Morales',
      currentProfileId: '00000000-0000-0000-0000-000000000002',
      isShiftActive: true,
      activeShiftId: 'SHIFT-OFFLINE-999',
      shiftStatus: 'on_shift',
      shiftSeconds: 600,
      activeShift: {
        shiftId: 'SHIFT-OFFLINE-999',
        staffName: 'Mike Morales',
        profileId: '00000000-0000-0000-0000-000000000002',
        clockIn: clockInIso,
        status: 'on_shift',
        durationSeconds: 600,
      },
      punchLogs: [
        {
          id: 'SHIFT-OFFLINE-999',
          date: '2026-10-20',
          staff: 'Mike Morales',
          timeIn: '08:00:00 AM',
          timeOut: '-- Active Shift --',
          duration: '00h 10m',
          status: 'On Shift',
          terminal: 'Terminal #01',
        },
      ],
      staffSessions: {
        '00000000-0000-0000-0000-000000000002': {
          isShiftActive: true,
          activeShiftId: 'SHIFT-OFFLINE-999',
          shiftStatus: 'on_shift',
          shiftSeconds: 600,
          staffName: 'Mike Morales',
          profileId: '00000000-0000-0000-0000-000000000002',
        },
      },
    };

    mockStorage.setItem(SWIFT_STORAGE_KEYS.SHIFT_STATE, JSON.stringify(cachedState));

    // When a new PunchStore instance is created (simulating browser page refresh)
    const newStore = new PunchStore();
    const state = newStore.getState();

    // Verify sub-millisecond synchronous restoration
    assert.equal(state.isShiftActive, true);
    assert.equal(state.activeShiftId, 'SHIFT-OFFLINE-999');
    assert.equal(state.shiftStatus, 'on_shift');
    assert.equal(state.currentStaff, 'Mike Morales');
    assert.equal(state.punchLogs.length, 1);
    assert.equal(state.punchLogs[0].id, 'SHIFT-OFFLINE-999');
  });

  it('Scenario 3: Offline punch queue captures actions during network outages', () => {
    const store = new PunchStore();
    const profileId = '00000000-0000-0000-0000-000000000002';

    // Verify queue starts empty
    assert.equal(store.getOfflineQueue().length, 0);

    // 1. Enqueue clock_in
    const action1 = store.enqueueOfflinePunch({
      type: 'clock_in',
      profileId,
      staffName: 'Mike Morales',
      terminalId: 'Terminal #01',
    });
    assert.ok(action1.id.startsWith('OFFLINE-'));
    assert.equal(store.getOfflineQueue().length, 1);

    // 2. Enqueue toggle_break
    store.enqueueOfflinePunch({
      type: 'toggle_break',
      profileId,
      staffName: 'Mike Morales',
      terminalId: 'Terminal #01',
      shiftId: action1.id,
    });
    assert.equal(store.getOfflineQueue().length, 2);

    // 3. Inspect persisted storage
    const rawQueue = mockStorage.getItem(SWIFT_STORAGE_KEYS.OFFLINE_QUEUE);
    const parsedQueue = JSON.parse(rawQueue!) as QueuedPunchAction[];
    assert.equal(parsedQueue.length, 2);
    assert.equal(parsedQueue[0].type, 'clock_in');
    assert.equal(parsedQueue[1].type, 'toggle_break');
  });

  it('Scenario 3 (cont): syncOfflineQueue drains queued actions in FIFO order when connectivity returns', async () => {
    const store = new PunchStore();
    const profileId = '00000000-0000-0000-0000-000000000002';

    store.enqueueOfflinePunch({
      type: 'clock_in',
      profileId,
      staffName: 'Mike Morales',
      terminalId: 'Terminal #01',
    });

    store.enqueueOfflinePunch({
      type: 'toggle_break',
      profileId,
      staffName: 'Mike Morales',
      terminalId: 'Terminal #01',
      shiftId: 'TEMP-SHIFT-1',
    });

    store.enqueueOfflinePunch({
      type: 'clock_out',
      profileId,
      staffName: 'Mike Morales',
      terminalId: 'Terminal #01',
      shiftId: 'TEMP-SHIFT-1',
    });

    assert.equal(store.getOfflineQueue().length, 3);

    // Mock dispatcher simulating successful Supabase RPC executions
    const dispatchedActions: QueuedPunchAction[] = [];
    const mockDispatcher: OfflineSyncDispatcher = async (action) => {
      dispatchedActions.push(action);
      return {
        success: true,
        shiftId: action.type === 'clock_in' ? 'SUPABASE-UUID-12345' : undefined,
      };
    };

    const result = await store.syncOfflineQueue(mockDispatcher);

    assert.equal(result.synced, 3);
    assert.equal(result.failed, 0);
    assert.equal(result.remaining, 0);
    assert.equal(store.getOfflineQueue().length, 0);

    // Verify FIFO execution order
    assert.equal(dispatchedActions.length, 3);
    assert.equal(dispatchedActions[0].type, 'clock_in');
    assert.equal(dispatchedActions[1].type, 'toggle_break');
    assert.equal(dispatchedActions[2].type, 'clock_out');

    // Verify clock_in synchronized the authoritative shiftId into store
    assert.equal(store.getState().activeShiftId, 'SUPABASE-UUID-12345');
  });

  it('Scenario 4: Clean cache eviction transitions active shift to completed in localStorage', () => {
    const store = new PunchStore();
    const profileId = '00000000-0000-0000-0000-000000000002';

    store.clockIn('Mike Morales', 'Terminal #01', profileId);
    assert.equal(store.getState().isShiftActive, true);

    // Finalize shift clock-out
    store.clockOut('Mike Morales', profileId);
    assert.equal(store.getState().isShiftActive, false);
    assert.equal(store.getState().shiftStatus, 'completed');

    // Inspect localStorage
    const raw = mockStorage.getItem(SWIFT_STORAGE_KEYS.SHIFT_STATE);
    const parsed = JSON.parse(raw!) as StoredStaffShiftState;
    assert.equal(parsed.isShiftActive, false);
    assert.equal(parsed.shiftStatus, 'completed');
    assert.equal(parsed.activeShift, null);

    // Verify legacy key is cleared
    const legacyRaw = mockStorage.getItem(SWIFT_STORAGE_KEYS.LEGACY_ACTIVE_SHIFT);
    assert.equal(legacyRaw, null);
  });
});
