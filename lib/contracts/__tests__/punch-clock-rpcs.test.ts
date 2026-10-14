import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ClockInShiftInputSchema,
  ClockOutShiftInputSchema,
  ToggleShiftBreakInputSchema,
  formatDurationToHoursMinutes,
  ShiftRpcError,
  SHIFT_RPC_ERROR_CODES,
} from '../punch-clock-rpcs.ts';

describe('Punch Clock RPC Contracts & Schemas (SIAA-61)', () => {
  describe('ClockInShiftInputSchema', () => {
    it('applies default terminal ID and accepts optional notes', () => {
      const parsed = ClockInShiftInputSchema.parse({});
      assert.equal(parsed.terminalId, 'Terminal #01');
      assert.equal(parsed.notes, undefined);

      const custom = ClockInShiftInputSchema.parse({
        terminalId: 'Terminal #02 - Floor',
        notes: 'Morning shift opening',
      });
      assert.equal(custom.terminalId, 'Terminal #02 - Floor');
      assert.equal(custom.notes, 'Morning shift opening');
    });

    it('rejects empty terminal ID', () => {
      assert.throws(() => {
        ClockInShiftInputSchema.parse({ terminalId: '' });
      });
    });
  });

  describe('ClockOutShiftInputSchema', () => {
    it('accepts valid UUID and notes', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const parsed = ClockOutShiftInputSchema.parse({
        shiftId: validUuid,
        notes: 'Shift completed normally',
      });
      assert.equal(parsed.shiftId, validUuid);
      assert.equal(parsed.notes, 'Shift completed normally');
    });

    it('rejects invalid non-UUID shift IDs', () => {
      assert.throws(() => {
        ClockOutShiftInputSchema.parse({ shiftId: 'not-a-valid-uuid' });
      });
    });
  });

  describe('ToggleShiftBreakInputSchema', () => {
    it('validates UUID for shift ID', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const parsed = ToggleShiftBreakInputSchema.parse({ shiftId: validUuid });
      assert.equal(parsed.shiftId, validUuid);
    });

    it('rejects missing or malformed shiftId', () => {
      assert.throws(() => {
        ToggleShiftBreakInputSchema.parse({});
      });
    });
  });

  describe('formatDurationToHoursMinutes', () => {
    it('formats exact seconds into HHh MMm', () => {
      assert.equal(formatDurationToHoursMinutes(32340), '08h 59m');
      assert.equal(formatDurationToHoursMinutes(3600), '01h 00m');
      assert.equal(formatDurationToHoursMinutes(15150), '04h 12m');
      assert.equal(formatDurationToHoursMinutes(125), '00h 02m');
    });

    it('renders 00h 00m for zero or negative values', () => {
      assert.equal(formatDurationToHoursMinutes(0), '00h 00m');
      assert.equal(formatDurationToHoursMinutes(-50), '00h 00m');
      assert.equal(formatDurationToHoursMinutes(null), '00h 00m');
      assert.equal(formatDurationToHoursMinutes(undefined), '00h 00m');
    });
  });

  describe('ShiftRpcError & Error Codes', () => {
    it('initializes with code, message, and HTTP status code', () => {
      const error = new ShiftRpcError(
        SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS,
        'Active shift already in progress.',
        409
      );
      assert.equal(error.name, 'ShiftRpcError');
      assert.equal(error.code, 'ACTIVE_SHIFT_EXISTS');
      assert.equal(error.status, 409);
      assert.equal(error.message, 'Active shift already in progress.');
    });
  });
});
