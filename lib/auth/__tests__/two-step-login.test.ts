import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateUserAction,
} from '../actions.ts';
import {
  __getTestCookie,
  __clearTestCookies,
} from '../test-cookie-jar.ts';
import {
  resolveSession,
  evaluateRouteAccess,
} from '../session-guards.ts';

describe('Staff Direct Login Sequence (PIN bypassed)', () => {
  beforeEach(() => {
    __clearTestCookies();
  });

  describe('Password Verification & Direct Session Finalization', () => {
    it('directly logs in cashier demo account and routes to /staff/pos without PIN challenge', async () => {
      const result = await authenticateUserAction({
        email: 'cashier@swift.local',
        password: 'any-password',
        selectedRole: 'staff',
        rememberTerminal: true,
      });

      assert.equal(result.success, true);
      if (result.success && !result.requiresPin) {
        assert.equal(result.redirectTo, '/staff/pos');
        assert.equal(result.session.email, 'cashier@swift.local');
        assert.equal(result.session.name, 'Mike Morales');
        assert.equal(result.session.role, 'staff');
      } else {
        assert.fail('Expected direct login without requiring PIN');
      }

      // Assert session cookies are set directly and no pending challenge cookie exists
      assert.equal(__getTestCookie('swift-session-role'), 'staff');
      assert.equal(__getTestCookie('swift-user-name'), 'Mike Morales');
      assert.equal(__getTestCookie('swift-pending-staff-auth'), undefined);
    });

    it('directly logs in mechanic demo account and routes to /staff/work-orders', async () => {
      const result = await authenticateUserAction({
        email: 'mechanic1@swift.local',
        password: 'any-password',
        selectedRole: 'staff',
        rememberTerminal: false,
      });

      assert.equal(result.success, true);
      if (result.success && !result.requiresPin) {
        assert.equal(result.session.name, 'Dante Reyes');
        assert.equal(result.session.role, 'staff');
        assert.equal(result.redirectTo, '/staff/work-orders');
      } else {
        assert.fail('Expected direct login without requiring PIN');
      }

      assert.equal(__getTestCookie('swift-session-role'), 'staff');
      assert.equal(__getTestCookie('swift-user-name'), 'Dante Reyes');
    });

    it('directly logs in inventory clerk demo account and routes to /staff/search', async () => {
      const result = await authenticateUserAction({
        email: 'warehouse@swift.local',
        password: 'any-password',
        selectedRole: 'staff',
        rememberTerminal: false,
      });

      assert.equal(result.success, true);
      if (result.success && !result.requiresPin) {
        assert.equal(result.session.name, 'Rico Santos');
        assert.equal(result.session.role, 'staff');
        assert.equal(result.redirectTo, '/staff/search');
      } else {
        assert.fail('Expected direct login without requiring PIN');
      }

      assert.equal(__getTestCookie('swift-session-role'), 'staff');
      assert.equal(__getTestCookie('swift-user-name'), 'Rico Santos');
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

    it('rejects admin accounts attempting to log in on the staff portal', async () => {
      const result = await authenticateUserAction({
        email: 'admin@swift.local',
        password: 'admin-password',
        selectedRole: 'staff',
        rememberTerminal: true,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.code, 'ADMIN_STAFF_PORTAL_FORBIDDEN');
        assert.match(result.error, /Admin accounts cannot log in to the Staff Portal/);
      }
      assert.equal(__getTestCookie('swift-session-role'), undefined);
      assert.equal(__getTestCookie('swift-pending-staff-auth'), undefined);
    });

    it('rejects staff accounts attempting to log in on the admin portal', async () => {
      const result = await authenticateUserAction({
        email: 'cashier@swift.local',
        password: 'any-password',
        selectedRole: 'admin',
        rememberTerminal: true,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.code, 'STAFF_ADMIN_PORTAL_FORBIDDEN');
        assert.match(result.error, /Staff accounts cannot log in to the Admin Portal/);
      }
      assert.equal(__getTestCookie('swift-session-role'), undefined);
      assert.equal(__getTestCookie('swift-pending-staff-auth'), undefined);
    });
  });

  describe('Route Session Guard', () => {
    it('allows access to /staff/* once session is authorized', () => {
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

    it('redirects unauthenticated users to home login page', () => {
      const mockCookies = {
        get: () => undefined,
      };

      const session = resolveSession(mockCookies);
      assert.equal(session.isAuthenticated, false);

      const decision = evaluateRouteAccess('/staff/pos', session);
      assert.equal(decision.action, 'REDIRECT');
      assert.equal(decision.destination, '/');
    });
  });
});
