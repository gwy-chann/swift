import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function evaluateCartPaneShiftStatus(options: {
  isAdmin?: boolean;
  isShiftActive?: boolean;
  shiftStatus?: string;
}): {
  isShiftReady: boolean;
  showShiftWarningBanner: boolean;
  checkoutButtonLabel: string;
} {
  const { isAdmin = false, isShiftActive = false, shiftStatus = 'idle' } = options;
  const shiftActive = isAdmin ? true : isShiftActive;
  const activeShiftStatus = isAdmin ? 'on_shift' : shiftStatus;
  const isShiftReady = isAdmin || (shiftActive && activeShiftStatus === 'on_shift');
  const showShiftWarningBanner = !isAdmin && !isShiftReady;
  const checkoutButtonLabel = !isShiftReady ? 'TIME-IN REQUIRED (F12)' : 'COMPLETE SALE (F12)';

  return {
    isShiftReady,
    showShiftWarningBanner,
    checkoutButtonLabel
  };
}

describe('Admin POS Shift Bypass & Payment History Logic', () => {
  it('allows Admin to checkout without punch clock time-in', () => {
    // Admin has not timed in (idle shift)
    const result = evaluateCartPaneShiftStatus({
      isAdmin: true,
      isShiftActive: false,
      shiftStatus: 'idle'
    });

    assert.strictEqual(result.isShiftReady, true);
    assert.strictEqual(result.showShiftWarningBanner, false);
    assert.strictEqual(result.checkoutButtonLabel, 'COMPLETE SALE (F12)');
  });

  it('allows Admin to checkout even if shift status is break or completed', () => {
    const resultBreak = evaluateCartPaneShiftStatus({
      isAdmin: true,
      isShiftActive: true,
      shiftStatus: 'break'
    });
    assert.strictEqual(resultBreak.isShiftReady, true);
    assert.strictEqual(resultBreak.showShiftWarningBanner, false);

    const resultCompleted = evaluateCartPaneShiftStatus({
      isAdmin: true,
      isShiftActive: false,
      shiftStatus: 'completed'
    });
    assert.strictEqual(resultCompleted.isShiftReady, true);
    assert.strictEqual(resultCompleted.showShiftWarningBanner, false);
  });

  it('still enforces time-in for Cashier when isAdmin is false', () => {
    // Cashier not timed in
    const cashierIdle = evaluateCartPaneShiftStatus({
      isAdmin: false,
      isShiftActive: false,
      shiftStatus: 'idle'
    });
    assert.strictEqual(cashierIdle.isShiftReady, false);
    assert.strictEqual(cashierIdle.showShiftWarningBanner, true);
    assert.strictEqual(cashierIdle.checkoutButtonLabel, 'TIME-IN REQUIRED (F12)');

    // Cashier timed in
    const cashierOnShift = evaluateCartPaneShiftStatus({
      isAdmin: false,
      isShiftActive: true,
      shiftStatus: 'on_shift'
    });
    assert.strictEqual(cashierOnShift.isShiftReady, true);
    assert.strictEqual(cashierOnShift.showShiftWarningBanner, false);
    assert.strictEqual(cashierOnShift.checkoutButtonLabel, 'COMPLETE SALE (F12)');
  });
});
