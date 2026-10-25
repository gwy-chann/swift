import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  toggleUserStatusAction,
  getStaffUserStatus,
  resetInMemoryStaffUsers,
} from '../user-actions.ts';

describe('Admin User Deactivation & Status Toggle (SIAA-103)', () => {
  beforeEach(async () => {
    await resetInMemoryStaffUsers();
  });

  const MIKE_ID = '00000000-0000-0000-0000-000000000002';
  const ADMIN_ID = '00000000-0000-0000-0000-000000000001';

  it('updates employee status to Inactive and getStaffUserStatus reflects Inactive immediately', async () => {
    // Initial status
    const initialStatus = await getStaffUserStatus(MIKE_ID);
    assert.equal(initialStatus, 'Active');

    // Deactivate employee
    const res = await toggleUserStatusAction(MIKE_ID, 'Inactive', ADMIN_ID, 'admin');
    assert.equal(res.success, true);
    assert.equal(res.data?.status, 'Inactive');

    // getStaffUserStatus by ID and email
    const statusById = await getStaffUserStatus(MIKE_ID);
    assert.equal(statusById, 'Inactive');

    const statusByEmail = await getStaffUserStatus('cashier@swift.local');
    assert.equal(statusByEmail, 'Inactive');
  });

  it('enforces self-lockout prevention so Admin cannot deactivate themselves', async () => {
    const res = await toggleUserStatusAction(ADMIN_ID, 'Inactive', ADMIN_ID, 'admin');
    assert.equal(res.success, false);
    assert.equal(res.code, 'SELF_LOCKOUT_PREVENTED');
    assert.equal(res.error, 'Admin self-lockout or deactivation is prohibited.');

    const adminStatus = await getStaffUserStatus(ADMIN_ID);
    assert.equal(adminStatus, 'Active');
  });
});
