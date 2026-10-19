import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyStaffPinAction,
  fetchStaffShiftAction,
} from '../actions.ts';
import {
  PunchStore,
} from '../../store/punch-store.ts';
import {
  StaffPermissionsSchema,
  StaffKioskProfileSchema,
  FetchStaffShiftResultSchema,
} from '../../contracts/kiosk-session-permissions.ts';

describe('Kiosk Session Granular Permissions (SIAA-86)', () => {
  const CARLOS_ADMIN_ID = '00000000-0000-0000-0000-000000000001';
  const MIKE_CASHIER_ID = '00000000-0000-0000-0000-000000000002';
  const DANTE_MECHANIC_ID = '00000000-0000-0000-0000-000000000003';
  const RICO_CLERK_ID = '00000000-0000-0000-0000-000000000004';

  describe('verifyStaffPinAction Permissions Hydration', () => {
    it('authenticates Admin Carlos and hydrates all permissions as true', async () => {
      const res = await verifyStaffPinAction(CARLOS_ADMIN_ID, '8888');
      assert.equal(res.success, true);
      assert.ok(res.profile);
      assert.ok(res.profile.permissions);
      assert.equal(res.profile.permissions.can_adjust_stock, true);
      assert.equal(res.profile.permissions.can_override_discount, true);
      assert.equal(res.profile.permissions.can_manage_pricing, true);
      assert.equal(res.profile.permissions.can_view_reports, true);
    });

    it('authenticates Inventory Clerk Rico and hydrates can_adjust_stock: true', async () => {
      const res = await verifyStaffPinAction(RICO_CLERK_ID, '3333');
      assert.equal(res.success, true);
      assert.ok(res.profile);
      assert.ok(res.profile.permissions);
      assert.equal(res.profile.permissions.can_adjust_stock, true);
      assert.equal(res.profile.permissions.can_override_discount, false);
      assert.equal(res.profile.permissions.can_manage_pricing, false);
      assert.equal(res.profile.permissions.can_view_reports, false);
    });

    it('authenticates Cashier Mike and hydrates default cashier permissions (false)', async () => {
      const res = await verifyStaffPinAction(MIKE_CASHIER_ID, '1234');
      assert.equal(res.success, true);
      assert.ok(res.profile);
      assert.ok(res.profile.permissions);
      assert.equal(res.profile.permissions.can_adjust_stock, false);
      assert.equal(res.profile.permissions.can_override_discount, false);
    });
  });

  describe('fetchStaffShiftAction Permissions Resolution', () => {
    it('fetches fresh permissions and profile for cashier', async () => {
      const res = await fetchStaffShiftAction(MIKE_CASHIER_ID);
      assert.equal(res.success, true);
      assert.ok(res.permissions);
      assert.equal(res.permissions.can_adjust_stock, false);
      assert.equal(res.permissions.can_override_discount, false);
      assert.ok(res.profile);
      assert.equal(res.profile.id, MIKE_CASHIER_ID);
    });

    it('fetches permissions for inventory clerk with can_adjust_stock: true', async () => {
      const res = await fetchStaffShiftAction(RICO_CLERK_ID);
      assert.equal(res.success, true);
      assert.ok(res.permissions);
      assert.equal(res.permissions.can_adjust_stock, true);
      assert.equal(res.permissions.can_override_discount, false);
    });
  });

  describe('PunchStore Permissions State & Realtime Invalidation', () => {
    it('initializes with currentPermissions in store state', () => {
      const store = new PunchStore();
      const state = store.getState();
      assert.ok(state.currentPermissions);
      assert.equal(typeof state.currentPermissions.can_adjust_stock, 'boolean');
      assert.equal(typeof state.currentPermissions.can_override_discount, 'boolean');
    });

    it('updates currentPermissions when switching staff profile', () => {
      const store = new PunchStore();

      // Switch to Inventory Clerk Rico
      store.switchStaff({
        id: RICO_CLERK_ID,
        name: 'Rico Santos',
        role: 'inventory_clerk',
        permissions: {
          can_adjust_stock: true,
          can_override_discount: false,
          can_manage_pricing: false,
          can_view_reports: false,
        },
      });

      let state = store.getState();
      assert.equal(state.currentStaff, 'Rico Santos');
      assert.equal(state.currentPermissions.can_adjust_stock, true);
      assert.equal(state.currentPermissions.can_override_discount, false);
      assert.equal(state.staffSessions[RICO_CLERK_ID]?.permissions?.can_adjust_stock, true);

      // Switch to Cashier Mike
      store.switchStaff({
        id: MIKE_CASHIER_ID,
        name: 'Mike Morales',
        role: 'cashier',
        permissions: {
          can_adjust_stock: false,
          can_override_discount: false,
          can_manage_pricing: false,
          can_view_reports: false,
        },
      });

      state = store.getState();
      assert.equal(state.currentStaff, 'Mike Morales');
      assert.equal(state.currentPermissions.can_adjust_stock, false);
      assert.equal(state.currentPermissions.can_override_discount, false);
    });

    it('Scenario 1: allows admin override granting can_adjust_stock to cashier', () => {
      const store = new PunchStore();

      // Cashier Mike with custom can_adjust_stock: true
      store.switchStaff({
        id: MIKE_CASHIER_ID,
        name: 'Mike Morales',
        role: 'cashier',
        permissions: {
          can_adjust_stock: true,
          can_override_discount: false,
          can_manage_pricing: false,
          can_view_reports: false,
        },
      });

      const state = store.getState();
      assert.equal(state.currentPermissions.can_adjust_stock, true);
      assert.equal(state.currentPermissions.can_override_discount, false);
    });

    it('Scenario 3: realtime permission invalidation updates active session', () => {
      const store = new PunchStore();

      store.switchStaff({
        id: MIKE_CASHIER_ID,
        name: 'Mike Morales',
        role: 'cashier',
        permissions: {
          can_adjust_stock: true,
          can_override_discount: false,
          can_manage_pricing: false,
          can_view_reports: false,
        },
      });

      assert.equal(store.getState().currentPermissions.can_adjust_stock, true);

      // Admin revokes can_adjust_stock in real-time
      store.updateStaffPermissions(MIKE_CASHIER_ID, {
        can_adjust_stock: false,
        can_override_discount: false,
        can_manage_pricing: false,
        can_view_reports: false,
      });

      assert.equal(store.getState().currentPermissions.can_adjust_stock, false);
      assert.equal(
        store.getState().staffSessions[MIKE_CASHIER_ID]?.permissions?.can_adjust_stock,
        false
      );
    });
  });

  describe('Contract Validation Schemas', () => {
    it('validates StaffPermissionsSchema correctly', () => {
      const parsed = StaffPermissionsSchema.parse({
        can_adjust_stock: true,
        can_override_discount: false,
        can_manage_pricing: false,
        can_view_reports: false,
      });
      assert.equal(parsed.can_adjust_stock, true);
      assert.equal(parsed.can_override_discount, false);
    });

    it('validates StaffKioskProfileSchema with valid profile payload', () => {
      const parsed = StaffKioskProfileSchema.parse({
        id: DANTE_MECHANIC_ID,
        name: 'Dante Reyes',
        email: 'mechanic1@swift.local',
        role: 'mechanic',
        roleDisplay: 'Mechanic',
        avatarInitials: 'DR',
        permissions: {
          can_adjust_stock: false,
          can_override_discount: false,
          can_manage_pricing: false,
          can_view_reports: false,
        },
      });
      assert.equal(parsed.id, DANTE_MECHANIC_ID);
      assert.equal(parsed.role, 'mechanic');
    });

    it('validates FetchStaffShiftResultSchema with valid payload', () => {
      const payload = {
        success: true,
        shift: null,
        permissions: {
          can_adjust_stock: false,
          can_override_discount: true,
          can_manage_pricing: false,
          can_view_reports: false,
        },
      };
      const parsed = FetchStaffShiftResultSchema.parse(payload);
      assert.equal(parsed.success, true);
      assert.equal(parsed.permissions.can_override_discount, true);
    });
  });
});
