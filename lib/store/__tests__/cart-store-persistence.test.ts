import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CartStore,
  SWIFT_POS_CART_STORAGE_KEY
} from '../cart-store.ts';
import type { Product, LaborService } from '../../types/index.ts';

// In-memory mock localStorage implementation
class MockLocalStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const TEST_PRODUCT: Product = {
  sku: 'SPK-NGK-CR7E',
  name: 'NGK Spark Plug CR7E',
  brand: 'NGK',
  category: 'Ignition',
  retail: 180,
  wholesale: 150,
  cost: 120,
  stock: 25,
  minThreshold: 5,
  location: 'A-01-02',
  oem: false,
  model: 'Universal',
  description: 'Standard OEM replacement plug'
};

const TEST_SERVICE: LaborService = {
  code: 'SRV-OIL-01',
  name: 'Full Synthetic Oil Change',
  rate: 250,
  bay: 'Bay 1',
  duration: '30 mins'
};

describe('POS Cart Store Persistence & Auto-Recovery (localStorage)', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
  });

  afterEach(() => {
    mockStorage.clear();
    delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
  });

  it('Scenario 1: Adding items immediately synchronizes active cart to localStorage', () => {
    const store = new CartStore();
    store.addPart(TEST_PRODUCT, 2);

    const savedRaw = mockStorage.getItem(SWIFT_POS_CART_STORAGE_KEY);
    assert.ok(savedRaw !== null, 'Expected swift_pos_cart_state to exist in localStorage');

    const parsed = JSON.parse(savedRaw);
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].sku, 'SPK-NGK-CR7E');
    assert.equal(parsed.items[0].qty, 2);
    assert.equal(parsed.pricingMode, 'retail');
  });

  it('Scenario 2: Reloading/re-instantiating CartStore restores draft items and calculated totals', () => {
    // 1. Simulate active cashier session with 1 part and 1 labor service
    const initialStore = new CartStore();
    initialStore.addPart(TEST_PRODUCT, 1);
    initialStore.addService(TEST_SERVICE, 1);
    initialStore.setDiscountRate(0.10); // 10% discount

    // 2. Simulate page reload by creating a new CartStore instance
    const reloadedStore = new CartStore();
    const state = reloadedStore.getState();

    assert.equal(state.items.length, 2);
    assert.equal(state.discountRate, 0.10);

    const partItem = state.items.find((i) => i.type === 'part');
    assert.ok(partItem);
    assert.equal(partItem.sku, 'SPK-NGK-CR7E');

    const serviceItem = state.items.find((i) => i.type === 'service');
    assert.ok(serviceItem);
    assert.equal(serviceItem.name, 'Labor: Full Synthetic Oil Change');

    // Totals should be recomputed: 180 + 250 = 430 subtotal, 10% discount (43.00), total = 387.00
    assert.equal(state.totals.subtotal, 430);
    assert.equal(state.totals.discountAmount, 43);
    assert.equal(state.totals.total, 387);
  });

  it('Scenario 3: Clearing the cart removes swift_pos_cart_state from localStorage', () => {
    const store = new CartStore();
    store.addPart(TEST_PRODUCT, 1);
    assert.ok(mockStorage.getItem(SWIFT_POS_CART_STORAGE_KEY) !== null);

    store.clearCart();
    assert.equal(mockStorage.getItem(SWIFT_POS_CART_STORAGE_KEY), null);
    assert.equal(store.getState().items.length, 0);
  });

  it('Scenario 4: Removing last item clears localStorage automatically', () => {
    const store = new CartStore();
    store.addPart(TEST_PRODUCT, 1);
    assert.ok(mockStorage.getItem(SWIFT_POS_CART_STORAGE_KEY) !== null);

    store.removeItem(TEST_PRODUCT.sku);
    assert.equal(mockStorage.getItem(SWIFT_POS_CART_STORAGE_KEY), null);
    assert.equal(store.getState().items.length, 0);
  });

  it('Scenario 5: Switching to wholesale pricing mode persists to localStorage', () => {
    const store = new CartStore();
    store.addPart(TEST_PRODUCT, 1);
    store.setPricingMode('wholesale');

    const savedRaw = mockStorage.getItem(SWIFT_POS_CART_STORAGE_KEY);
    assert.ok(savedRaw !== null);

    const parsed = JSON.parse(savedRaw);
    assert.equal(parsed.pricingMode, 'wholesale');

    // Reloading store preserves wholesale pricing mode
    const reloadedStore = new CartStore();
    assert.equal(reloadedStore.getState().pricingMode, 'wholesale');
  });
});
