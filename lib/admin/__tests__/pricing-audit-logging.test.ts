import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { updatePricingRulesAction } from '../pricing-actions.ts';
import { getSecurityAuditLogsAction, resetMemoryAuditLogs } from '../audit-actions.ts';

describe('Global Pricing & Markup Rule Update Audit Logging (SIAA-42 / STORY-7.5)', () => {
  beforeEach(() => {
    resetMemoryAuditLogs();
  });

  it('records an audit log with severity warning when global markup rules are modified', async () => {
    const res = await updatePricingRulesAction({
      retailMarkup: 38,
      userName: 'Carlos Rodriguez',
      reason: 'Periodic markup adjustment for inflation',
    });

    assert.equal(res.success, true);

    const auditRes = await getSecurityAuditLogsAction({ severity: 'warning' });
    assert.equal(auditRes.success, true);
    assert.ok(auditRes.data);

    const markupLog = auditRes.data.find(
      (l) => l.action.includes('Retail from') && l.action.includes('to 38%')
    );
    assert.ok(markupLog, 'Markup update must log security event with delta description');
    assert.equal(markupLog.severity, 'warning');
    assert.equal(markupLog.userEmail, 'Carlos Rodriguez');
    assert.equal(markupLog.terminalIp, '192.168.1.100 (Admin Portal)');
    assert.ok(markupLog.metadata?.newRules);
  });
});
