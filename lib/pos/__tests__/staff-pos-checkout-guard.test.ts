import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePosCheckoutAuthorization,
  type PosCheckoutGuardContext,
} from '../../contracts/checkout-guard.ts';
import { evaluatePosHotkey } from '../barcode-scanner.ts';
import { PunchStore, resolveStaffRole } from '../../store/punch-store.ts';

describe('Staff POS Checkout Authorization & Action Guards (SIAA-84)', () => {
  describe('evaluatePosCheckoutAuthorization', () => {
    it('allows active cashier with items in cart to checkout', () => {
      const context: PosCheckoutGuardContext = {
        isShiftActive: true,
        shiftStatus: 'on_shift',
        currentStaffRole: 'cashier',
        cartItemCount: 2,
        isProcessing: false,
      };

      const result = evaluatePosCheckoutAuthorization(context);
      assert.deepEqual(result, { allowed: true });
    });

    it('allows active admin with items in cart to checkout', () => {
      const context: PosCheckoutGuardContext = {
        isShiftActive: true,
        shiftStatus: 'on_shift',
        currentStaffRole: 'admin',
        cartItemCount: 1,
        isProcessing: false,
      };

      const result = evaluatePosCheckoutAuthorization(context);
      assert.deepEqual(result, { allowed: true });
    });

    it('denies mechanic from checking out with UNAUTHORIZED_ROLE', () => {
      const context: PosCheckoutGuardContext = {
        isShiftActive: true,
        shiftStatus: 'on_shift',
        currentStaffRole: 'mechanic',
        cartItemCount: 3,
        isProcessing: false,
      };

      const result = evaluatePosCheckoutAuthorization(context);
      assert.equal(result.allowed, false);
      if (!result.allowed) {
        assert.equal(result.reason, 'UNAUTHORIZED_ROLE');
        assert.equal(result.attemptedRole, 'mechanic');
        assert.ok(result.message.includes('Only active Cashiers or Store Managers'));
      }
    });

    it('denies inventory_clerk from checking out with UNAUTHORIZED_ROLE', () => {
      const context: PosCheckoutGuardContext = {
        isShiftActive: true,
        shiftStatus: 'on_shift',
        currentStaffRole: 'inventory_clerk',
        cartItemCount: 1,
        isProcessing: false,
      };

      const result = evaluatePosCheckoutAuthorization(context);
      assert.equal(result.allowed, false);
      if (!result.allowed) {
        assert.equal(result.reason, 'UNAUTHORIZED_ROLE');
        assert.equal(result.attemptedRole, 'inventory_clerk');
      }
    });

    it('allows mechanic when hasOneTimeManagerOverride is true', () => {
      const context: PosCheckoutGuardContext = {
        isShiftActive: true,
        shiftStatus: 'on_shift',
        currentStaffRole: 'mechanic',
        cartItemCount: 3,
        isProcessing: false,
        hasOneTimeManagerOverride: true,
      };

      const result = evaluatePosCheckoutAuthorization(context);
      assert.deepEqual(result, { allowed: true });
    });

    it('rejects when cart is empty before checking role', () => {
      const context: PosCheckoutGuardContext = {
        isShiftActive: true,
        shiftStatus: 'on_shift',
        currentStaffRole: 'mechanic',
        cartItemCount: 0,
        isProcessing: false,
      };

      const result = evaluatePosCheckoutAuthorization(context);
      assert.equal(result.allowed, false);
      if (!result.allowed) {
        assert.equal(result.reason, 'CART_EMPTY');
      }
    });

    it('rejects when shift is inactive before checking role', () => {
      const context: PosCheckoutGuardContext = {
        isShiftActive: false,
        shiftStatus: 'idle',
        currentStaffRole: 'cashier',
        cartItemCount: 2,
        isProcessing: false,
      };

      const result = evaluatePosCheckoutAuthorization(context);
      assert.equal(result.allowed, false);
      if (!result.allowed) {
        assert.equal(result.reason, 'SHIFT_INACTIVE');
      }
    });

    it('rejects when shiftStatus is break', () => {
      const context: PosCheckoutGuardContext = {
        isShiftActive: true,
        shiftStatus: 'break',
        currentStaffRole: 'cashier',
        cartItemCount: 2,
        isProcessing: false,
      };

      const result = evaluatePosCheckoutAuthorization(context);
      assert.equal(result.allowed, false);
      if (!result.allowed) {
        assert.equal(result.reason, 'SHIFT_INACTIVE');
      }
    });
  });

  describe('evaluatePosHotkey role guards', () => {
    it('permits F12 and F9 for authorized cashier', () => {
      const f12Res = evaluatePosHotkey('F12', {
        cartItemCount: 1,
        isModalOpen: false,
        isShiftActive: true,
        userRole: 'cashier',
      });
      assert.deepEqual(f12Res, {
        action: 'CHECKOUT_PAY',
        preventDefault: true,
        canExecute: true,
      });

      const f9Res = evaluatePosHotkey('F9', {
        cartItemCount: 1,
        isModalOpen: false,
        isShiftActive: true,
        userRole: 'admin',
      });
      assert.deepEqual(f9Res, {
        action: 'CHECKOUT_PAY',
        preventDefault: true,
        canExecute: true,
      });
    });

    it('blocks F12 and F9 for mechanic with UNAUTHORIZED_ROLE', () => {
      const f12Res = evaluatePosHotkey('F12', {
        cartItemCount: 2,
        isModalOpen: false,
        isShiftActive: true,
        userRole: 'mechanic',
      });
      assert.equal(f12Res.action, 'CHECKOUT_PAY');
      assert.equal(f12Res.canExecute, false);
      if (!f12Res.canExecute) {
        assert.equal(f12Res.reason, 'UNAUTHORIZED_ROLE');
      }

      const f9Res = evaluatePosHotkey('F9', {
        cartItemCount: 2,
        isModalOpen: false,
        isShiftActive: true,
        userRole: 'inventory_clerk',
      });
      assert.equal(f9Res.action, 'CHECKOUT_PAY');
      assert.equal(f9Res.canExecute, false);
      if (!f9Res.canExecute) {
        assert.equal(f9Res.reason, 'UNAUTHORIZED_ROLE');
      }
    });
  });

  describe('PunchStore role management', () => {
    it('initializes default operator with cashier role', () => {
      const store = new PunchStore();
      const state = store.getState();
      assert.equal(state.currentStaff, 'Mike Morales');
      assert.equal(state.currentStaffRole, 'cashier');
    });

    it('updates currentStaffRole upon switchStaff', () => {
      const store = new PunchStore();
      // Switch to Dante Reyes (mechanic)
      store.switchStaff({
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Dante Reyes',
        role: 'mechanic',
      });

      const state = store.getState();
      assert.equal(state.currentStaff, 'Dante Reyes');
      assert.equal(state.currentStaffRole, 'mechanic');

      // Switch to Rico Santos (inventory clerk)
      store.switchStaff({
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Rico Santos',
      });
      const updated = store.getState();
      assert.equal(updated.currentStaff, 'Rico Santos');
      assert.equal(updated.currentStaffRole, 'inventory_clerk');
    });

    it('correctly resolves fallback role when not in mock list', () => {
      assert.equal(resolveStaffRole('unknown-id'), 'cashier');
      assert.equal(resolveStaffRole('unknown-id', 'admin'), 'admin');
    });
  });
});
