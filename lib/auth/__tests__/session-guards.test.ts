import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyRoute,
  resolveSession,
  evaluateRouteAccess,
  type ResolvedSession,
} from '../session-guards.ts';

describe('Session Route Guards & Access Matrix Engine (SIAA-71)', () => {
  describe('classifyRoute', () => {
    it('classifies root and /login as AUTH_HUB', () => {
      assert.equal(classifyRoute('/'), 'AUTH_HUB');
      assert.equal(classifyRoute('/login'), 'AUTH_HUB');
      assert.equal(classifyRoute('/LOGIN'), 'AUTH_HUB');
      assert.equal(classifyRoute('/login/'), 'AUTH_HUB');
    });

    it('classifies admin routes as ADMIN_PORTAL', () => {
      assert.equal(classifyRoute('/admin'), 'ADMIN_PORTAL');
      assert.equal(classifyRoute('/admin/'), 'ADMIN_PORTAL');
      assert.equal(classifyRoute('/admin/inventory'), 'ADMIN_PORTAL');
      assert.equal(classifyRoute('/admin/moto-matcher'), 'ADMIN_PORTAL');
      assert.equal(classifyRoute('/admin/reports'), 'ADMIN_PORTAL');
    });

    it('classifies staff routes as STAFF_PORTAL', () => {
      assert.equal(classifyRoute('/staff'), 'STAFF_PORTAL');
      assert.equal(classifyRoute('/staff/'), 'STAFF_PORTAL');
      assert.equal(classifyRoute('/staff/pos'), 'STAFF_PORTAL');
      assert.equal(classifyRoute('/staff/locator'), 'STAFF_PORTAL');
      assert.equal(classifyRoute('/staff/barcode'), 'STAFF_PORTAL');
      assert.equal(classifyRoute('/staff/clock'), 'STAFF_PORTAL');
    });

    it('classifies static and image assets as PUBLIC_ASSET', () => {
      assert.equal(classifyRoute('/_next/static/chunks/main.js'), 'PUBLIC_ASSET');
      assert.equal(classifyRoute('/favicon.ico'), 'PUBLIC_ASSET');
      assert.equal(classifyRoute('/images/banner.webp'), 'PUBLIC_ASSET');
      assert.equal(classifyRoute('/icons/wrench.svg'), 'PUBLIC_ASSET');
    });

    it('classifies unmanaged routes as OTHER', () => {
      assert.equal(classifyRoute('/api/health'), 'OTHER');
      assert.equal(classifyRoute('/terms'), 'OTHER');
    });
  });

  describe('resolveSession', () => {
    it('resolves unauthenticated state when no cookies and no Supabase user exist', () => {
      const session = resolveSession();
      assert.equal(session.isAuthenticated, false);
      assert.equal(session.role, null);
      assert.equal(session.source, 'none');
    });

    it('resolves demo admin session from swift-session-role cookie', () => {
      const mockCookies = {
        get: (name: string) => (name === 'swift-session-role' ? { value: 'admin' } : undefined),
      };
      const session = resolveSession(mockCookies);
      assert.equal(session.isAuthenticated, true);
      assert.equal(session.role, 'admin');
      assert.equal(session.source, 'demo');
    });

    it('resolves demo staff session from swift-session-role cookie', () => {
      const mockCookies = {
        get: (name: string) => (name === 'swift-session-role' ? { value: 'staff' } : undefined),
      };
      const session = resolveSession(mockCookies);
      assert.equal(session.isAuthenticated, true);
      assert.equal(session.role, 'staff');
      assert.equal(session.source, 'demo');
    });

    it('resolves Supabase user session with role from user_metadata', () => {
      const mockUser = {
        id: 'usr-123',
        user_metadata: { role: 'staff' },
      };
      const session = resolveSession(null, mockUser);
      assert.equal(session.isAuthenticated, true);
      assert.equal(session.role, 'staff');
      assert.equal(session.userId, 'usr-123');
      assert.equal(session.source, 'supabase');
    });

    it('falls back to cookie role when Supabase user has no explicit role in metadata', () => {
      const mockCookies = {
        get: (name: string) => (name === 'swift-session-role' ? { value: 'admin' } : undefined),
      };
      const mockUser = { id: 'usr-456' };
      const session = resolveSession(mockCookies, mockUser);
      assert.equal(session.isAuthenticated, true);
      assert.equal(session.role, 'admin');
      assert.equal(session.source, 'supabase');
    });

    it('elevates staff role to admin when swift_admin_elevated cookie is present', () => {
      const mockCookies = {
        get: (name: string) => {
          if (name === 'swift-session-role') return { value: 'staff' };
          if (name === 'swift_admin_elevated') return { value: 'true' };
          return undefined;
        },
      };
      const session = resolveSession(mockCookies);
      assert.equal(session.isAuthenticated, true);
      assert.equal(session.role, 'admin');
      assert.equal(session.source, 'demo');
    });

    it('elevates Supabase staff user to admin role when swift_admin_elevated is present', () => {
      const mockCookies = {
        get: (name: string) => (name === 'swift_admin_elevated' ? { value: 'true' } : undefined),
      };
      const mockUser = {
        id: 'usr-staff-777',
        user_metadata: { role: 'staff' },
      };
      const session = resolveSession(mockCookies, mockUser);
      assert.equal(session.isAuthenticated, true);
      assert.equal(session.role, 'admin');
      assert.equal(session.userId, 'usr-staff-777');
      assert.equal(session.source, 'supabase');
    });
  });

  describe('evaluateRouteAccess', () => {
    const unauthenticatedSession: ResolvedSession = {
      isAuthenticated: false,
      role: null,
      source: 'none',
    };

    const adminSession: ResolvedSession = {
      isAuthenticated: true,
      role: 'admin',
      userId: 'admin-001',
      source: 'demo',
    };

    const staffSession: ResolvedSession = {
      isAuthenticated: true,
      role: 'staff',
      userId: 'staff-002',
      source: 'demo',
    };

    // Scenario 1: Authenticated Administrator visits login route
    it('redirects authenticated administrator on / or /login to /admin', () => {
      const rootDecision = evaluateRouteAccess('/', adminSession);
      assert.equal(rootDecision.action, 'REDIRECT');
      assert.equal(rootDecision.destination, '/admin');

      const loginDecision = evaluateRouteAccess('/login', adminSession);
      assert.equal(loginDecision.action, 'REDIRECT');
      assert.equal(loginDecision.destination, '/admin');
    });

    // Scenario 2: Authenticated Staff visits login route
    it('redirects authenticated staff on / or /login to /staff/pos', () => {
      const rootDecision = evaluateRouteAccess('/', staffSession);
      assert.equal(rootDecision.action, 'REDIRECT');
      assert.equal(rootDecision.destination, '/staff/pos');

      const loginDecision = evaluateRouteAccess('/login', staffSession);
      assert.equal(loginDecision.action, 'REDIRECT');
      assert.equal(loginDecision.destination, '/staff/pos');
    });

    // Scenario 3: Unauthenticated user accesses protected portal routes
    it('redirects unauthenticated visitor accessing /admin/* or /staff/* to /', () => {
      const adminDecision = evaluateRouteAccess('/admin', unauthenticatedSession);
      assert.equal(adminDecision.action, 'REDIRECT');
      assert.equal(adminDecision.destination, '/');

      const adminSubDecision = evaluateRouteAccess('/admin/inventory', unauthenticatedSession);
      assert.equal(adminSubDecision.action, 'REDIRECT');
      assert.equal(adminSubDecision.destination, '/');

      const staffDecision = evaluateRouteAccess('/staff', unauthenticatedSession);
      assert.equal(staffDecision.action, 'REDIRECT');
      assert.equal(staffDecision.destination, '/');

      const staffSubDecision = evaluateRouteAccess('/staff/pos', unauthenticatedSession);
      assert.equal(staffSubDecision.action, 'REDIRECT');
      assert.equal(staffSubDecision.destination, '/');
    });

    // Scenario 4: Unauthenticated user visits auth hub
    it('allows unauthenticated visitors to view the login hub / or /login', () => {
      const rootDecision = evaluateRouteAccess('/', unauthenticatedSession);
      assert.equal(rootDecision.action, 'ALLOW');

      const loginDecision = evaluateRouteAccess('/login', unauthenticatedSession);
      assert.equal(loginDecision.action, 'ALLOW');
    });

    // Scenario 5: Role isolation - staff attempting to access admin portal
    it('redirects staff users accessing /admin/* back to /staff/pos', () => {
      const adminDecision = evaluateRouteAccess('/admin', staffSession);
      assert.equal(adminDecision.action, 'REDIRECT');
      assert.equal(adminDecision.destination, '/staff/pos');

      const adminSubDecision = evaluateRouteAccess('/admin/reports', staffSession);
      assert.equal(adminSubDecision.action, 'REDIRECT');
      assert.equal(adminSubDecision.destination, '/staff/pos');
    });

    // Scenario 6: Authorized portal access
    it('allows administrator to access /admin and /admin/inventory', () => {
      const adminDecision = evaluateRouteAccess('/admin', adminSession);
      assert.equal(adminDecision.action, 'ALLOW');

      const adminSubDecision = evaluateRouteAccess('/admin/inventory', adminSession);
      assert.equal(adminSubDecision.action, 'ALLOW');
    });

    it('allows staff to access /staff/pos and other staff views', () => {
      const staffPosDecision = evaluateRouteAccess('/staff/pos', staffSession);
      assert.equal(staffPosDecision.action, 'ALLOW');

      const staffLocatorDecision = evaluateRouteAccess('/staff/locator', staffSession);
      assert.equal(staffLocatorDecision.action, 'ALLOW');
    });

    it('redirects /staff to /staff/pos for authenticated staff users', () => {
      const staffRootDecision = evaluateRouteAccess('/staff', staffSession);
      assert.equal(staffRootDecision.action, 'REDIRECT');
      assert.equal(staffRootDecision.destination, '/staff/pos');
    });

    it('redirects administrator accessing /staff/* back to /admin', () => {
      const adminStaffRootDecision = evaluateRouteAccess('/staff', adminSession);
      assert.equal(adminStaffRootDecision.action, 'REDIRECT');
      assert.equal(adminStaffRootDecision.destination, '/admin');

      const adminStaffPosDecision = evaluateRouteAccess('/staff/pos', adminSession);
      assert.equal(adminStaffPosDecision.action, 'REDIRECT');
      assert.equal(adminStaffPosDecision.destination, '/admin');
    });

    it('allows public assets through without redirection', () => {
      const assetDecision = evaluateRouteAccess('/_next/static/css/app.css', unauthenticatedSession);
      assert.equal(assetDecision.action, 'ALLOW');
    });
  });
});
