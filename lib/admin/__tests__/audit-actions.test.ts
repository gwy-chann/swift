import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSecurityAuditLogsAction,
  logSecurityEventAction,
  exportSecurityAuditLogsAction,
  resetMemoryAuditLogs,
} from '../audit-actions.ts';
import type { SecurityAuditLog } from '../../types/audit.ts';

describe('Supabase Forensic Security Audit Logs Actions (SIAA-62)', () => {
  beforeEach(() => {
    resetMemoryAuditLogs();
  });

  describe('Scenario 1: Default Query & Chronological Sorting', () => {
    it('retrieves audit logs ordered newest first', async () => {
      const result = await getSecurityAuditLogsAction();
      assert.equal(result.success, true);
      assert.ok(result.data, 'Data should be returned');
      assert.ok(result.data.length > 0, 'Should return initial seeded logs');

      // Verify descending order
      for (let i = 0; i < result.data.length - 1; i++) {
        const curr = new Date(result.data[i].createdAt || result.data[i].timestamp).getTime();
        const next = new Date(result.data[i + 1].createdAt || result.data[i + 1].timestamp).getTime();
        assert.ok(curr >= next, `Record ${i} must be newer than or equal to record ${i + 1}`);
      }
    });

    it('supports pagination via limit and offset', async () => {
      const page1 = await getSecurityAuditLogsAction({ limit: 2, offset: 0 });
      assert.equal(page1.success, true);
      assert.equal(page1.data?.length, 2);

      const page2 = await getSecurityAuditLogsAction({ limit: 2, offset: 2 });
      assert.equal(page2.success, true);
      assert.ok(page2.data);
      assert.notEqual(page1.data?.[0].id, page2.data?.[0]?.id);
    });
  });

  describe('Scenario 2: Severity & Search Filtering', () => {
    it('filters audit logs by severity = security_alert', async () => {
      await logSecurityEventAction({
        action: 'Multiple failed master admin elevation attempts from unauthorized station',
        severity: 'security_alert',
        terminalIp: 'Station-Service-Bay-09',
        userEmail: 'unauthorized@swift.ph',
      });

      const result = await getSecurityAuditLogsAction({ severity: 'security_alert' });
      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.ok(result.data.length >= 1);
      result.data.forEach((log: SecurityAuditLog) => {
        assert.equal(log.severity, 'security_alert');
      });
    });

    it('filters audit logs by search query keyword', async () => {
      await logSecurityEventAction({
        action: 'Updated Flat Rate Service Rate for Valve Clearance',
        severity: 'info',
        terminalIp: 'Admin-Station-01',
        userEmail: 'carlos@swift.ph',
      });

      const result = await getSecurityAuditLogsAction({ searchQuery: 'Valve Clearance' });
      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data.length, 1);
      assert.ok(result.data[0].action.includes('Valve Clearance'));
    });
  });

  describe('Scenario 3: Atomic Stored Procedure Event Logging', () => {
    it('logs valid security event and assigns UUID and timestamp', async () => {
      const res = await logSecurityEventAction({
        action: 'Authorized Wholesale Cash Tender on Invoice TX-9921',
        severity: 'warning',
        terminalIp: 'Terminal-01-Counter',
        userEmail: 'mike@swift.ph',
        metadata: { invoice: 'TX-9921', discount: '10%' },
      });

      assert.equal(res.success, true);
      assert.ok(res.data?.id);
      assert.equal(res.data.action, 'Authorized Wholesale Cash Tender on Invoice TX-9921');
      assert.equal(res.data.severity, 'warning');
      assert.equal(res.data.userEmail, 'mike@swift.ph');
      assert.equal(res.data.terminalIp, 'Terminal-01-Counter');
      assert.deepEqual(res.data.metadata, { invoice: 'TX-9921', discount: '10%' });
    });

    it('rejects event logging with empty action', async () => {
      const res = await logSecurityEventAction({
        action: '   ',
        severity: 'info',
      });

      assert.equal(res.success, false);
      assert.ok(res.error?.includes('empty') || res.error?.includes('action'));
    });

    it('rejects event logging with invalid severity level', async () => {
      const res = await logSecurityEventAction({
        action: 'Testing invalid severity',
        severity: 'critical' as unknown as SecurityAuditLog['severity'],
      });

      assert.equal(res.success, false);
      assert.ok(res.error?.includes('severity') || res.error?.includes('Invalid'));
    });
  });

  describe('Scenario 4: RFC 4180 CSV Export', () => {
    it('exports audit logs with compliant headers and properly escaped cells', async () => {
      await logSecurityEventAction({
        action: 'Updated note with, comma and "quotes"',
        severity: 'warning',
        terminalIp: 'Station-Audit-Bay',
        userEmail: 'auditor@swift.ph',
        metadata: { tag: 'audit,test' },
      });

      const csv = await exportSecurityAuditLogsAction();
      assert.ok(csv.startsWith('ID,Timestamp,User Email,Action,Severity,Terminal IP,Metadata'));

      const lines = csv.split('\n');
      assert.ok(lines.length >= 2, 'Must contain header and at least one row');

      // Verify escaping of comma and quote row
      const escapedRow = lines.find((l) => l.includes('Updated note with'));
      assert.ok(escapedRow, 'Must include escaped row');
      assert.ok(escapedRow.includes('""quotes""') || escapedRow.includes('"Updated note with, comma and ""quotes"""'));
    });

    it('respects filters when exporting CSV', async () => {
      const csv = await exportSecurityAuditLogsAction({ severity: 'security_alert' });
      assert.ok(csv.startsWith('ID,Timestamp,User Email,Action,Severity,Terminal IP,Metadata'));
      const rows = csv.trim().split('\n').slice(1);
      rows.forEach((r) => {
        if (r.trim()) {
          assert.ok(r.includes('security_alert'));
        }
      });
    });
  });
});
