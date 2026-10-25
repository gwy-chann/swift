import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_DEMO_ACCOUNTS,
  DEMO_ACCOUNTS,
  DEMO_ADMIN_ACCOUNT,
  DEMO_STAFF_ACCOUNTS,
} from '../constants.ts';
import { DEFAULT_DEMO_PINS } from '../../staff/constants.ts';
import { verifyStaffPinAction } from '../../staff/actions.ts';

describe('Demo Staff Accounts & Punch Clock PIN Authorization Matrix', () => {
  it('exports all demo staff and admin accounts with complete credentials and PINs', () => {
    assert.equal(ALL_DEMO_ACCOUNTS.length, 4);

    const admin = ALL_DEMO_ACCOUNTS.find((a) => a.role === 'admin');
    assert.ok(admin);
    assert.equal(admin.email, DEMO_ADMIN_ACCOUNT.email);
    assert.equal(admin.name, 'Carlos Rodriguez');
    assert.equal(admin.pin, DEMO_ADMIN_ACCOUNT.pin);
    assert.equal(admin.targetUrl, '/admin');

    const cashier = ALL_DEMO_ACCOUNTS.find((a) => a.staffRole === 'cashier');
    assert.ok(cashier);
    assert.equal(cashier.email, 'cashier@swift.local');
    assert.equal(cashier.name, 'Mike Morales');
    assert.equal(cashier.pin, '1234');
    assert.equal(cashier.targetUrl, '/staff/pos');

    const mechanic = ALL_DEMO_ACCOUNTS.find((a) => a.staffRole === 'mechanic');
    assert.ok(mechanic);
    assert.equal(mechanic.email, 'mechanic1@swift.local');
    assert.equal(mechanic.name, 'Dante Reyes');
    assert.equal(mechanic.pin, '2222');
    assert.equal(mechanic.targetUrl, '/staff/compat');

    const clerk = ALL_DEMO_ACCOUNTS.find((a) => a.staffRole === 'inventory_clerk');
    assert.ok(clerk);
    assert.equal(clerk.email, 'warehouse@swift.local');
    assert.equal(clerk.name, 'Rico Santos');
    assert.equal(clerk.pin, '3333');
    assert.equal(clerk.targetUrl, '/staff/search');
  });

  it('maintains backwards compatibility for DEMO_ACCOUNTS record', () => {
    assert.equal(DEMO_ACCOUNTS.admin.email, 'admin@swift.local');
    assert.equal(DEMO_ACCOUNTS.staff.email, 'cashier@swift.local');
    assert.equal(DEMO_ACCOUNTS.admin.role, 'admin');
    assert.equal(DEMO_ACCOUNTS.staff.role, 'staff');
  });

  it('binds valid 4-digit PIN codes matching the punch clock authorization system', async () => {
    for (const account of ALL_DEMO_ACCOUNTS) {
      assert.ok(account.id, `Account ${account.email} must have an ID`);
      assert.ok(account.pin, `Account ${account.email} must have a PIN`);

      // Verify matching entry in DEFAULT_DEMO_PINS
      assert.equal(
        DEFAULT_DEMO_PINS[account.id],
        account.pin,
        `DEFAULT_DEMO_PINS must match for ${account.name}`
      );

      // Verify verifyStaffPinAction succeeds with correct PIN
      const successResult = await verifyStaffPinAction(account.id, account.pin);
      assert.equal(successResult.success, true, `PIN verification failed for ${account.name}`);
      assert.ok(successResult.profile);
      assert.equal(successResult.profile.name, account.name);

      // Verify verifyStaffPinAction rejects incorrect PIN
      const failResult = await verifyStaffPinAction(account.id, '0000');
      assert.equal(failResult.success, false);
      assert.equal(failResult.code, 'INVALID_PIN');
    }
  });

  it('rejects malformed PIN codes with exact 4-digit constraint', async () => {
    const testId = DEMO_STAFF_ACCOUNTS[0].id!;
    const shortPinResult = await verifyStaffPinAction(testId, '12');
    assert.equal(shortPinResult.success, false);
    assert.equal(shortPinResult.code, 'INVALID_PIN');

    const nonNumericResult = await verifyStaffPinAction(testId, 'abcd');
    assert.equal(nonNumericResult.success, false);
    assert.equal(nonNumericResult.code, 'INVALID_PIN');
  });
});
