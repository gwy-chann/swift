import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clockInShiftAction,
  clockOutShiftAction,
  toggleShiftBreakAction,
  getStaffAttendanceHistoryAction,
  lookupProductPriceAction,
  verifyAdminElevationAction,
} from '../actions.ts';

describe('Staff Terminal Server Actions & Elevation Engine (SIAA-64)', () => {
  describe('Shift Clocking Actions', () => {
    it('clockInShiftAction starts a shift with terminal ID and default staff', async () => {
      const res = await clockInShiftAction('Terminal #01', 'Opening shift');
      assert.equal(res.success, true);
      assert.ok(res.shiftId);
      assert.equal(res.status, 'on_shift');
      assert.ok(res.clockIn);
      assert.equal(res.terminalId, 'Terminal #01');
    });

    it('clockInShiftAction defaults terminalId when omitted', async () => {
      const res = await clockInShiftAction();
      assert.equal(res.success, true);
      assert.equal(res.terminalId, 'Terminal #01');
    });

    it('clockOutShiftAction fails when shiftId is missing', async () => {
      const res = await clockOutShiftAction('');
      assert.equal(res.success, false);
      assert.equal(res.code, 'INVALID_SHIFT_ID');
      assert.ok(res.error?.includes('Shift ID is required'));
    });

    it('clockOutShiftAction successfully finalizes an active shift', async () => {
      const res = await clockOutShiftAction('shift-101', 'End of day');
      assert.equal(res.success, true);
      assert.equal(res.shiftId, 'shift-101');
      assert.equal(res.status, 'completed');
      assert.ok(res.clockOut);
      assert.ok(res.durationFormatted);
    });

    it('toggleShiftBreakAction fails when shiftId is missing', async () => {
      const res = await toggleShiftBreakAction('');
      assert.equal(res.success, false);
      assert.equal(res.code, 'INVALID_SHIFT_ID');
    });

    it('toggleShiftBreakAction successfully toggles shift status', async () => {
      const res = await toggleShiftBreakAction('shift-101');
      assert.equal(res.success, true);
      assert.equal(res.shiftId, 'shift-101');
      assert.ok(res.status === 'break' || res.status === 'on_shift');
    });

    it('getStaffAttendanceHistoryAction returns punch logs and active shift', async () => {
      const res = await getStaffAttendanceHistoryAction(10);
      assert.equal(res.success, true);
      assert.ok(Array.isArray(res.logs));
      assert.ok(res.logs.length > 0);
    });

    it('getStaffAttendanceHistoryAction isolates logs to specific employee profile when profileId is supplied', async () => {
      // Profile for Mike Morales (00000000-0000-0000-0000-000000000002)
      const mikeRes = await getStaffAttendanceHistoryAction(10, '00000000-0000-0000-0000-000000000002');
      assert.equal(mikeRes.success, true);
      for (const log of mikeRes.logs) {
        assert.equal(log.staff.toLowerCase(), 'mike morales');
      }

      // Profile for Dante Reyes (00000000-0000-0000-0000-000000000003)
      const danteRes = await getStaffAttendanceHistoryAction(10, '00000000-0000-0000-0000-000000000003');
      assert.equal(danteRes.success, true);
      for (const log of danteRes.logs) {
        assert.equal(log.staff.toLowerCase(), 'dante reyes');
      }
    });
  });

  describe('Instant SKU / Barcode Price Checker (<200ms)', () => {
    it('lookupProductPriceAction rejects empty or whitespace queries', async () => {
      const res = await lookupProductPriceAction('   ');
      assert.equal(res.success, false);
      assert.equal(res.code, 'INVALID_QUERY');
    });

    it('lookupProductPriceAction returns retail, wholesale, and 20% SC/PWD price for matching SKU', async () => {
      const res = await lookupProductPriceAction('YAM-NMAX-BL01');
      assert.equal(res.success, true);
      assert.ok(res.product);
      assert.equal(res.product.sku, 'YAM-NMAX-BL01');
      assert.ok(res.product.retailPrice > 0);
      assert.ok(res.product.wholesalePrice > 0);
      assert.ok(res.product.location);

      // Verify SC/PWD 20% discount calculation (SRP * 0.8)
      const expectedScPwd = Number((res.product.retailPrice * 0.8).toFixed(2));
      assert.equal(res.product.scPwdPrice, expectedScPwd);
    });

    it('lookupProductPriceAction supports search by product name', async () => {
      const res = await lookupProductPriceAction('Brake Pads');
      assert.equal(res.success, true);
      assert.ok(res.product);
      assert.ok(res.product.name.toLowerCase().includes('brake pads'));
    });

    it('lookupProductPriceAction returns PRODUCT_NOT_FOUND for non-existent item', async () => {
      const res = await lookupProductPriceAction('NON_EXISTENT_SKU_9999');
      assert.equal(res.success, false);
      assert.equal(res.code, 'PRODUCT_NOT_FOUND');
    });
  });

  describe('Secure Master Admin Elevation Action', () => {
    it('verifyAdminElevationAction rejects invalid PIN with INVALID_PIN code', async () => {
      const res = await verifyAdminElevationAction('0000');
      assert.equal(res.success, false);
      assert.equal(res.code, 'INVALID_PIN');
      assert.ok(res.error?.includes('Access denied'));
    });

    it('verifyAdminElevationAction authorizes master pin 8888', async () => {
      const res = await verifyAdminElevationAction('8888');
      assert.equal(res.success, true);
      assert.ok(res.elevatedUntil);
      assert.ok(res.elevatedUntil > Date.now());
    });

    it('verifyAdminElevationAction authorizes dev pin 1234 in non-production mode', async () => {
      const res = await verifyAdminElevationAction('1234');
      assert.equal(res.success, true);
      assert.ok(res.elevatedUntil);
    });
  });
});
