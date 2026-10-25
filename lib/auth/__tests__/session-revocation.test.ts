import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRouteAccess, resolveSession, type ResolvedSession } from '../session-guards.ts';

describe('Immediate Active Session Revocation & Route Guards (SIAA-103)', () => {
  it('redirects to /login?notice=inactive when session is marked isInactive', () => {
    const inactiveSession: ResolvedSession = {
      isAuthenticated: false,
      role: null,
      userId: '00000000-0000-0000-0000-000000000002',
      source: 'none',
      isInactive: true,
    };

    // Regardless of destination route (staff POS, admin dashboard, shelf locator), redirect to login with inactive notice
    const decision1 = evaluateRouteAccess('/staff/pos', inactiveSession);
    assert.equal(decision1.action, 'REDIRECT');
    assert.equal(decision1.destination, '/login?notice=inactive');
    assert.equal(decision1.statusCode, 307);

    const decision2 = evaluateRouteAccess('/admin', inactiveSession);
    assert.equal(decision2.action, 'REDIRECT');
    assert.equal(decision2.destination, '/login?notice=inactive');

    const decision3 = evaluateRouteAccess('/', inactiveSession);
    assert.equal(decision3.action, 'REDIRECT');
    assert.equal(decision3.destination, '/login?notice=inactive');
  });

  it('allows access to staff portal for active authenticated staff session', () => {
    const activeStaffSession: ResolvedSession = {
      isAuthenticated: true,
      role: 'staff',
      userId: '00000000-0000-0000-0000-000000000002',
      source: 'demo',
      isInactive: false,
    };

    const decision = evaluateRouteAccess('/staff/pos', activeStaffSession);
    assert.equal(decision.action, 'ALLOW');
  });

  it('preserves user ID from session cookie in resolveSession', () => {
    const mockCookies = {
      get(name: string) {
        if (name === 'swift-session-role') return { value: 'staff' };
        if (name === 'swift-session-user-id') return { value: '00000000-0000-0000-0000-000000000002' };
        return undefined;
      },
    };

    const session = resolveSession(mockCookies, null);
    assert.equal(session.isAuthenticated, true);
    assert.equal(session.role, 'staff');
    assert.equal(session.userId, '00000000-0000-0000-0000-000000000002');
  });
});
