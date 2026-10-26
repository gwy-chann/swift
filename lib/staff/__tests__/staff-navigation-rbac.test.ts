import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAFF_NAV_ITEMS,
  filterNavItemsByRole,
  getRolePrimaryRoute,
  ROLE_ROUTE_CONFIG,
} from '../navigation.ts';

describe('Staff Terminal Role-Aware Navigation & RBAC (SIAA-85)', () => {
  describe('filterNavItemsByRole', () => {
    it('filters navigation items for Mechanic to clock, compat, search, and work-orders', () => {
      const filtered = filterNavItemsByRole(STAFF_NAV_ITEMS, 'mechanic');
      const ids = filtered.map((item) => item.id);

      assert.deepEqual(ids.sort(), ['clock', 'compat', 'search', 'work-orders'].sort());
      assert.ok(!ids.includes('pos'), 'Fast-Lane POS must be hidden for mechanic');
      assert.ok(!ids.includes('history'), 'Purchase History must be hidden for mechanic');
      assert.ok(!ids.includes('pricecheck'), 'Item Code Price Check must be hidden for mechanic');
    });

    it('filters navigation items for Inventory Clerk to clock, search, and pricecheck', () => {
      const filtered = filterNavItemsByRole(STAFF_NAV_ITEMS, 'inventory_clerk');
      const ids = filtered.map((item) => item.id);

      assert.deepEqual(ids.sort(), ['clock', 'pricecheck', 'search'].sort());
      assert.ok(!ids.includes('pos'), 'Fast-Lane POS must be hidden for inventory clerk');
      assert.ok(!ids.includes('history'), 'Purchase History must be hidden for inventory clerk');
      assert.ok(!ids.includes('compat'), 'Model Fitment Search must be hidden for inventory clerk');
      assert.ok(!ids.includes('work-orders'), 'Work Order Queue must be hidden for inventory clerk');
    });

    it('filters navigation items for Cashier to pos, search, compat, history, and clock (hiding pricecheck and work-orders)', () => {
      const filtered = filterNavItemsByRole(STAFF_NAV_ITEMS, 'cashier');
      const ids = filtered.map((item) => item.id);

      assert.deepEqual(ids.sort(), ['clock', 'compat', 'history', 'pos', 'search'].sort());
      assert.ok(!ids.includes('pricecheck'), 'Item Code Price Check must be hidden for cashier');
      assert.ok(!ids.includes('work-orders'), 'Work Order Queue must be hidden for cashier');
    });

    it('renders all 7 navigation items for Admin including work-orders', () => {
      const filtered = filterNavItemsByRole(STAFF_NAV_ITEMS, 'admin');
      const ids = filtered.map((item) => item.id);
      assert.equal(filtered.length, 7);
      assert.ok(ids.includes('work-orders'));
    });

    it('returns all items when role is undefined or empty', () => {
      const filteredUndefined = filterNavItemsByRole(STAFF_NAV_ITEMS, undefined);
      assert.equal(filteredUndefined.length, STAFF_NAV_ITEMS.length);

      const filteredEmpty = filterNavItemsByRole(STAFF_NAV_ITEMS, '');
      assert.equal(filteredEmpty.length, STAFF_NAV_ITEMS.length);
    });

    it('handles case-insensitive roles correctly (e.g. "Mechanic", "INVENTORY_CLERK")', () => {
      const mechanicMixed = filterNavItemsByRole(STAFF_NAV_ITEMS, 'Mechanic');
      assert.deepEqual(
        mechanicMixed.map((i) => i.id).sort(),
        ['clock', 'compat', 'search', 'work-orders'].sort()
      );

      const clerkUpper = filterNavItemsByRole(STAFF_NAV_ITEMS, 'INVENTORY_CLERK');
      assert.deepEqual(
        clerkUpper.map((i) => i.id).sort(),
        ['clock', 'pricecheck', 'search'].sort()
      );
    });
  });

  describe('getRolePrimaryRoute', () => {
    it('redirects Mechanic to /staff/work-orders with workshop queue explanation', () => {
      const routeInfo = getRolePrimaryRoute('mechanic');
      assert.equal(routeInfo.targetPath, '/staff/work-orders');
      assert.equal(routeInfo.isAuthorizedForPos, false);
      assert.equal(
        routeInfo.notificationMessage,
        'Redirected: Your profile is scoped to the workshop work order queue.'
      );
    });

    it('redirects Inventory Clerk to /staff/search with inventory tool explanation', () => {
      const routeInfo = getRolePrimaryRoute('inventory_clerk');
      assert.equal(routeInfo.targetPath, '/staff/search');
      assert.equal(routeInfo.isAuthorizedForPos, false);
      assert.equal(
        routeInfo.notificationMessage,
        'Redirected: Your profile is scoped to inventory management tools.'
      );
    });

    it('identifies Cashier as authorized for POS', () => {
      const routeInfo = getRolePrimaryRoute('cashier');
      assert.equal(routeInfo.targetPath, '/staff/pos');
      assert.equal(routeInfo.isAuthorizedForPos, true);
    });

    it('identifies Admin as authorized for POS', () => {
      const routeInfo = getRolePrimaryRoute('admin');
      assert.equal(routeInfo.targetPath, '/staff/pos');
      assert.equal(routeInfo.isAuthorizedForPos, true);
    });

    it('handles undefined or unknown role with safe clock redirection', () => {
      const undefinedRole = getRolePrimaryRoute(undefined);
      assert.equal(undefinedRole.targetPath, '/staff/clock');
      assert.equal(undefinedRole.isAuthorizedForPos, false);

      const unknownRole = getRolePrimaryRoute('guest_contractor');
      assert.equal(unknownRole.targetPath, '/staff/clock');
      assert.equal(unknownRole.isAuthorizedForPos, false);
    });
  });

  describe('ROLE_ROUTE_CONFIG completeness', () => {
    it('contains configuration for all canonical DbUserRoles', () => {
      const roles = ['admin', 'cashier', 'mechanic', 'inventory_clerk', 'staff'] as const;
      for (const role of roles) {
        assert.ok(ROLE_ROUTE_CONFIG[role], `Missing ROLE_ROUTE_CONFIG for ${role}`);
        assert.ok(ROLE_ROUTE_CONFIG[role].targetPath.startsWith('/staff/'));
      }
    });
  });
});
