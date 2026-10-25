import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { verifyStaffPinAction } from '../actions.ts';
import { toggleUserStatusAction, resetInMemoryStaffUsers } from '../../admin/user-actions.ts';

describe('Inactive Staff PIN Verification Blocking (SIAA-103)', () => {
  beforeEach(async () => {
    await resetInMemoryStaffUsers();
  });

  const MIKE_ID = '00000000-0000-0000-0000-000000000002'; // Cashier Mike Morales, PIN: 1234
  const ADMIN_ID = '00000000-0000-0000-0000-000000000001';

  it('authenticates active cashier with correct PIN', async () => {
    const res = await verifyStaffPinAction(MIKE_ID, '1234');
    assert.equal(res.success, true);
    assert.equal(res.profile?.name, 'Mike Morales');
  });

  it('rejects PIN verification when staff member is set to Inactive', async () => {
    // 1. Deactivate cashier account
    await toggleUserStatusAction(MIKE_ID, 'Inactive', ADMIN_ID, 'admin');

    // 2. Submit valid PIN for the deactivated account
    const res = await verifyStaffPinAction(MIKE_ID, '1234');

    // 3. Verify rejection with code ACCOUNT_INACTIVE and required message
    assert.equal(res.success, false);
    assert.equal(res.code, 'ACCOUNT_INACTIVE');
    assert.equal(
      res.error,
      'Account is inactive. Please contact your workshop administrator.'
    );
  });

  it('resumes allowing PIN verification after account is reactivated', async () => {
    // Deactivate
    await toggleUserStatusAction(MIKE_ID, 'Inactive', ADMIN_ID, 'admin');
    const blocked = await verifyStaffPinAction(MIKE_ID, '1234');
    assert.equal(blocked.success, false);

    // Reactivate
    await toggleUserStatusAction(MIKE_ID, 'Active', ADMIN_ID, 'admin');
    const allowed = await verifyStaffPinAction(MIKE_ID, '1234');
    assert.equal(allowed.success, true);
  });
});
