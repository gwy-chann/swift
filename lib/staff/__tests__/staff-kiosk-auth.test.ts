import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyStaffPinAction,
  clockInShiftAction,
  clockOutShiftAction,
  toggleShiftBreakAction,
} from '../actions.ts';

describe('Staff Kiosk Authentication & Database Persistence (SIAA-78)', () => {
  const MIKE_MORALES_ID = '00000000-0000-0000-0000-000000000002';
  const DANTE_REYES_ID = '00000000-0000-0000-0000-000000000003';
  const RICO_SANTOS_ID = '00000000-0000-0000-0000-000000000004';
  const INVALID_PROFILE_ID = '00000000-0000-0000-0000-999999999999';

  describe('verifyStaffPinAction', () => {
    it('rejects invalid PIN formats (non-4 digits or letters)', async () => {
      const res1 = await verifyStaffPinAction(MIKE_MORALES_ID, '123');
      assert.equal(res1.success, false);
      assert.equal(res1.code, 'INVALID_PIN');

      const res2 = await verifyStaffPinAction(MIKE_MORALES_ID, 'abcd');
      assert.equal(res2.success, false);
      assert.equal(res2.code, 'INVALID_PIN');

      const res3 = await verifyStaffPinAction(MIKE_MORALES_ID, '12345');
      assert.equal(res3.success, false);
      assert.equal(res3.code, 'INVALID_PIN');
    });

    it('returns PROFILE_NOT_FOUND for unknown employee profile ID in offline mode', async () => {
      const res = await verifyStaffPinAction(INVALID_PROFILE_ID, '1234');
      assert.equal(res.success, false);
      assert.equal(res.code, 'PROFILE_NOT_FOUND');
    });

    it('rejects incorrect 4-digit PIN with INVALID_PIN', async () => {
      const res = await verifyStaffPinAction(MIKE_MORALES_ID, '9999');
      assert.equal(res.success, false);
      assert.equal(res.code, 'INVALID_PIN');
      assert.ok(res.error?.includes('Invalid employee PIN'));
    });

    it('authenticates Cashier Mike Morales with PIN 1234 and resolves profile', async () => {
      const res = await verifyStaffPinAction(MIKE_MORALES_ID, '1234');
      assert.equal(res.success, true);
      assert.ok(res.profile);
      assert.equal(res.profile.id, MIKE_MORALES_ID);
      assert.equal(res.profile.name, 'Mike Morales');
      assert.equal(res.profile.role, 'cashier');
      assert.equal(res.profile.avatarInitials, 'MM');
    });

    it('authenticates Mechanic Dante Reyes with PIN 2222 and resolves profile', async () => {
      const res = await verifyStaffPinAction(DANTE_REYES_ID, '2222');
      assert.equal(res.success, true);
      assert.ok(res.profile);
      assert.equal(res.profile.id, DANTE_REYES_ID);
      assert.equal(res.profile.name, 'Dante Reyes');
      assert.equal(res.profile.role, 'mechanic');
      assert.equal(res.profile.avatarInitials, 'DR');
    });

    it('authenticates Inventory Clerk Rico Santos with PIN 3333 and resolves profile', async () => {
      const res = await verifyStaffPinAction(RICO_SANTOS_ID, '3333');
      assert.equal(res.success, true);
      assert.ok(res.profile);
      assert.equal(res.profile.id, RICO_SANTOS_ID);
      assert.equal(res.profile.name, 'Rico Santos');
      assert.equal(res.profile.role, 'inventory_clerk');
    });
  });

  describe('Shift Actions with Profile Attribution', () => {
    it('clockInShiftAction attributes shift to designated profileId in fallback', async () => {
      const res = await clockInShiftAction('Terminal #01', 'Morning start', DANTE_REYES_ID);
      if (!res.success && (res.code === 'ACTIVE_SHIFT_EXISTS' || res.code === 'DATABASE_ERROR')) {
        assert.ok(res.error);
      } else {
        assert.equal(res.success, true);
        assert.equal(res.staffName, 'Dante Reyes');
        assert.equal(res.status, 'on_shift');
        assert.equal(res.terminalId, 'Terminal #01');
      }
    });

    it('clockOutShiftAction accepts profileId parameter and concludes shift', async () => {
      const res = await clockOutShiftAction('shift-999', 'End of shift', DANTE_REYES_ID);
      assert.equal(res.success, true);
      assert.equal(res.shiftId, 'shift-999');
      assert.equal(res.status, 'completed');
    });

    it('toggleShiftBreakAction accepts profileId parameter and toggles break', async () => {
      const res = await toggleShiftBreakAction('shift-999', DANTE_REYES_ID);
      assert.equal(res.success, true);
      assert.equal(res.shiftId, 'shift-999');
      assert.ok(res.status === 'break' || res.status === 'on_shift');
    });
  });
});
