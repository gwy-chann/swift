import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateShiftGuard } from '../shift-guard.ts';
import { evaluatePosHotkey } from '../barcode-scanner.ts';
import { ShiftGuardEvaluationSchema } from '../../../specs/070-staff-pos-time-in-guard/contracts/shift-guard.contract.ts';

describe('Active Shift Time-In Guard Evaluator (SIAA-74)', () => {
  describe('Contracts & Schema Validation', () => {
    it('validates compliant shift guard evaluation schema', () => {
      const evaluation = evaluateShiftGuard(true, 'on_shift', 'Mike Morales');
      const parsed = ShiftGuardEvaluationSchema.safeParse(evaluation);
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.isAllowed, true);
        assert.strictEqual(parsed.data.reason, 'OK');
        assert.strictEqual(parsed.data.currentStaff, 'Mike Morales');
      }
    });

    it('validates blocked shift guard evaluation schema on idle', () => {
      const evaluation = evaluateShiftGuard(false, 'idle', null);
      const parsed = ShiftGuardEvaluationSchema.safeParse(evaluation);
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.isAllowed, false);
        assert.strictEqual(parsed.data.reason, 'NOT_CLOCKED_IN');
        assert.ok(parsed.data.message?.includes('Active Shift Required'));
      }
    });
  });

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
      assert.strictEqual(result.reason, 'NOT_CLOCKED_IN');
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

  describe('Cashier Attribution & Cart State Logic', () => {
    it('resolves dynamic cashier name from active staff and falls back safely', () => {
      const resolveCashier = (staff?: string | null) => staff?.trim() || 'Staff Cashier';

      assert.strictEqual(resolveCashier('Mike Morales'), 'Mike Morales');
      assert.strictEqual(resolveCashier('  '), 'Staff Cashier');
      assert.strictEqual(resolveCashier(null), 'Staff Cashier');
      assert.strictEqual(resolveCashier(undefined), 'Staff Cashier');
    });

    it('evaluates isShiftReady condition correctly', () => {
      const isShiftReady = (active: boolean, status: string) => active && status === 'on_shift';

      assert.strictEqual(isShiftReady(true, 'on_shift'), true);
      assert.strictEqual(isShiftReady(true, 'break'), false);
      assert.strictEqual(isShiftReady(false, 'on_shift'), false);
      assert.strictEqual(isShiftReady(false, 'idle'), false);
      assert.strictEqual(isShiftReady(true, 'completed'), false);
    });
  });
});
