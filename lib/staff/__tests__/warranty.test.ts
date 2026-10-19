import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateWarrantyStatus, STORE_WARRANTY_DAYS } from '../warranty.ts';

describe('Warranty Evaluation Engine (SIAA-73)', () => {
  const baseTime = new Date('2026-10-19T10:00:00.000Z');

  it('validates purchase made today is valid with 7 days remaining', () => {
    const purchaseDate = new Date('2026-10-19T08:30:00.000Z');
    const result = calculateWarrantyStatus(purchaseDate, baseTime);

    assert.equal(result.isValid, true);
    assert.equal(result.daysElapsed, 0);
    assert.equal(result.daysRemaining, 7);
    assert.equal(result.label, 'Warranty Valid (Purchased Today)');
  });

  it('validates purchase made 3 days ago is valid with 4 days remaining', () => {
    const purchaseDate = new Date('2026-10-16T10:00:00.000Z');
    const result = calculateWarrantyStatus(purchaseDate, baseTime);

    assert.equal(result.isValid, true);
    assert.equal(result.daysElapsed, 3);
    assert.equal(result.daysRemaining, 4);
    assert.equal(result.label, 'Warranty Valid (4 days left)');
  });

  it('validates purchase made 6 days ago is valid with 1 day left', () => {
    const purchaseDate = new Date('2026-10-13T10:00:00.000Z');
    const result = calculateWarrantyStatus(purchaseDate, baseTime);

    assert.equal(result.isValid, true);
    assert.equal(result.daysElapsed, 6);
    assert.equal(result.daysRemaining, 1);
    assert.equal(result.label, 'Warranty Valid (1 day left)');
  });

  it('validates exact 7-day boundary condition', () => {
    // Exactly 7 days * 86,400,000 ms ago
    const exactBoundary = new Date(baseTime.getTime() - STORE_WARRANTY_DAYS * 86_400_000);
    const result = calculateWarrantyStatus(exactBoundary, baseTime);

    assert.equal(result.isValid, true);
    assert.equal(result.daysElapsed, 7);
    assert.equal(result.daysRemaining, 0);
  });

  it('marks purchase older than 7 days as expired', () => {
    // 7 days and 1 second ago
    const expiredDate = new Date(baseTime.getTime() - (STORE_WARRANTY_DAYS * 86_400_000 + 1000));
    const result = calculateWarrantyStatus(expiredDate, baseTime);

    assert.equal(result.isValid, false);
    assert.equal(result.daysRemaining, 0);
    assert.equal(result.label, 'Warranty Expired');
  });

  it('handles invalid timestamp gracefully', () => {
    const result = calculateWarrantyStatus('not-a-valid-date', baseTime);

    assert.equal(result.isValid, false);
    assert.equal(result.label, 'Invalid Date');
  });
});
