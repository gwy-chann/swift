import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { processCheckoutAction } from '../actions.ts';
import { getSecurityAuditLogsAction, resetMemoryAuditLogs } from '../../admin/audit-actions.ts';

describe('POS Discount Override & Security Audit Logging (SIAA-42 / STORY-7.5)', () => {
  beforeEach(() => {
    resetMemoryAuditLogs();
  });

  it('records an audit log when a 20% Senior Citizen discount is applied at checkout', async () => {
    const payload = {
      receiptNumber: 'TX-7788',
      cashierName: 'Mike Morales',
      pricingMode: 'retail' as const,
      subtotal: 1000,
      discountType: 'senior',
      discountRate: 0.2,
      discountAmount: 200,
      totalDue: 800,
      cashTendered: 1000,
      changeDue: 200,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'service' as const,
          itemSkuOrCode: 'SRV-OIL-01',
          itemName: 'Standard Oil & Gear Oil Change',
          unitPrice: 1000,
          quantity: 1,
          subtotal: 1000,
        },
      ],
    };

    const checkoutRes = await processCheckoutAction(payload);
    assert.equal(checkoutRes.success, true);

    const auditRes = await getSecurityAuditLogsAction({ limit: 10 });
    assert.equal(auditRes.success, true);
    assert.ok(auditRes.data);

    const discountLog = auditRes.data.find(
      (l) => l.action.includes('Senior Citizen Discount') && l.action.includes('TX-7788')
    );
    assert.ok(discountLog, 'Audit log entry must be created for Senior Citizen discount checkout');
    assert.equal(discountLog.severity, 'info');
    assert.equal(discountLog.userEmail, 'Mike Morales');
    assert.ok(Math.abs(Number(discountLog.metadata?.discountRate) - 0.2) < 0.001);
    assert.deepEqual(discountLog.metadata?.discountAmount, 200);
  });

  it('records an audit log when a custom discount override is applied at checkout', async () => {
    const payload = {
      receiptNumber: 'TX-7799',
      cashierName: 'Jane Cashier',
      pricingMode: 'retail' as const,
      subtotal: 500,
      discountType: 'custom_override',
      discountRate: 0.15,
      discountAmount: 75,
      totalDue: 425,
      cashTendered: 500,
      changeDue: 75,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'service' as const,
          itemSkuOrCode: 'SRV-TIRE-01',
          itemName: 'Tubeless Tire Mounting & Bead Sealing',
          unitPrice: 500,
          quantity: 1,
          subtotal: 500,
        },
      ],
    };

    const checkoutRes = await processCheckoutAction(payload);
    assert.equal(checkoutRes.success, true);

    const auditRes = await getSecurityAuditLogsAction({ limit: 10 });
    assert.equal(auditRes.success, true);
    assert.ok(auditRes.data);

    const discountLog = auditRes.data.find(
      (l) => l.action.includes('15% Discount Override') && l.action.includes('TX-7799')
    );
    assert.ok(discountLog, 'Audit log entry must be created for discount override');
    assert.equal(discountLog.severity, 'info');
    assert.equal(discountLog.userEmail, 'Jane Cashier');
  });

  it('does NOT create a discount audit log when checkout has zero discount', async () => {
    const payload = {
      receiptNumber: 'TX-7700',
      cashierName: 'Mike Morales',
      pricingMode: 'retail' as const,
      subtotal: 300,
      discountType: 'none',
      discountRate: 0,
      discountAmount: 0,
      totalDue: 300,
      cashTendered: 300,
      changeDue: 0,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'service' as const,
          itemSkuOrCode: 'SRV-OIL-01',
          itemName: 'Standard Oil & Gear Oil Change',
          unitPrice: 300,
          quantity: 1,
          subtotal: 300,
        },
      ],
    };

    const checkoutRes = await processCheckoutAction(payload);
    assert.equal(checkoutRes.success, true);

    const auditRes = await getSecurityAuditLogsAction({ limit: 10 });
    assert.equal(auditRes.success, true);

    const discountLog = auditRes.data?.find((l) => l.action.includes('TX-7700'));
    assert.equal(discountLog, undefined, 'Zero discount transaction should not create discount override audit log');
  });
});
