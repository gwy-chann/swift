import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminElevationAction } from '../actions.ts';
import {
  AdminElevationInputSchema,
  AdminElevationResultSchema,
  ElevationAuditEventSchema,
} from '../../../specs/032-secure-master-admin-elevation-modal/contracts/elevation.ts';

describe('Secure Master Admin Elevation Modal & Shop Floor Session Guard (SIAA-32)', () => {
  describe('Contracts & Zod Schema Validation', () => {
    it('validates compliant elevation input payload', () => {
      const parsed = AdminElevationInputSchema.safeParse({
        password: 'admin123',
        targetPortal: 'admin',
        terminalId: 'Terminal #01',
      });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.password, 'admin123');
        assert.equal(parsed.data.targetPortal, 'admin');
        assert.equal(parsed.data.terminalId, 'Terminal #01');
      }
    });

    it('rejects empty or whitespace-only elevation input', () => {
      const parsedEmpty = AdminElevationInputSchema.safeParse({
        password: '',
      });
      assert.equal(parsedEmpty.success, false);

      const parsedWhitespace = AdminElevationInputSchema.safeParse({
        password: '   ',
      });
      assert.equal(parsedWhitespace.success, false);
    });

    it('validates elevation audit log schema', () => {
      const validEvent = ElevationAuditEventSchema.safeParse({
        action: 'MASTER_ADMIN_ELEVATION',
        user: 'Elevated Staff Terminal',
        timestamp: new Date().toISOString(),
        ip: 'Terminal #01 (Shop Floor)',
        severity: 'info',
      });
      assert.equal(validEvent.success, true);
    });
  });

  describe('Scenario 1: Successful Master Admin Credential Verification', () => {
    it('authorizes canonical demo password admin123', async () => {
      const res = await verifyAdminElevationAction('admin123');
      assert.equal(res.success, true);
      assert.ok(res.elevatedUntil);
      assert.ok(res.elevatedUntil > Date.now());
      assert.equal(res.error, undefined);

      const contractCheck = AdminElevationResultSchema.safeParse(res);
      assert.equal(contractCheck.success, true);
    });

    it('authorizes canonical demo aliases admin, 8888, and 1234', async () => {
      const resAdmin = await verifyAdminElevationAction('admin');
      assert.equal(resAdmin.success, true);

      const res8888 = await verifyAdminElevationAction('8888');
      assert.equal(res8888.success, true);

      const res1234 = await verifyAdminElevationAction('1234');
      assert.equal(res1234.success, true);
    });

    it('trims leading and trailing whitespace around credentials', async () => {
      const res = await verifyAdminElevationAction('  admin123  ');
      assert.equal(res.success, true);
    });
  });

  describe('Scenario 2: Failed Authentication & Error Alert Handling', () => {
    it('records security_alert audit log on failed elevation attempt (SIAA-42)', async () => {
      const { getSecurityAuditLogsAction } = await import('../../admin/audit-actions.ts');
      const res = await verifyAdminElevationAction('wrongpassword');
      assert.equal(res.success, false);

      const auditRes = await getSecurityAuditLogsAction({ severity: 'security_alert' });
      assert.equal(auditRes.success, true);
      const failedEntry = auditRes.data?.find((l) =>
        l.action.includes('Failed Master Admin elevation attempt')
      );
      assert.ok(failedEntry, 'Must log failed elevation attempt as security_alert');
      assert.equal(failedEntry.severity, 'security_alert');
      assert.equal(failedEntry.terminalIp, 'Terminal #01 (Shop Floor)');
    });

    it('records warning audit log on granted elevation (SIAA-42)', async () => {
      const { getSecurityAuditLogsAction } = await import('../../admin/audit-actions.ts');
      const res = await verifyAdminElevationAction('admin123');
      assert.equal(res.success, true);

      const auditRes = await getSecurityAuditLogsAction({ severity: 'warning' });
      assert.equal(auditRes.success, true);
      const successEntry = auditRes.data?.find((l) =>
        l.action.includes('Master Admin elevation granted')
      );
      assert.ok(successEntry, 'Must log granted elevation as warning');
      assert.equal(successEntry.severity, 'warning');
      assert.equal(successEntry.terminalIp, 'Terminal #01 (Shop Floor)');
    });
  });
});
