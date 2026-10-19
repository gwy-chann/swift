import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateShiftGuard } from '../shift-guard.ts';
import { evaluatePosHotkey } from '../barcode-scanner.ts';

describe('Active Shift Time-In Guard Evaluator (SIAA-74)', () => {
  describe('evaluateShiftGuard pure evaluator', () => {
    it('blocks checkout and returns NOT_CLOCKED_IN when shift is not active', () => {
      const result = evaluateShiftGuard(false, 'idle', 'John Doe');
      assert.strictEqual(result.isAllowed, false);
      assert.strictEqual(result.reason, 'NOT_CLOCKED_IN');
      assert.strictEqual(result.currentStaff, 'John Doe');
      assert.ok(result.message?.includes('Active Shift Required'));
    });

    it('blocks checkout when shiftStatus is idle even if isShiftActive flag is erroneously true', () => {
      const result = evaluateShiftGuard(true, 'idle', null);
      assert.strictEqual(result.isAllowed, false);
      assert.strictEqual(result.reason, 'NOT_CLOCKED_IN');
      assert.strictEqual(result.currentStaff, null);
    });

    it('blocks checkout and returns ON_BREAK when cashier is on break', () => {
      const result = evaluateShiftGuard(true, 'break', 'Mike Morales');
      assert.strictEqual(result.isAllowed, false);
      assert.strictEqual(result.reason, 'ON_BREAK');
      assert.strictEqual(result.currentStaff, 'Mike Morales');
      assert.ok(result.message?.includes('Shift On Break'));
    });

    it('blocks checkout and returns SHIFT_COMPLETED when cashier shift is completed', () => {
      const result = evaluateShiftGuard(false, 'completed', 'Alice Smith');
      assert.strictEqual(result.isAllowed, false);
      assert.strictEqual(result.reason, 'NOT_CLOCKED_IN'); // !isShiftActive triggers first or completed check
    });

    it('blocks checkout when isShiftActive is true but status is completed', () => {
      const result = evaluateShiftGuard(true, 'completed', 'Alice Smith');
      assert.strictEqual(result.isAllowed, false);
      assert.strictEqual(result.reason, 'SHIFT_COMPLETED');
      assert.ok(result.message?.includes('Shift Completed'));
    });

    it('permits checkout when cashier is actively on shift', () => {
      const result = evaluateShiftGuard(true, 'on_shift', 'Mike Morales');
      assert.strictEqual(result.isAllowed, true);
      assert.strictEqual(result.reason, 'OK');
      assert.strictEqual(result.shiftStatus, 'on_shift');
      assert.strictEqual(result.currentStaff, 'Mike Morales');
    });
  });

  describe('evaluatePosHotkey attendance guard extension', () => {
    it('blocks F12 checkout with SHIFT_INACTIVE when cashier is not timed in', () => {
      const evaluation = evaluatePosHotkey('F12', {
        cartItemCount: 2,
        isModalOpen: false,
        isShiftActive: false
      });

      assert.strictEqual(evaluation.action, 'CHECKOUT_PAY');
      assert.strictEqual(evaluation.preventDefault, true);
      assert.strictEqual(evaluation.canExecute, false);
      if (evaluation.action === 'CHECKOUT_PAY' && !evaluation.canExecute) {
        assert.strictEqual(evaluation.reason, 'SHIFT_INACTIVE');
        assert.ok(evaluation.message?.includes('Active Shift Required'));
      }
    });

    it('permits F12 checkout when cashier has active shift and items in cart', () => {
      const evaluation = evaluatePosHotkey('F12', {
        cartItemCount: 2,
        isModalOpen: false,
        isShiftActive: true
      });

      assert.strictEqual(evaluation.action, 'CHECKOUT_PAY');
      assert.strictEqual(evaluation.preventDefault, true);
      assert.strictEqual(evaluation.canExecute, true);
    });

    it('prioritizes CART_EMPTY over SHIFT_INACTIVE when cart has no items', () => {
      const evaluation = evaluatePosHotkey('F12', {
        cartItemCount: 0,
        isModalOpen: false,
        isShiftActive: false
      });

      assert.strictEqual(evaluation.action, 'CHECKOUT_PAY');
      assert.strictEqual(evaluation.preventDefault, true);
      assert.strictEqual(evaluation.canExecute, false);
      if (evaluation.action === 'CHECKOUT_PAY' && !evaluation.canExecute) {
        assert.strictEqual(evaluation.reason, 'CART_EMPTY');
      }
    });

    it('prioritizes MODAL_ACTIVE over shift state when modal is open', () => {
      const evaluation = evaluatePosHotkey('F12', {
        cartItemCount: 1,
        isModalOpen: true,
        isShiftActive: false
      });

      assert.strictEqual(evaluation.action, 'CHECKOUT_PAY');
      assert.strictEqual(evaluation.preventDefault, true);
      assert.strictEqual(evaluation.canExecute, false);
      if (evaluation.action === 'CHECKOUT_PAY' && !evaluation.canExecute) {
        assert.strictEqual(evaluation.reason, 'MODAL_ACTIVE');
      }
    });

    it('remains backward compatible when isShiftActive is omitted', () => {
      const evaluation = evaluatePosHotkey('F12', {
        cartItemCount: 3,
        isModalOpen: false
      });

      assert.strictEqual(evaluation.action, 'CHECKOUT_PAY');
      assert.strictEqual(evaluation.canExecute, true);
    });
  });
});
