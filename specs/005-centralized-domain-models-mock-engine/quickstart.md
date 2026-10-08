# Quickstart & Verification Guide: Centralized Domain Models & Mock Engine

**Feature**: `Centralized Domain Models & Reactive Mock Data Engine`
**Ticket**: `SIAA-12`
**Date**: 2026-10-07
**Updated**: 2026-10-08

## 1. Domain Types Verification

Import domain entities in any component or test:
```typescript
import {
  Product,
  LaborService,
  CartItem,
  CartTotals,
  Transaction,
  UserSession,
  StockAdjustmentLog,
  AuditLog,
  PunchLog
} from '@/lib/types';
```

Ensure static compilation passes without errors:
```bash
npx tsc --noEmit
```

## 2. Seed Data Inspection

Verify canonical products and services:
```typescript
import {
  MOCK_PRODUCTS,
  MOCK_SERVICES,
  MOCK_MOTORCYCLE_MODELS,
  MOCK_USERS,
  MOCK_PRICING_RULES
} from '@/lib/mock-data';

console.log(`Loaded ${MOCK_PRODUCTS.length} motorcycle parts.`); // 12
console.log(`Loaded ${MOCK_SERVICES.length} labor services.`);   // 6
console.log(`Loaded ${MOCK_MOTORCYCLE_MODELS.length} models.`);   // 5
console.log(`Loaded ${MOCK_USERS.length} user accounts.`);        // 4
```

Assert shelf locators on all physical parts:
```typescript
MOCK_PRODUCTS.forEach(product => {
  if (!product.location || (!product.location.includes('Shelf') && !product.location.includes('Floor'))) {
    throw new Error(`Invalid location for product ${product.sku}: ${product.location}`);
  }
});
```

## 3. Reactive Cart Store & Transaction Checkout Verification

Test POS cart operations, pricing tier toggling, discounts, and checkout:
```typescript
import { cartStore } from '@/lib/store/cart-store';
import { MOCK_PRODUCTS, MOCK_SERVICES } from '@/lib/mock-data';

// Reset cart
cartStore.clearCart();

// Add 2 Motul 1L bottles (Retail: 390, Wholesale: 330)
cartStore.addPart(MOCK_PRODUCTS.find(p => p.sku === 'MOT-3100-10W40')!, 2);

// Add 1 Oil Change service (Flat rate: 100)
cartStore.addService(MOCK_SERVICES.find(s => s.code === 'SRV-OIL-01')!, 1);

// Verify initial retail totals: (390 * 2) + 100 = 880
let state = cartStore.getState();
console.assert(state.totals.subtotal === 880, `Expected 880, got ${state.totals.subtotal}`);

// Switch to Wholesale mode: (330 * 2) + 100 = 760
cartStore.setPricingMode('wholesale');
state = cartStore.getState();
console.assert(state.totals.subtotal === 760, `Expected 760, got ${state.totals.subtotal}`);

// Apply 20% Senior Citizen discount on wholesale total: 760 * 0.8 = 608
cartStore.setDiscountRate(0.20);
state = cartStore.getState();
console.assert(state.totals.total === 608, `Expected 608, got ${state.totals.total}`);

// Complete Checkout & Generate Transaction
const tx = cartStore.checkout({
  cashier: 'Mike Morales',
  cashTendered: 700,
  paymentMethod: 'Cash'
});

console.assert(tx.id.startsWith('TX-'), `Expected TX- prefix, got ${tx.id}`);
console.assert(tx.total === 608, `Expected total 608, got ${tx.total}`);
console.assert(tx.change === 92, `Expected change 92, got ${tx.change}`);
console.assert(cartStore.getState().items.length === 0, 'Cart should be reset after checkout');
```

## 4. Inventory Store Stock Adjustment Verification

```typescript
import { inventoryStore } from '@/lib/store/inventory-store';

const initialStock = inventoryStore.getProductBySku('YAM-NMAX-BL01')?.stock;
inventoryStore.adjustStock({
  sku: 'YAM-NMAX-BL01',
  type: 'Audit Adjustment',
  units: -2,
  reason: 'Physical inventory count reconciliation',
  user: 'Carlos Rodriguez'
});

const updatedStock = inventoryStore.getProductBySku('YAM-NMAX-BL01')?.stock;
console.assert(updatedStock === (initialStock ?? 0) - 2, 'Stock should decrease by 2 units');
```

## 5. Shift Punch Clock Store Verification

```typescript
import { punchStore } from '@/lib/store/punch-store';

punchStore.clockIn('Mike Morales');
console.assert(punchStore.getState().isShiftActive === true, 'Shift should be active');

punchStore.tickSecond();
console.assert(punchStore.getState().shiftSeconds > 0, 'Shift seconds should increment');

punchStore.clockOut('Mike Morales');
console.assert(punchStore.getState().isShiftActive === false, 'Shift should be inactive');
```
