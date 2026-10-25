import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  provisionStaffUserAction,
  listStaffUsersAction,
  resetInMemoryStaffUsers,
} from '../user-actions.ts';
import { getSecurityAuditLogsAction } from '../audit-actions.ts';

describe('SIAA-102: Restrict Staff Provisioning Permissions Strictly to Cashier, Mechanic, and Inventory Clerk', () => {
  beforeEach(async () => {
    await resetInMemoryStaffUsers();
  });

  describe('Scenario 1: Provisioning a staff member with a valid granular role', () => {
    it('successfully provisions a staff member with Cashier Privilege and default cashier permissions', async () => {
      const payload = {
        fullName: 'Jane Cashier',
        email: 'jane.cashier@swift.local',
        role: 'cashier' as const,
      };

      const result = await provisionStaffUserAction(payload, 'admin');
      assert.equal(result.success, true);
      assert.equal(result.data?.fullName, 'Jane Cashier');
      assert.equal(result.data?.email, 'jane.cashier@swift.local');
      assert.equal(result.data?.role, 'cashier');
      assert.equal(result.data?.roleDisplay, 'Cashier');
      assert.equal(result.data?.status, 'Active');

      // Canonical default cashier permissions (all false)
      assert.equal(result.data?.permissions.can_adjust_stock, false);
      assert.equal(result.data?.permissions.can_override_discount, false);
      assert.equal(result.data?.permissions.can_manage_pricing, false);
      assert.equal(result.data?.permissions.can_view_reports, false);

      // Verify appears in staff ledger
      const allUsers = await listStaffUsersAction();
      const found = allUsers.find((u) => u.email === 'jane.cashier@swift.local');
      assert.ok(found, 'Cashier user must appear in ledger');
      assert.equal(found.role, 'cashier');
    });

    it('successfully provisions a staff member with Mechanic role and default mechanic permissions', async () => {
      const payload = {
        fullName: 'Mike Mechanic',
        email: 'mike.mechanic@swift.local',
        role: 'mechanic' as const,
      };

      const result = await provisionStaffUserAction(payload, 'admin');
      assert.equal(result.success, true);
      assert.equal(result.data?.fullName, 'Mike Mechanic');
      assert.equal(result.data?.role, 'mechanic');
      assert.equal(result.data?.roleDisplay, 'Mechanic');

      // Default mechanic permissions (all false)
      assert.equal(result.data?.permissions.can_adjust_stock, false);
      assert.equal(result.data?.permissions.can_override_discount, false);
      assert.equal(result.data?.permissions.can_manage_pricing, false);
      assert.equal(result.data?.permissions.can_view_reports, false);
    });

    it('successfully provisions a staff member with Inventory Clerk role and default stock adjustment permission', async () => {
      const payload = {
        fullName: 'Carlos Clerk',
        email: 'carlos.clerk@swift.local',
        role: 'inventory_clerk' as const,
      };

      const result = await provisionStaffUserAction(payload, 'admin');
      assert.equal(result.success, true);
      assert.equal(result.data?.fullName, 'Carlos Clerk');
      assert.equal(result.data?.role, 'inventory_clerk');
      assert.equal(result.data?.roleDisplay, 'Inventory Clerk');

      // Default inventory clerk permissions: stock adjustments enabled, others false
      assert.equal(result.data?.permissions.can_adjust_stock, true);
      assert.equal(result.data?.permissions.can_override_discount, false);
      assert.equal(result.data?.permissions.can_manage_pricing, false);
      assert.equal(result.data?.permissions.can_view_reports, false);
    });
  });

  describe('Scenario 2: Backend rejection of unapproved or superfluous roles', () => {
    it('rejects provisioning attempt with "admin" role and records security audit entry', async () => {
      const payload = {
        fullName: 'Unauthorized Admin Attempt',
        email: 'fake.admin@swift.local',
        role: 'admin',
      };

      const result = await provisionStaffUserAction(payload, 'admin');
      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.match(
        result.error || '',
        /strictly one of: Cashier Privilege \(cashier\), Mechanic \(mechanic\), or Inventory Clerk \(inventory_clerk\)/i
      );

      // Verify forensic security audit record created
      const logs = await getSecurityAuditLogsAction({ severity: 'warning' });
      const auditEntry = logs.data?.find((l) =>
        l.action.includes('unapproved role: admin')
      );
      assert.ok(auditEntry, 'Security audit log entry must record the rejected unapproved role');
      assert.equal(auditEntry.severity, 'warning');
    });

    it('rejects provisioning attempt with legacy "staff" role and records security audit entry', async () => {
      const payload = {
        fullName: 'Generic Staff Person',
        email: 'generic.staff@swift.local',
        role: 'staff',
      };

      const result = await provisionStaffUserAction(payload, 'admin');
      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.match(result.error || '', /strictly one of/i);

      const logs = await getSecurityAuditLogsAction({ severity: 'warning' });
      const auditEntry = logs.data?.find((l) =>
        l.action.includes('unapproved role: staff')
      );
      assert.ok(auditEntry, 'Security audit log entry must record the rejected staff role attempt');
    });

    it('rejects provisioning attempt with arbitrary unapproved role string', async () => {
      const payload = {
        fullName: 'Random Attacker',
        email: 'attacker@swift.local',
        role: 'super_user',
      };

      const result = await provisionStaffUserAction(payload, 'admin');
      assert.equal(result.success, false);
      assert.equal(result.code, 'VALIDATION_ERROR');
      assert.match(result.error || '', /strictly one of/i);

      const logs = await getSecurityAuditLogsAction({ severity: 'warning' });
      const auditEntry = logs.data?.find((l) =>
        l.action.includes('unapproved role: super_user')
      );
      assert.ok(auditEntry, 'Security audit log entry must record arbitrary role attempt');
    });
  });

  describe('Scenario 3: Non-Admin Caller Authorization Guard', () => {
    it('rejects provisioning when called by non-admin with UNAUTHORIZED', async () => {
      const payload = {
        fullName: 'Valid Name',
        email: 'valid.cashier@swift.local',
        role: 'cashier' as const,
      };

      const result = await provisionStaffUserAction(payload, 'cashier');
      assert.equal(result.success, false);
      assert.equal(result.code, 'UNAUTHORIZED');
      assert.match(result.error || '', /admin privileges required/i);
    });
  });
});
