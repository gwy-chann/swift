import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  StaffPinSchema,
  VerifyStaffPinSchema,
  StaffKioskProfileSchema,
  VerifyStaffPinResultSchema,
  DEFAULT_DEMO_PINS,
} from '../../../specs/078-staff-kiosk-auth/contracts/kiosk-auth.contract.ts';
import { MOCK_STAFF_PROFILES } from '../../mock-data/users.ts';

describe('Staff Kiosk UI & Contracts Engine (SIAA-78)', () => {
  const MIKE_ID = '00000000-0000-0000-0000-000000000002';
  const DANTE_ID = '00000000-0000-0000-0000-000000000003';

  describe('Contract Schema Validations', () => {
    it('validates strictly 4-digit numeric PINs', () => {
      assert.equal(StaffPinSchema.safeParse('1234').success, true);
      assert.equal(StaffPinSchema.safeParse('0000').success, true);
      assert.equal(StaffPinSchema.safeParse('9999').success, true);

      // Rejections
      assert.equal(StaffPinSchema.safeParse('123').success, false);
      assert.equal(StaffPinSchema.safeParse('12345').success, false);
      assert.equal(StaffPinSchema.safeParse('abcd').success, false);
      assert.equal(StaffPinSchema.safeParse('12 4').success, false);
    });

    it('validates VerifyStaffPinSchema payload structure', () => {
      const valid = VerifyStaffPinSchema.safeParse({
        profileId: MIKE_ID,
        pin: '1234',
      });
      assert.equal(valid.success, true);

      const invalidUuid = VerifyStaffPinSchema.safeParse({
        profileId: 'not-a-uuid',
        pin: '1234',
      });
      assert.equal(invalidUuid.success, false);
    });

    it('validates StaffKioskProfileSchema structure', () => {
      const valid = StaffKioskProfileSchema.safeParse({
        id: MIKE_ID,
        name: 'Mike Morales',
        email: 'cashier@swift.local',
        role: 'cashier',
        roleDisplay: 'Cashier',
        avatarInitials: 'MM',
      });
      assert.equal(valid.success, true);
    });

    it('validates VerifyStaffPinResultSchema responses', () => {
      const successResult = VerifyStaffPinResultSchema.safeParse({
        success: true,
        profile: {
          id: MIKE_ID,
          name: 'Mike Morales',
          email: 'cashier@swift.local',
          role: 'cashier',
          roleDisplay: 'Cashier',
          avatarInitials: 'MM',
        },
      });
      assert.equal(successResult.success, true);

      const errorResult = VerifyStaffPinResultSchema.safeParse({
        success: false,
        code: 'INVALID_PIN',
        error: 'Invalid employee PIN. Please try again.',
      });
      assert.equal(errorResult.success, true);
    });
  });

  describe('Roster & Default Demo PIN Mapping', () => {
    it('provides valid default demo PINs for all staff personas', () => {
      assert.equal(DEFAULT_DEMO_PINS[MIKE_ID], '1234');
      assert.equal(DEFAULT_DEMO_PINS[DANTE_ID], '2222');
      assert.equal(DEFAULT_DEMO_PINS['00000000-0000-0000-0000-000000000004'], '3333');
      assert.equal(DEFAULT_DEMO_PINS['00000000-0000-0000-0000-000000000001'], '8888');
    });

    it('maps all mock staff profiles to valid kiosk profile representations', () => {
      for (const profile of MOCK_STAFF_PROFILES) {
        const initials = profile.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase();
        assert.ok(initials.length >= 1);
        assert.ok(profile.id);
        assert.ok(profile.roleDisplay);
      }
    });
  });
});
