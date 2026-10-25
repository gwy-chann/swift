import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  customerIntakeSchema,
  philippinePhoneRegex,
  assignMechanicSchema,
} from '../../workshop/intake-dispatch-contracts.ts';

describe('Customer Intake & Dispatch Contracts (SIAA-101)', () => {
  describe('Philippine Mobile Number Validation', () => {
    it('accepts standard 11-digit numbers starting with 09', () => {
      assert.ok(philippinePhoneRegex.test('09171234567'));
      assert.ok(philippinePhoneRegex.test('09987654321'));
    });

    it('accepts hyphenated Philippine mobile numbers (09XX-XXX-XXXX)', () => {
      assert.ok(philippinePhoneRegex.test('0917-123-4567'));
      assert.ok(philippinePhoneRegex.test('0999-888-7777'));
    });

    it('accepts space-separated Philippine mobile numbers (09XX XXX XXXX)', () => {
      assert.ok(philippinePhoneRegex.test('0917 123 4567'));
    });

    it('accepts international +639 format', () => {
      assert.ok(philippinePhoneRegex.test('+639171234567'));
    });

    it('rejects invalid numbers and non-Philippine formats', () => {
      assert.strictEqual(philippinePhoneRegex.test('12345'), false);
      assert.strictEqual(philippinePhoneRegex.test('08123456789'), false);
      assert.strictEqual(philippinePhoneRegex.test('0917123456'), false); // 10 digits
      assert.strictEqual(philippinePhoneRegex.test('091712345678'), false); // 12 digits
      assert.strictEqual(philippinePhoneRegex.test('abcdefghijk'), false);
    });
  });

  describe('customerIntakeSchema', () => {
    it('validates a complete, valid customer intake payload', () => {
      const validPayload = {
        customerName: 'Juan Dela Cruz',
        customerPhone: '0917-555-1234',
        vehicleModel: 'Yamaha NMAX 155',
        plateNumber: '123-NCR',
        complaints: 'Squeaking sound from rear brake assembly during braking',
      };

      const result = customerIntakeSchema.safeParse(validPayload);
      assert.strictEqual(result.success, true);
    });

    it('fails when customer name is empty or too short', () => {
      const invalidPayload = {
        customerName: ' ',
        customerPhone: '0917-555-1234',
        vehicleModel: 'Yamaha NMAX 155',
        plateNumber: '123-NCR',
        complaints: 'Squeaking sound',
      };

      const result = customerIntakeSchema.safeParse(invalidPayload);
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.some((i) => i.path.includes('customerName')));
      }
    });

    it('fails when vehicle model or plate number is missing', () => {
      const invalidPayload = {
        customerName: 'Juan Dela Cruz',
        customerPhone: '0917-555-1234',
        vehicleModel: '',
        plateNumber: '',
        complaints: 'Oil change',
      };

      const result = customerIntakeSchema.safeParse(invalidPayload);
      assert.strictEqual(result.success, false);
    });

    it('fails when complaints field is empty', () => {
      const invalidPayload = {
        customerName: 'Juan Dela Cruz',
        customerPhone: '0917-555-1234',
        vehicleModel: 'Honda Click 150i',
        plateNumber: 'XYZ-789',
        complaints: '  ',
      };

      const result = customerIntakeSchema.safeParse(invalidPayload);
      assert.strictEqual(result.success, false);
    });
  });

  describe('assignMechanicSchema', () => {
    it('validates correct assignment payload with valid UUID', () => {
      const valid = {
        orderId: 'wo-101-test',
        mechanicId: 'd0000000-0000-0000-0000-000000000003',
        mechanicName: 'Dante Reyes',
      };
      const result = assignMechanicSchema.safeParse(valid);
      assert.strictEqual(result.success, true);
    });

    it('rejects empty mechanic ID', () => {
      const invalid = {
        orderId: 'wo-101-test',
        mechanicId: '',
        mechanicName: 'Dante Reyes',
      };
      const result = assignMechanicSchema.safeParse(invalid);
      assert.strictEqual(result.success, false);
    });
  });
});
