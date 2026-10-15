import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listStaffUsersAction,
  provisionStaffUserAction,
  updateUserPermissionsAction,
  updateStaffUserAction,
  toggleUserStatusAction,
  resetInMemoryStaffUsers,
} from '../user-actions.ts';
import {
  DbUserRoleSchema,
  StaffPermissionsSchema,
} from '../../../specs/030-supabase-rbac-extension-granular-permission-flags/contracts/rbac-permissions.contract.ts';
import {
  UpdateStaffUserSchema,
} from '../../../specs/031-user-account-provisioning-rbac-management/contracts/user-management.contract.ts';
import { DEFAULT_ROLE_PERMISSIONS, mapDbRoleToDisplay } from '../../types/auth.ts';

describe('STORY-7.6: Supabase RBAC Extension, Granular Permission Flags Schema & Admin Provisioning Actions (SIAA-56)', () => {
  beforeEach(async () => {
    await resetInMemoryStaffUsers();
  });

  describe('Scenario 1: User Roles Enum & Permission Flags Schema', () => {
    it('accepts inventory_clerk as a valid DbUserRole enum value', () => {
      const validRoles = ['admin', 'staff', 'cashier', 'mechanic', 'inventory_clerk'];
      for (const role of validRoles) {
        const parsed = DbUserRoleSchema.safeParse(role);
        assert.equal(parsed.success, true, `Role '${role}' should be valid`);
      }

      // Rejects invalid arbitrary role
      const invalid = DbUserRoleSchema.safeParse('super_owner');
      assert.equal(invalid.success, false, 'Invalid role must be rejected');
    });

    it('maps inventory_clerk to human-readable display label "Inventory Clerk"', () => {
      assert.equal(mapDbRoleToDisplay('inventory_clerk'), 'Inventory Clerk');
      assert.equal(mapDbRoleToDisplay('admin'), 'Admin');
      assert.equal(mapDbRoleToDisplay('cashier'), 'Cashier');
      assert.equal(mapDbRoleToDisplay('mechanic'), 'Mechanic');
      assert.equal(mapDbRoleToDisplay('staff'), 'Staff');
    });

    it('validates StaffPermissions schema with default false flags', () => {
      const emptyObj = StaffPermissionsSchema.parse({});
      assert.deepEqual(emptyObj, {
        can_adjust_stock: false,
        can_override_discount: false,
        can_manage_pricing: false,
        can_view_reports: false,
      });
    });

    it('assigns inventory_clerk can_adjust_stock permission by default', () => {
      const clerkPerms = DEFAULT_ROLE_PERMISSIONS.inventory_clerk;
      assert.equal(clerkPerms.can_adjust_stock, true);
      assert.equal(clerkPerms.can_override_discount, false);
      assert.equal(clerkPerms.can_manage_pricing, false);
      assert.equal(clerkPerms.can_view_reports, false);
    });

    it('lists baseline staff profiles including Rico Santos as Inventory Clerk', async () => {
      const users = await listStaffUsersAction();
      assert.ok(users.length >= 4);

      const rico = users.find((u) => u.email === 'warehouse@swift.local');
      assert.ok(rico, 'Rico Santos profile should exist');
      assert.equal(rico?.role, 'inventory_clerk');
      assert.equal(rico?.roleDisplay, 'Inventory Clerk');
      assert.equal(rico?.permissions.can_adjust_stock, true);
      assert.equal(rico?.status, 'Active');
    });
  });

  describe('Scenario 2: Admin Profile Management & Self-Lockout Prevention', () => {
    it('prevents an administrator from deactivating their own account (self-lockout guard)', async () => {
      const adminId = '00000000-0000-0000-0000-000000000001';
      const result = await toggleUserStatusAction(adminId, 'Inactive', adminId, 'admin');

      assert.equal(result.success, false);
      assert.equal(result.code, 'SELF_LOCKOUT_PREVENTED');
      assert.match(result.error || '', /self-lockout or deactivation is prohibited/i);

      // Verify status remains Active
      const users = await listStaffUsersAction();
      const adminUser = users.find((u) => u.id === adminId);
      assert.equal(adminUser?.status, 'Active');
    });

    it('permits an administrator to toggle status for another staff member', async () => {
      const adminId = '00000000-0000-0000-0000-000000000001';
      const cashierId = '00000000-0000-0000-0000-000000000002';

      const result = await toggleUserStatusAction(cashierId, 'Inactive', adminId, 'admin');
      assert.equal(result.success, true);
      assert.equal(result.data?.status, 'Inactive');

      // Toggle back to Active
      const reactivate = await toggleUserStatusAction(cashierId, 'Active', adminId, 'admin');
      assert.equal(reactivate.success, true);
      assert.equal(reactivate.data?.status, 'Active');
    });

    it('allows updating granular permissions for another employee', async () => {
      const clerkId = '00000000-0000-0000-0000-000000000004';
      const updateResult = await updateUserPermissionsAction(
        clerkId,
        { can_view_reports: true },
        'admin'
      );

      assert.equal(updateResult.success, true);
      assert.equal(updateResult.data?.permissions.can_adjust_stock, true);
      assert.equal(updateResult.data?.permissions.can_view_reports, true);
      assert.equal(updateResult.data?.permissions.can_manage_pricing, false);
    });
  });

  describe('Scenario 3: Staff User Provisioning Server Action', () => {
    it('successfully provisions a new inventory_clerk user with default stock adjustment permission', async () => {
      const payload = {
        fullName: 'Elena Vance',
        email: 'elena.vance@swift.local',
        role: 'inventory_clerk' as const,
      };

      const result = await provisionStaffUserAction(payload, 'admin');
      assert.equal(result.success, true);
      assert.equal(result.data?.fullName, 'Elena Vance');
      assert.equal(result.data?.email, 'elena.vance@swift.local');
      assert.equal(result.data?.role, 'inventory_clerk');
      assert.equal(result.data?.roleDisplay, 'Inventory Clerk');
      assert.equal(result.data?.permissions.can_adjust_stock, true);
      assert.equal(result.data?.status, 'Active');

      // Verify appears in staff ledger
      const allUsers = await listStaffUsersAction();
      const created = allUsers.find((u) => u.email === 'elena.vance@swift.local');
      assert.ok(created, 'Newly provisioned user must appear in ledger');
    });

    it('rejects provisioning when an email already exists in the system (duplicate email collision)', async () => {
      const payload = {
        fullName: 'Duplicate Carlos',
        email: 'admin@swift.local',
        role: 'cashier' as const,
      };

      const result = await provisionStaffUserAction(payload, 'admin');
      assert.equal(result.success, false);
      assert.equal(result.code, 'DUPLICATE_EMAIL');
      assert.match(result.error || '', /already exists/i);
    });

    it('rejects provisioning with invalid input formats', async () => {
      const invalidEmail = {
        fullName: 'John Doe',
        email: 'not-an-email',
        role: 'cashier',
      };

      const result = await provisionStaffUserAction(invalidEmail, 'admin');
      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
    });
  });

  describe('Scenario 4: Non-Admin Permission Escalation Rejection', () => {
    it('rejects provisioning request from cashier with 403 / UNAUTHORIZED', async () => {
      const payload = {
        fullName: 'Hacker Bob',
        email: 'bob@hacker.io',
        role: 'admin' as const,
      };

      const result = await provisionStaffUserAction(payload, 'cashier');
      assert.equal(result.success, false);
      assert.equal(result.code, 'UNAUTHORIZED');
      assert.match(result.error || '', /admin privileges required/i);
    });

    it('rejects permission modification from mechanic session with UNAUTHORIZED', async () => {
      const targetId = '00000000-0000-0000-0000-000000000002';
      const result = await updateUserPermissionsAction(
        targetId,
        { can_manage_pricing: true },
        'mechanic'
      );

      assert.equal(result.success, false);
      assert.equal(result.code, 'UNAUTHORIZED');
    });

    it('rejects status modification from staff session with UNAUTHORIZED', async () => {
      const targetId = '00000000-0000-0000-0000-000000000003';
      const result = await toggleUserStatusAction(targetId, 'Inactive', 'some-staff-id', 'staff');

      assert.equal(result.success, false);
      assert.equal(result.code, 'UNAUTHORIZED');
    });
  });

  describe('STORY-7.1: User Account Provisioning & RBAC Management (SIAA-38)', () => {
    it('validates UpdateStaffUserSchema contracts', () => {
      const validPayload = {
        userId: '00000000-0000-0000-0000-000000000002',
        fullName: 'Maria Santos (Senior)',
        role: 'cashier',
        permissions: {
          can_override_discount: true,
          can_adjust_stock: true,
        },
      };

      const parsed = UpdateStaffUserSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);
    });

    it('successfully updates employee name, role, and granular permissions via updateStaffUserAction', async () => {
      const cashierId = '00000000-0000-0000-0000-000000000002';
      const result = await updateStaffUserAction(
        {
          userId: cashierId,
          fullName: 'Maria Clara Santos',
          role: 'inventory_clerk',
          permissions: {
            can_adjust_stock: true,
            can_override_discount: true,
          },
        },
        'admin'
      );

      assert.equal(result.success, true);
      assert.equal(result.data?.fullName, 'Maria Clara Santos');
      assert.equal(result.data?.role, 'inventory_clerk');
      assert.equal(result.data?.roleDisplay, 'Inventory Clerk');
      assert.equal(result.data?.permissions.can_adjust_stock, true);
      assert.equal(result.data?.permissions.can_override_discount, true);

      // Verify reflected in staff list
      const users = await listStaffUsersAction();
      const updated = users.find((u) => u.id === cashierId);
      assert.equal(updated?.fullName, 'Maria Clara Santos');
      assert.equal(updated?.role, 'inventory_clerk');
      assert.equal(updated?.permissions.can_adjust_stock, true);
    });

    it('prevents an active administrator from demoting their own admin role (self-demotion guard)', async () => {
      const adminId = '00000000-0000-0000-0000-000000000001';
      const result = await updateStaffUserAction(
        {
          userId: adminId,
          role: 'cashier',
        },
        'admin',
        adminId
      );

      assert.equal(result.success, false);
      assert.equal(result.code, 'SELF_LOCKOUT_PREVENTED');
      assert.match(result.error || '', /self-lockout or role demotion is prohibited/i);

      // Verify role remains admin
      const users = await listStaffUsersAction();
      const adminUser = users.find((u) => u.id === adminId);
      assert.equal(adminUser?.role, 'admin');
    });

    it('rejects updateStaffUserAction from unauthorized non-admin session', async () => {
      const targetId = '00000000-0000-0000-0000-000000000002';
      const result = await updateStaffUserAction(
        {
          userId: targetId,
          fullName: 'Unauthorized Change',
        },
        'cashier'
      );

      assert.equal(result.success, false);
      assert.equal(result.code, 'UNAUTHORIZED');
    });

    it('rejects updateStaffUserAction when target user is not found', async () => {
      const result = await updateStaffUserAction(
        {
          userId: 'non-existent-user-id-999999',
          fullName: 'Ghost User',
        },
        'admin'
      );

      assert.equal(result.success, false);
      assert.equal(result.code, 'USER_NOT_FOUND');
    });
  });
});
