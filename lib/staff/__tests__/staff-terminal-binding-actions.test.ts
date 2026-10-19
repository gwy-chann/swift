import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clockInShiftAction } from '../actions.ts';
import {
  validateTerminalTokenAction,
  enrollTerminalDeviceAction,
  resetTerminalDeviceAction,
} from '../../terminal/actions.ts';
import { DEFAULT_PRIMARY_DEVICE_TOKEN } from '../../terminal/device-binding.ts';

describe('Terminal Device Binding Server Actions & Enforcement (SIAA-82)', () => {
  describe('Server-Side Token Validation', () => {
    it('accepts DEFAULT_PRIMARY_DEVICE_TOKEN as authorized Terminal #01', async () => {
      const res = await validateTerminalTokenAction(DEFAULT_PRIMARY_DEVICE_TOKEN);
      assert.equal(res.valid, true);
      assert.equal(res.terminalId, 'Terminal #01');
    });

    it('accepts dynamically enrolled tokens prefixed with term_token_', async () => {
      const res = await validateTerminalTokenAction('term_token_dynamic_tablet_123');
      assert.equal(res.valid, true);
    });

    it('rejects missing or empty token with UNAUTHORIZED_TERMINAL_DEVICE', async () => {
      const res = await validateTerminalTokenAction('');
      assert.equal(res.valid, false);
      assert.equal(res.errorCode, 'UNAUTHORIZED_TERMINAL_DEVICE');
      assert.ok(res.error?.includes('restricted to physical store counter terminals'));
    });

    it('rejects arbitrary unauthorized token string', async () => {
      const res = await validateTerminalTokenAction('hacker_spoofed_device_token');
      assert.equal(res.valid, false);
      assert.equal(res.errorCode, 'UNAUTHORIZED_TERMINAL_DEVICE');
    });
  });

  describe('clockInShiftAction Device Token Enforcement', () => {
    it('Scenario 2: Authorized counter laptop successfully clocks in with valid token', async () => {
      const res = await clockInShiftAction(
        'Terminal #01',
        'Morning shift',
        undefined,
        DEFAULT_PRIMARY_DEVICE_TOKEN
      );

      assert.equal(res.success, true);
      assert.ok(res.shiftId);
      assert.equal(res.terminalId, 'Terminal #01');
      assert.equal(res.status, 'on_shift');
    });

    it('Scenario 3: Unauthorized remote phone is blocked with UNAUTHORIZED_TERMINAL_DEVICE', async () => {
      const res = await clockInShiftAction(
        'Terminal #01',
        'Remote mobile punch',
        undefined,
        'unauthorized_mobile_phone'
      );

      assert.equal(res.success, false);
      assert.equal(res.code, 'UNAUTHORIZED_TERMINAL_DEVICE');
      assert.equal(res.error, 'UNAUTHORIZED_TERMINAL_DEVICE');
    });

    it('Scenario 3 (cont): Empty device token is blocked with UNAUTHORIZED_TERMINAL_DEVICE', async () => {
      const res = await clockInShiftAction(
        'Terminal #01',
        undefined,
        undefined,
        ''
      );

      assert.equal(res.success, false);
      assert.equal(res.code, 'UNAUTHORIZED_TERMINAL_DEVICE');
    });
  });

  describe('Scenario 4: Master Admin Enrollment & Reset Elevation', () => {
    it('rejects enrollment when Master Admin PIN is incorrect', async () => {
      const res = await enrollTerminalDeviceAction(
        '0000',
        'Terminal #02',
        'Service Bay Tablet'
      );

      assert.equal(res.success, false);
      assert.equal(res.code, 'INVALID_PIN');
      assert.ok(res.error?.includes('Invalid Master Admin PIN'));
    });

    it('enrolls device when Master Admin PIN is 8888', async () => {
      const res = await enrollTerminalDeviceAction(
        '8888',
        'Terminal #02',
        'Service Bay Tablet'
      );

      assert.equal(res.success, true);
      assert.ok(res.token?.startsWith('term_token_'));
      assert.equal(res.terminalId, 'Terminal #02');
      assert.equal(res.deviceName, 'Service Bay Tablet');

      // The new token validates successfully
      const val = await validateTerminalTokenAction(res.token);
      assert.equal(val.valid, true);
      assert.equal(val.terminalId, 'Terminal #02');
    });

    it('resets terminal binding with Master Admin PIN 8888', async () => {
      const res = await resetTerminalDeviceAction('8888');
      assert.equal(res.success, true);
    });

    it('rejects reset when PIN is invalid', async () => {
      const res = await resetTerminalDeviceAction('9999');
      assert.equal(res.success, false);
      assert.ok(res.error?.includes('Invalid Master Admin PIN'));
    });
  });
});
