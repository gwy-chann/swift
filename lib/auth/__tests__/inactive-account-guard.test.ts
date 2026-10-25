import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { authenticateUserAction } from '../actions.ts';
import { toggleUserStatusAction, resetInMemoryStaffUsers } from '../../admin/user-actions.ts';

describe('Inactive Staff Account Login Blocking (SIAA-103)', () => {
  beforeEach(async () => {
    await resetInMemoryStaffUsers();
  });

  it('allows authentication for active cashier demo credentials', async () => {
    const result = await authenticateUserAction({
      email: 'cashier@swift.local',
      password: 'AnyPassword#2026',
      selectedRole: 'staff',
      rememberTerminal: false,
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.session.role, 'staff');
      assert.equal(result.redirectTo, '/staff/pos');
    }
  });

  it('blocks login attempt when staff member is set to Inactive in ledger', async () => {
    // 1. Deactivate cashier account (Mike Morales, id: '00000000-0000-0000-0000-000000000002')
    const toggleRes = await toggleUserStatusAction(
      '00000000-0000-0000-0000-000000000002',
      'Inactive',
      '00000000-0000-0000-0000-000000000001', // admin caller
      'admin'
    );
    assert.equal(toggleRes.success, true);

    // 2. Attempt login as inactive cashier
    const loginRes = await authenticateUserAction({
      email: 'cashier@swift.local',
      password: 'ValidPassword123',
      selectedRole: 'staff',
      rememberTerminal: false,
    });

    // 3. Verify rejection code and exact user-facing message from SIAA-103 acceptance criteria
    assert.equal(loginRes.success, false);
    if (!loginRes.success) {
      assert.equal(loginRes.code, 'ACCOUNT_INACTIVE');
      assert.equal(
        loginRes.error,
        'Account is inactive. Please contact your workshop administrator.'
      );
    }
  });

  it('permits login again after account is re-activated to Active', async () => {
    const cashierId = '00000000-0000-0000-0000-000000000002';
    const adminId = '00000000-0000-0000-0000-000000000001';

    // Deactivate
    await toggleUserStatusAction(cashierId, 'Inactive', adminId, 'admin');
    const blockedRes = await authenticateUserAction({
      email: 'cashier@swift.local',
      password: 'Pass',
      selectedRole: 'staff',
      rememberTerminal: false,
    });
    assert.equal(blockedRes.success, false);

    // Reactivate
    await toggleUserStatusAction(cashierId, 'Active', adminId, 'admin');
    const allowedRes = await authenticateUserAction({
      email: 'cashier@swift.local',
      password: 'Pass',
      selectedRole: 'staff',
      rememberTerminal: false,
    });
    assert.equal(allowedRes.success, true);
  });
});
