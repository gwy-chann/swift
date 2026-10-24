import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStoredTerminalDevice,
  getStoredTerminalDeviceToken,
  setStoredTerminalDeviceToken,
  clearStoredTerminalDeviceToken,
  isTerminalEnrolled,
  autoEnrollPrimaryTerminalIfFirstRun,
  validateClientTerminalDevice,
  DEFAULT_PRIMARY_TERMINAL_ID,
  DEFAULT_PRIMARY_DEVICE_NAME,
  DEFAULT_PRIMARY_DEVICE_TOKEN,
} from '../device-binding.ts';

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

describe('Terminal Device Binding Client Engine (SIAA-82)', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as unknown as { localStorage: Storage; window: unknown }).localStorage = mockStorage;
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockStorage,
      dispatchEvent: () => true,
    };
    (globalThis as unknown as { document: { cookie: string } }).document = {
      cookie: '',
    };
  });

  afterEach(() => {
    mockStorage.clear();
    delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { document?: unknown }).document;
  });

  it('Scenario 1: Primary laptop device auto-enrolls as Terminal #01 on first run', () => {
    assert.equal(isTerminalEnrolled(), false);
    assert.equal(getStoredTerminalDevice(), null);

    const device = autoEnrollPrimaryTerminalIfFirstRun();

    assert.equal(device.terminalId, DEFAULT_PRIMARY_TERMINAL_ID);
    assert.equal(device.deviceName, DEFAULT_PRIMARY_DEVICE_NAME);
    assert.equal(device.deviceToken, DEFAULT_PRIMARY_DEVICE_TOKEN);
    assert.equal(device.isAuthorized, true);
    assert.ok(device.enrolledAt);

    // Verify persisted in storage
    assert.equal(isTerminalEnrolled(), true);
    const stored = getStoredTerminalDevice();
    assert.ok(stored);
    assert.equal(stored.terminalId, DEFAULT_PRIMARY_TERMINAL_ID);
    assert.equal(stored.deviceToken, DEFAULT_PRIMARY_DEVICE_TOKEN);
    assert.equal(getStoredTerminalDeviceToken(), DEFAULT_PRIMARY_DEVICE_TOKEN);
  });

  it('Scenario 2: Authorized counter laptop validates successfully', () => {
    autoEnrollPrimaryTerminalIfFirstRun();
    const result = validateClientTerminalDevice();

    assert.equal(result.valid, true);
    assert.equal(result.terminalId, DEFAULT_PRIMARY_TERMINAL_ID);
    assert.equal(result.deviceName, DEFAULT_PRIMARY_DEVICE_NAME);
    assert.equal(result.errorCode, undefined);
  });

  it('Scenario 3: Unauthorized personal smartphone without token is rejected', () => {
    clearStoredTerminalDeviceToken();
    assert.equal(isTerminalEnrolled(), false);

    const result = validateClientTerminalDevice();
    assert.equal(result.valid, false);
    assert.equal(result.errorCode, 'UNAUTHORIZED_TERMINAL_DEVICE');
    assert.ok(result.error?.includes('restricted to physical store counter terminals'));
  });

  it('Scenario 4: Admin can enroll custom tablet (e.g. Service Bay Station)', () => {
    const customDevice = setStoredTerminalDeviceToken(
      'term_token_service_bay_tablet_99',
      'Terminal #02',
      'Service Bay Station'
    );

    assert.equal(customDevice.terminalId, 'Terminal #02');
    assert.equal(customDevice.deviceName, 'Service Bay Station');
    assert.equal(customDevice.deviceToken, 'term_token_service_bay_tablet_99');

    const stored = getStoredTerminalDevice();
    assert.ok(stored);
    assert.equal(stored.terminalId, 'Terminal #02');
    assert.equal(stored.deviceName, 'Service Bay Station');

    const validation = validateClientTerminalDevice();
    assert.equal(validation.valid, true);
    assert.equal(validation.terminalId, 'Terminal #02');
  });

  it('Scenario 5: clearStoredTerminalDeviceToken revokes binding cleanly', () => {
    autoEnrollPrimaryTerminalIfFirstRun();
    assert.equal(isTerminalEnrolled(), true);

    clearStoredTerminalDeviceToken();
    assert.equal(isTerminalEnrolled(), false);
    assert.equal(getStoredTerminalDevice(), null);
    assert.equal(getStoredTerminalDeviceToken(), null);
  });
});
