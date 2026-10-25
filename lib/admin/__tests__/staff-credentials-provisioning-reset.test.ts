import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  provisionStaffUserAction,
  resetStaffCredentialsAction,
  listStaffUsersAction,
  resetInMemoryStaffUsers,
  getInMemoryStaffUserPin,
} from '../user-actions.ts';
import { getSecurityAuditLogsAction } from '../audit-actions.ts';
import {
  StaffPinSchema,
  StaffPasswordSchema,
  PIN_VALIDATION_ERROR_MSG,
} from '../../../specs/104-staff-credential-provisioning-and-reset/contracts/credentials.contract.ts';

describe('SIAA-104: Admin Provision Email, Password, and PIN for Staff with Credential Reset Capability', () => {
  beforeEach(async () => {
    await resetInMemoryStaffUsers();
  });

  describe('Scenario 1: PIN and Password Validation Formatting', () => {
    it('enforces that PIN must consist of 4 to 6 numeric digits', () => {
      // Valid inputs
      assert.equal(StaffPinSchema.safeParse('1234').success, true);
      assert.equal(StaffPinSchema.safeParse('12345').success, true);
      assert.equal(StaffPinSchema.safeParse('123456').success, true);
      assert.equal(StaffPinSchema.safeParse('0000').success, true);

      // Invalid inputs: alphabetical characters
      const alphaResult = StaffPinSchema.safeParse('abcd');
      assert.equal(alphaResult.success, false);
      if (!alphaResult.success) {
        assert.equal(alphaResult.error.issues[0]?.message, PIN_VALIDATION_ERROR_MSG);
      }

      // Invalid inputs: alphanumeric mix
      const mixResult = StaffPinSchema.safeParse('12a4');
      assert.equal(mixResult.success, false);
      if (!mixResult.success) {
        assert.equal(mixResult.error.issues[0]?.message, PIN_VALIDATION_ERROR_MSG);
      }

      // Invalid inputs: shorter than 4 digits
      const shortResult = StaffPinSchema.safeParse('123');
      assert.equal(shortResult.success, false);
      if (!shortResult.success) {
        assert.equal(shortResult.error.issues[0]?.message, PIN_VALIDATION_ERROR_MSG);
      }

      // Invalid inputs: longer than 6 digits
      const longResult = StaffPinSchema.safeParse('1234567');
      assert.equal(longResult.success, false);
      if (!longResult.success) {
        assert.equal(longResult.error.issues[0]?.message, PIN_VALIDATION_ERROR_MSG);
      }
    });

    it('enforces password minimum length of 6 characters', () => {
      assert.equal(StaffPasswordSchema.safeParse('swift123').success, true);
      assert.equal(StaffPasswordSchema.safeParse('123456').success, true);

      const shortPwd = StaffPasswordSchema.safeParse('12345');
      assert.equal(shortPwd.success, false);
      if (!shortPwd.success) {
        assert.equal(shortPwd.error.issues[0]?.message, 'Password must be at least 6 characters in length');
      }
    });
  });

  describe('Scenario 2: Provisioning a new staff member with full credentials', () => {
    it('successfully provisions staff with name, email, password, and 4-6 digit numeric PIN', async () => {
      const payload = {
        fullName: 'Elena Cruz',
        email: 'elena.cruz@swift.local',
        role: 'cashier' as const,
        password: 'temporarySecret123',
        pin: '4321',
      };

      const result = await provisionStaffUserAction(payload, 'admin');
      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data.fullName, 'Elena Cruz');
      assert.equal(result.data.email, 'elena.cruz@swift.local');
      assert.equal(result.data.role, 'cashier');
      assert.equal(result.data.status, 'Active');

      // Verify PIN is saved in store
      const storedPin = await getInMemoryStaffUserPin(result.data.id);
      assert.equal(storedPin, '4321');

      // Verify appears in staff directory
      const directory = await listStaffUsersAction();
      const elena = directory.find((u) => u.email === 'elena.cruz@swift.local');
      assert.ok(elena, 'Elena Cruz should be present in staff directory');
    });

    it('rejects provisioning when PIN format is invalid', async () => {
      const invalidPayload = {
        fullName: 'Invalid Pin Staff',
        email: 'invalid.pin@swift.local',
        role: 'mechanic' as const,
        password: 'validPassword123',
        pin: 'abc', // alphabetical and < 4 digits
      };

      const result = await provisionStaffUserAction(invalidPayload, 'admin');
      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.equal(result.error, PIN_VALIDATION_ERROR_MSG);
    });
  });

  describe('Scenario 3: Admin resets a forgotten password and PIN for an existing staff member', () => {
    it('resets credentials and updates password and PIN for an existing staff member', async () => {
      const cashierId = '00000000-0000-0000-0000-000000000002'; // Mike Morales

      const resetPayload = {
        userId: cashierId,
        password: 'newReplacementPassword123',
        pin: '9876',
      };

      const result = await resetStaffCredentialsAction(resetPayload, 'admin');
      assert.equal(result.success, true);
      assert.ok(result.message?.includes('Credentials successfully reset'));

      // Verify stored PIN is updated
      const updatedPin = await getInMemoryStaffUserPin(cashierId);
      assert.equal(updatedPin, '9876');

      // Verify security audit log record was created
      const auditRes = await getSecurityAuditLogsAction({ limit: 10 });
      assert.equal(auditRes.success, true);
      assert.ok(auditRes.data, 'Audit log data must be present');
      const resetLog = auditRes.data.find(
        (l) => l.action.includes('Reset credentials for employee account: cashier@swift.local')
      );
      assert.ok(resetLog, 'Audit event for credential reset must exist');
      assert.equal(resetLog?.severity, 'warning');
    });

    it('rejects credential reset when PIN is not 4-6 numeric digits', async () => {
      const cashierId = '00000000-0000-0000-0000-000000000002';

      const result = await resetStaffCredentialsAction(
        {
          userId: cashierId,
          password: 'newPassword123',
          pin: '12345678', // 8 digits (exceeds 6)
        },
        'admin'
      );

      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.equal(result.error, PIN_VALIDATION_ERROR_MSG);
    });

    it('rejects credential reset from unauthorized non-admin session', async () => {
      const cashierId = '00000000-0000-0000-0000-000000000002';

      const result = await resetStaffCredentialsAction(
        {
          userId: cashierId,
          password: 'newPassword123',
          pin: '5555',
        },
        'cashier' // non-admin
      );

      assert.equal(result.success, false);
      assert.equal(result.code, 'UNAUTHORIZED');
      assert.ok(result.error?.includes('Admin privileges required'));
    });

    it('returns USER_NOT_FOUND when attempting to reset credentials for non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-999999999999';

      const result = await resetStaffCredentialsAction(
        {
          userId: nonExistentId,
          password: 'newPassword123',
          pin: '5555',
        },
        'admin'
      );

      assert.equal(result.success, false);
      assert.equal(result.code, 'USER_NOT_FOUND');
    });
  });
});
