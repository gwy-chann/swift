import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateUserAction,
  completeStaffTwoStepLoginAction,
  cancelStaffPinChallengeAction,
} from '../actions.ts';
import {
  PIN_ERROR_INVALID,
  PIN_VALIDATION_ERROR_MSG,
} from '../constants.ts';
import {
  __getTestCookie,
  __clearTestCookies,
} from '../test-cookie-jar.ts';
import {
  resolveSession,
  evaluateRouteAccess,
} from '../session-guards.ts';

describe('Staff Two-Step Login Sequence (SIAA-106)', () => {
  beforeEach(() => {
    __clearTestCookies();
  });

  describe('Step 1: Password Verification & PIN Challenge Issuance', () => {
    it('initiates PIN challenge for cashier demo account without granting session role', async () => {
      const result = await authenticateUserAction({
        email: 'cashier@swift.local',
        password: 'any-password',
        selectedRole: 'staff',
        rememberTerminal: true,
      });

      assert.equal(result.success, true);
      if (result.success && result.requiresPin) {
        assert.equal(result.requiresPin, true);
        assert.equal(result.step, 'ENTER_PIN');
        assert.equal(result.staffSummary.email, 'cashier@swift.local');
        assert.equal(result.staffSummary.name, 'Mike Morales');
        assert.equal(result.staffSummary.role, 'cashier');
      } else {
        assert.fail('Expected requiresPin to be true');
      }

      // Assert intermediate cookie is set but session role is NOT set
      const challengeCookie = __getTestCookie('swift-pending-staff-auth');
      assert.ok(challengeCookie, 'swift-pending-staff-auth cookie must be set');
      assert.equal(
        __getTestCookie('swift-session-role'),
        undefined,
        'swift-session-role must NOT be set yet'
      );
    });

    it('initiates PIN challenge for mechanic demo account', async () => {
      const result = await authenticateUserAction({
        email: 'mechanic1@swift.local',
        password: 'any-password',
        selectedRole: 'staff',
        rememberTerminal: false,
      });

      assert.equal(result.success, true);
      if (result.success && result.requiresPin) {
        assert.equal(result.requiresPin, true);
        assert.equal(result.staffSummary.name, 'Dante Reyes');
        assert.equal(result.staffSummary.role, 'mechanic');
      } else {
        assert.fail('Expected requiresPin to be true');
      }
    });

    it('directly logs in admin accounts without triggering two-step PIN challenge', async () => {
      const result = await authenticateUserAction({
        email: 'admin@swift.local',
        password: 'admin-password',
        selectedRole: 'admin',
        rememberTerminal: true,
      });

      assert.equal(result.success, true);
      if (result.success && !result.requiresPin) {
        assert.equal(result.redirectTo, '/admin');
        assert.equal(result.session.role, 'admin');
      } else {
        assert.fail('Admin should not require PIN challenge');
      }

      assert.equal(__getTestCookie('swift-session-role'), 'admin');
      assert.equal(__getTestCookie('swift-pending-staff-auth'), undefined);
    });
  });

  describe('Step 2: PIN Verification & Session Finalization', () => {
    it('rejects verification if challenge cookie is missing or expired', async () => {
      const result = await completeStaffTwoStepLoginAction({ pin: '1234' });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.code, 'CHALLENGE_EXPIRED');
        assert.match(result.error, /expired/i);
      }
    });

    it('rejects invalid PIN formats with standard 4-6 digit error', async () => {
      // Setup pending challenge
      await authenticateUserAction({
        email: 'cashier@swift.local',
        password: 'pwd',
        selectedRole: 'staff',
        rememberTerminal: true,
      });

      // Test too short
      const shortRes = await completeStaffTwoStepLoginAction({ pin: '123' });
      assert.equal(shortRes.success, false);
      if (!shortRes.success) {
        assert.equal(shortRes.error, PIN_VALIDATION_ERROR_MSG);
      }

      // Test non-numeric
      const alphaRes = await completeStaffTwoStepLoginAction({ pin: '12ab' });
      assert.equal(alphaRes.success, false);
      if (!alphaRes.success) {
        assert.equal(alphaRes.error, PIN_VALIDATION_ERROR_MSG);
      }

      // Test too long
      const longRes = await completeStaffTwoStepLoginAction({ pin: '1234567' });
      assert.equal(longRes.success, false);
      if (!longRes.success) {
        assert.equal(longRes.error, PIN_VALIDATION_ERROR_MSG);
      }
    });

    it('rejects incorrect PIN and denies session token', async () => {
      await authenticateUserAction({
        email: 'cashier@swift.local',
        password: 'pwd',
        selectedRole: 'staff',
        rememberTerminal: true,
      });

      const result = await completeStaffTwoStepLoginAction({ pin: '9999' });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.code, 'INVALID_PIN');
        assert.equal(result.error, PIN_ERROR_INVALID);
      }

      // Confirm no session cookie granted
      assert.equal(__getTestCookie('swift-session-role'), undefined);
      // Confirm challenge cookie remains active for retry
      assert.ok(__getTestCookie('swift-pending-staff-auth'));
    });

    it('completes session authorization when matching 4-to-6 digit PIN is submitted', async () => {
      await authenticateUserAction({
        email: 'cashier@swift.local',
        password: 'pwd',
        selectedRole: 'staff',
        rememberTerminal: true,
      });

      // Cashier demo pin is '1234'
      const result = await completeStaffTwoStepLoginAction({ pin: '1234' });
      assert.equal(result.success, true);
      if (result.success && !result.requiresPin) {
        assert.equal(result.redirectTo, '/staff/pos');
        assert.equal(result.session.name, 'Mike Morales');
        assert.equal(result.session.role, 'staff');
      } else {
        assert.fail('Expected session authorization to succeed');
      }

      // Assert challenge cookie is removed and session role cookie is set
      assert.equal(__getTestCookie('swift-pending-staff-auth'), undefined);
      assert.equal(__getTestCookie('swift-session-role'), 'staff');
      assert.equal(__getTestCookie('swift-user-name'), 'Mike Morales');
    });

    it('allows cancelling challenge to return to Step 1', async () => {
      await authenticateUserAction({
        email: 'cashier@swift.local',
        password: 'pwd',
        selectedRole: 'staff',
        rememberTerminal: true,
      });

      assert.ok(__getTestCookie('swift-pending-staff-auth'));
      const cancelRes = await cancelStaffPinChallengeAction();
      assert.equal(cancelRes.success, true);
      assert.equal(__getTestCookie('swift-pending-staff-auth'), undefined);
    });
  });

  describe('Route Session Guard: Direct URL Bypass Prevention', () => {
    it('redirects direct /staff/* route navigation back to /login when only Step 1 challenge is pending', () => {
      const mockCookies = {
        get: (name: string) => {
          if (name === 'swift-pending-staff-auth') {
            return {
              value: encodeURIComponent(
                JSON.stringify({
                  userId: '00000000-0000-0000-0000-000000000002',
                  email: 'cashier@swift.local',
                  name: 'Mike Morales',
                  role: 'cashier',
                  portalRole: 'staff',
                })
              ),
            };
          }
          return undefined;
        },
      };

      const session = resolveSession(mockCookies);
      assert.equal(session.isAuthenticated, false);
      assert.equal(session.hasPendingPinChallenge, true);
      assert.equal(session.pendingStaffEmail, 'cashier@swift.local');

      // Test bypass attempts to various staff routes
      const posDecision = evaluateRouteAccess('/staff/pos', session);
      assert.equal(posDecision.action, 'REDIRECT');
      assert.equal(posDecision.destination, '/login?notice=pin_challenge_pending');

      const workOrdersDecision = evaluateRouteAccess('/staff/work-orders', session);
      assert.equal(workOrdersDecision.action, 'REDIRECT');
      assert.equal(workOrdersDecision.destination, '/login?notice=pin_challenge_pending');

      const pricecheckDecision = evaluateRouteAccess('/staff/pricecheck', session);
      assert.equal(pricecheckDecision.action, 'REDIRECT');
      assert.equal(pricecheckDecision.destination, '/login?notice=pin_challenge_pending');

      // But /login itself is allowed so user can complete PIN entry
      const loginDecision = evaluateRouteAccess('/login', session);
      assert.equal(loginDecision.action, 'ALLOW');

      const rootDecision = evaluateRouteAccess('/', session);
      assert.equal(rootDecision.action, 'ALLOW');
    });

    it('allows access to /staff/* once full session is authorized', () => {
      const mockCookies = {
        get: (name: string) => {
          if (name === 'swift-session-role') return { value: 'staff' };
          if (name === 'swift-user-name') return { value: 'Mike Morales' };
          return undefined;
        },
      };

      const session = resolveSession(mockCookies);
      assert.equal(session.isAuthenticated, true);
      assert.equal(session.role, 'staff');

      const decision = evaluateRouteAccess('/staff/pos', session);
      assert.equal(decision.action, 'ALLOW');
    });
  });
});
