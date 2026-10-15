import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAdminLaborServicesAction,
  createLaborServiceAction,
  updateLaborServiceAction,
  toggleServiceStatusAction,
  deleteLaborServiceAction,
  getServiceRateAuditLogsAction
} from '../service-actions.ts';

describe('Admin Workshop Labor Services Server Actions (SIAA-59)', () => {
  it('retrieves all workshop services for admin management', async () => {
    const services = await getAdminLaborServicesAction();
    assert.ok(Array.isArray(services), 'Services should be an array');
    assert.ok(services.length >= 6, 'Should contain at least 6 canonical services');
  });

  it('rejects labor service creation when required fields are missing or invalid', async () => {
    const result = await createLaborServiceAction({
      code: '',
      name: '',
      bay: '',
      rate: -50,
      duration: ''
    });

    assert.equal(result.success, false);
    assert.equal(result.code, 'VALIDATION_ERROR');
    assert.ok(result.fieldErrors?.code, 'Should flag code as required');
    assert.ok(result.fieldErrors?.name, 'Should flag name as required');
    assert.ok(result.fieldErrors?.rate, 'Should flag negative rate');
  });

  it('successfully creates a new workshop labor service', async () => {
    const uniqueCode = `SRV-TEST-${Date.now()}`;
    const result = await createLaborServiceAction({
      code: uniqueCode,
      name: 'Test Dyno Diagnostic Run',
      bay: 'Bay 4 / Heavy Repair',
      rate: 550,
      duration: '40 mins',
      description: 'Full dyno throttle curve check'
    });

    assert.equal(result.success, true);
    assert.ok(result.data, 'Created service should be returned');
    assert.equal(result.data?.code, uniqueCode);
    assert.equal(result.data?.rate, 550);
    assert.equal(result.data?.bay, 'Bay 4 / Heavy Repair');
  });

  it('rejects duplicate service code registration', async () => {
    const result = await createLaborServiceAction({
      code: 'SRV-OIL-01',
      name: 'Duplicate Oil Change',
      bay: 'Bay 1 / Quick Bay',
      rate: 120,
      duration: '20 mins'
    });

    assert.equal(result.success, false);
    assert.equal(result.code, 'DUPLICATE_CODE');
  });

  it('updates labor service rate and records an audit log entry', async () => {
    // Update CVT Cleaning rate from 350 to 400 as specified in Scenario 2
    const result = await updateLaborServiceAction('SRV-CVT-01', {
      rate: 400,
      reason: 'Shop consumable cost adjustment',
      userName: 'Service Desk Manager'
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.rate, 400);

    // Verify audit log entry
    const auditLogs = await getServiceRateAuditLogsAction('SRV-CVT-01');
    assert.ok(auditLogs.length > 0, 'Audit log should record rate adjustment');
    const latestLog = auditLogs[auditLogs.length - 1];
    assert.equal(latestLog.newRate, 400);
    assert.equal(latestLog.oldRate, 350);
    assert.equal(latestLog.reason, 'Shop consumable cost adjustment');
    assert.equal(latestLog.userName, 'Service Desk Manager');

    // Restore original baseline rate
    await updateLaborServiceAction('SRV-CVT-01', { rate: 350 });
  });

  it('toggles service active status (soft-delete / archive)', async () => {
    const toggleResult = await toggleServiceStatusAction('SRV-BRK-01', false);
    assert.equal(toggleResult.success, true);
    assert.equal(toggleResult.data?.active, false);

    // Re-activate
    const restoreResult = await toggleServiceStatusAction('SRV-BRK-01', true);
    assert.equal(restoreResult.success, true);
    assert.equal(restoreResult.data?.active, true);
  });

  it('deletes a labor service', async () => {
    const tempCode = `SRV-DEL-${Date.now()}`;
    await createLaborServiceAction({
      code: tempCode,
      name: 'Temporary Service to Delete',
      bay: 'Bay 1 / Quick Bay',
      rate: 99,
      duration: '10 mins'
    });

    const deleteResult = await deleteLaborServiceAction(tempCode);
    assert.equal(deleteResult.success, true);
    assert.equal(deleteResult.data?.id, tempCode);
  });
});
